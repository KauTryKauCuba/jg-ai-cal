import { Pool } from "pg";
import type { ProviderResult } from "./types.js";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// node-postgres emits an 'error' event on idle-client connection issues;
// without a listener Node treats it as an unhandled exception and crashes
// the whole process on a transient DB blip.
pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extraction_results (
  id SERIAL PRIMARY KEY,
  resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  is_resume BOOLEAN,
  extracted_data JSONB,
  input_tokens INTEGER,
  output_tokens INTEGER,
  pages_processed INTEGER,
  cost_usd NUMERIC(10,6),
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

export async function initSchema(): Promise<void> {
  await pool.query(SCHEMA);
}

export async function insertResume(filename: string) {
  const result = await pool.query(
    `INSERT INTO resumes (filename) VALUES ($1) RETURNING id, created_at`,
    [filename]
  );
  return result.rows[0];
}

export async function insertExtractionResult(
  resumeId: number,
  result: ProviderResult
) {
  await pool.query(
    `INSERT INTO extraction_results
      (resume_id, provider, is_resume, extracted_data, input_tokens, output_tokens, pages_processed, cost_usd, duration_ms, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      resumeId,
      result.provider,
      result.error ? null : result.isResume,
      result.data ? JSON.stringify(result.data) : null,
      result.inputTokens ?? null,
      result.outputTokens ?? null,
      result.pagesProcessed ?? null,
      result.costUsd,
      result.durationMs,
      result.error ?? null,
    ]
  );
}
