import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { askDeepSeekCalc, askGroqCalc, askMimoCalc } from "./calcChat.js";
import { initSchema, insertResume, insertExtractionResult } from "./db.js";
import { extractResumeFromImages as extractWithDeepSeek } from "./deepseek.js";
import { extractResumeFromImages as extractWithGroq } from "./groq.js";
import { extractResumeFromImages as extractWithMimo } from "./mimo.js";
import { extractResumeFromPdf as extractWithMistral } from "./mistral.js";
import { pdfToBase64Images } from "./pdf.js";
import type { ProviderResult } from "./types.js";

const app = new Hono();
const PORT = Number(process.env.PORT ?? 5050);

const ALL_PROVIDERS = ["deepseek", "mistral", "groq", "mimo"] as const;
type Provider = (typeof ALL_PROVIDERS)[number];

app.post("/api/resumes", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }
  if (file.type !== "application/pdf") {
    return c.json({ error: "Only PDF uploads are supported" }, 400);
  }

  const providersField = body["providers"];
  const requestedProviders = (
    typeof providersField === "string" ? providersField.split(",") : []
  ).filter((p): p is Provider => (ALL_PROVIDERS as readonly string[]).includes(p));

  if (requestedProviders.length === 0) {
    return c.json({ error: "No providers selected" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const needsImages =
    requestedProviders.includes("deepseek") ||
    requestedProviders.includes("groq") ||
    requestedProviders.includes("mimo");

  let base64Images: string[] = [];
  if (needsImages) {
    try {
      base64Images = await pdfToBase64Images(buffer);
    } catch (err) {
      return c.json({ error: `Failed to read PDF: ${(err as Error).message}` }, 400);
    }
  }
  const base64Pdf = requestedProviders.includes("mistral")
    ? buffer.toString("base64")
    : "";

  const settled = await Promise.allSettled(
    requestedProviders.map((provider) => {
      if (provider === "deepseek") return extractWithDeepSeek(base64Images);
      if (provider === "groq") return extractWithGroq(base64Images);
      if (provider === "mimo") return extractWithMimo(base64Images);
      return extractWithMistral(base64Pdf);
    })
  );

  function toResult(
    result: PromiseSettledResult<ProviderResult>,
    provider: Provider
  ): ProviderResult {
    if (result.status === "fulfilled") return result.value;
    return {
      provider,
      isResume: false,
      costUsd: 0,
      durationMs: 0,
      error: result.reason?.message ?? String(result.reason),
    };
  }

  const results = settled.map((result, i) => toResult(result, requestedProviders[i]));

  const resume = await insertResume(file.name);
  await Promise.all(
    results.map((result) => insertExtractionResult(resume.id, result))
  );

  return c.json({
    resumeId: resume.id,
    createdAt: resume.created_at,
    results,
  });
});

const CALC_CHAT_PROVIDERS = ["deepseek", "groq", "mimo"] as const;
type CalcChatProvider = (typeof CALC_CHAT_PROVIDERS)[number];

app.post("/api/chat", async (c) => {
  const body = await c.req.json().catch(() => null);
  const provider = body?.provider;
  const question = body?.question;

  if (typeof question !== "string" || question.trim().length === 0) {
    return c.json({ error: "No question provided" }, 400);
  }
  if (!(CALC_CHAT_PROVIDERS as readonly string[]).includes(provider)) {
    return c.json({ error: "Invalid or missing provider" }, 400);
  }

  const askers: Record<CalcChatProvider, (q: string) => ReturnType<typeof askDeepSeekCalc>> = {
    deepseek: askDeepSeekCalc,
    groq: askGroqCalc,
    mimo: askMimoCalc,
  };

  const result = await askers[provider as CalcChatProvider](question.trim());

  if ("error" in result) {
    console.error(`[/api/chat] ${provider} failed: ${result.error}`);
    return c.json({ error: result.error }, 502);
  }
  return c.json({
    answer: result.answer,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    cost_usd: result.costUsd,
    duration_ms: result.durationMs,
  });
});

app.use("/*", serveStatic({ root: "./public" }));
app.get("*", serveStatic({ path: "./public/index.html" }));

initSchema()
  .then(() => {
    serve({ fetch: app.fetch, port: PORT }, (info) => {
      console.log(`Server listening on http://localhost:${info.port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database schema:", err);
    process.exit(1);
  });
