import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { askDeepSeekCalc, askGroqCalc, askMimoCalc } from "./calcChat.js";
import {
  initSchema,
  insertResume,
  insertExtractionResult,
  listResumes,
  getResumeWithResults,
} from "./db.js";
import { extractResumeFromImages as extractWithDeepSeek } from "./deepseek.js";
import { extractResumeFromImages as extractWithGroq } from "./groq.js";
import { extractResumeFromImages as extractWithMimo } from "./mimo.js";
import { extractResumeFromPdf as extractWithMistral } from "./mistral.js";
import { getPdfPageCount, MAX_PAGES, pdfToBase64Images } from "./pdf.js";
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

  // Checked once, up front, for every provider — Mistral takes the raw PDF
  // directly (not through pdfToBase64Images), so it would otherwise skip
  // this limit entirely if it were the only provider selected.
  let pageCount: number;
  try {
    pageCount = await getPdfPageCount(buffer);
  } catch (err) {
    return c.json({ error: `Failed to read PDF: ${(err as Error).message}` }, 400);
  }
  if (pageCount > MAX_PAGES) {
    return c.json(
      { error: `PDF has ${pageCount} pages, which exceeds the ${MAX_PAGES}-page limit for this tool.` },
      400
    );
  }

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

  c.header("Content-Type", "application/x-ndjson");
  return stream(c, async (streamApi) => {
    const resume = await insertResume(file.name);
    await streamApi.write(
      JSON.stringify({ type: "resume", resumeId: resume.id, createdAt: resume.created_at }) +
        "\n"
    );

    // Kick off every provider in parallel, but write each result to the
    // stream as soon as it individually settles — instead of collecting
    // into an array and waiting for Promise.allSettled, so the client can
    // render a finished card immediately instead of waiting on the slowest
    // provider.
    await Promise.all(
      requestedProviders.map(async (provider) => {
        let result: ProviderResult;
        try {
          if (provider === "deepseek") result = await extractWithDeepSeek(base64Images);
          else if (provider === "groq") result = await extractWithGroq(base64Images);
          else if (provider === "mimo") result = await extractWithMimo(base64Images);
          else result = await extractWithMistral(base64Pdf);
        } catch (err) {
          result = {
            provider,
            isResume: false,
            costUsd: 0,
            durationMs: 0,
            error: (err as Error).message,
          };
        }
        await insertExtractionResult(resume.id, result);
        await streamApi.write(JSON.stringify({ type: "result", result }) + "\n");
      })
    );
  });
});

app.get("/api/resumes", async (c) => {
  const resumes = await listResumes();
  return c.json({ resumes });
});

app.get("/api/resumes/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid resume id" }, 400);
  }
  const record = await getResumeWithResults(id);
  if (!record) {
    return c.json({ error: "Resume not found" }, 404);
  }
  return c.json(record);
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
