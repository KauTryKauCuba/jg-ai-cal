import { safeJsonParse } from "./json.js";
import { calculateMistralCostUsd } from "./pricing.js";
import type { ProviderResult } from "./types.js";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
const MODEL = "mistral-ocr-latest";

const ANNOTATION_PROMPT =
  "Determine whether this document is a resume/CV, tuned for Malaysian resume conventions. " +
  "If it is NOT a resume, set is_resume to false and explain what the document actually is in reason. " +
  "If it IS a resume, set is_resume to true and extract all fields per the schema. " +
  "Use empty strings for missing string fields, null for missing numbers, and empty arrays for missing lists. " +
  "Do not invent information that is not present in the document.";

const RESUME_JSON_SCHEMA = {
  name: "resume_extraction",
  schema: {
    type: "object",
    properties: {
      is_resume: { type: "boolean" },
      reason: { type: "string" },
      personal_info: {
        type: "object",
        properties: {
          name: { type: "string" },
          ic_number: { type: "string" },
          date_of_birth: { type: "string" },
          age: { type: ["number", "null"] },
          gender: { type: "string" },
          nationality: { type: "string" },
          marital_status: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          address: { type: "string" },
          linkedin: { type: "string" },
        },
      },
      summary: { type: "string" },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            title: { type: "string" },
            start_date: { type: "string" },
            end_date: { type: "string" },
            location: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            institution: { type: "string" },
            qualification: { type: "string" },
            level: { type: "string" },
            cgpa: { type: "string" },
            start_date: { type: "string" },
            end_date: { type: "string" },
          },
        },
      },
      skills: { type: "array", items: { type: "string" } },
      language_proficiency: { type: "array", items: { type: "string" } },
      certifications: { type: "array", items: { type: "string" } },
      expected_salary: { type: "string" },
      notice_period: { type: "string" },
      driving_license: { type: "string" },
    },
    required: ["is_resume"],
  },
};

interface MistralOcrResponse {
  usage_info?: { pages_processed?: number };
  document_annotation?: string;
}

export async function extractResumeFromPdf(
  base64Pdf: string
): Promise<ProviderResult> {
  const startedAt = Date.now();
  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY is not set");
    }

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        document: {
          type: "document_url",
          document_url: `data:application/pdf;base64,${base64Pdf}`,
        },
        document_annotation_format: {
          type: "json_schema",
          json_schema: RESUME_JSON_SCHEMA,
        },
        document_annotation_prompt: ANNOTATION_PROMPT,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Mistral API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as MistralOcrResponse;

    if (!data.document_annotation) {
      throw new Error("Mistral response had no document_annotation");
    }

    let json: any;
    try {
      json = safeJsonParse(data.document_annotation);
    } catch {
      throw new Error(
        `Mistral document_annotation was not valid JSON: ${data.document_annotation}`
      );
    }

    const pagesProcessed = data.usage_info?.pages_processed ?? 0;
    const costUsd = calculateMistralCostUsd(pagesProcessed);
    const durationMs = Date.now() - startedAt;

    if (json.is_resume === false) {
      return {
        provider: "mistral",
        isResume: false,
        reason: json.reason ?? "Uploaded document does not appear to be a resume.",
        pagesProcessed,
        costUsd,
        durationMs,
      };
    }

    return {
      provider: "mistral",
      isResume: true,
      data: json,
      pagesProcessed,
      costUsd,
      durationMs,
    };
  } catch (err) {
    return {
      provider: "mistral",
      isResume: false,
      costUsd: 0,
      durationMs: Date.now() - startedAt,
      error: (err as Error).message,
    };
  }
}
