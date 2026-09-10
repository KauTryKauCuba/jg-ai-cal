import { useEffect, useRef, useState } from "react";
import "../App.css";
import { UsageBox } from "../components/UsageBox";

interface ExtractedData {
  personal_info: {
    name: string;
    ic_number: string;
    date_of_birth: string;
    age: number | null;
    gender: string;
    nationality: string;
    marital_status: string;
    email: string;
    phone: string;
    address: string;
    linkedin: string;
  };
  summary: string;
  experience: {
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    location: string;
    description: string;
  }[];
  education: {
    institution: string;
    qualification: string;
    level: string;
    cgpa: string;
    start_date: string;
    end_date: string;
  }[];
  skills: unknown[];
  language_proficiency: unknown[];
  certifications: unknown[];
  expected_salary: string;
  notice_period: string;
  driving_license: string;
}

interface ProviderResult {
  provider: "deepseek" | "mistral" | "groq" | "mimo";
  isResume: boolean;
  reason?: string;
  data?: ExtractedData;
  inputTokens?: number;
  outputTokens?: number;
  pagesProcessed?: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}

type Provider = ProviderResult["provider"];

const PROVIDER_LABELS: Record<Provider, string> = {
  deepseek: "DeepSeek",
  mistral: "Mistral",
  groq: "Groq",
  mimo: "MiMo",
};

const ALL_PROVIDERS = Object.keys(PROVIDER_LABELS) as Provider[];

interface ResumeSummary {
  id: number;
  filename: string;
  created_at: string;
}

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<Set<Provider>>(
    new Set(ALL_PROVIDERS)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The providers a run was actually submitted with (snapshotted so toggling
  // checkboxes mid-run doesn't reshuffle the grid), and results filled in one
  // at a time as each provider's own extraction finishes — instead of
  // waiting for every provider before showing anything.
  const [activeProviders, setActiveProviders] = useState<Provider[]>([]);
  const [results, setResults] = useState<Map<Provider, ProviderResult>>(new Map());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [history, setHistory] = useState<ResumeSummary[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadHistory() {
    try {
      const res = await fetch("/api/resumes");
      if (!res.ok) return;
      const json = (await res.json()) as { resumes: ResumeSummary[] };
      setHistory(json.resumes);
    } catch {
      // History is a convenience list — silently skip on failure.
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function openHistoryEntry(id: number) {
    setHistoryLoading(true);
    setError(null);
    setSelectedResumeId(id);
    try {
      const res = await fetch(`/api/resumes/${id}`);
      if (!res.ok) {
        const json = (await res.json()) as { error: string };
        setError(json.error);
        return;
      }
      const json = (await res.json()) as { results: ProviderResult[] };
      setFile(null);
      setActiveProviders(json.results.map((r) => r.provider));
      setResults(new Map(json.results.map((r) => [r.provider, r])));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  function pickFile(f: File | null | undefined) {
    setFile(f && f.type === "application/pdf" ? f : null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  function toggleProvider(provider: Provider) {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }

  useEffect(() => {
    if (loading) {
      const start = Date.now();
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 100);
    } else if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || selectedProviders.size === 0) return;

    const providers = Array.from(selectedProviders);
    setLoading(true);
    setError(null);
    setSelectedResumeId(null);
    setActiveProviders(providers);
    setResults(new Map());

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("providers", providers.join(","));

      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = (await res.json()) as { error: string };
        setError(json.error);
        return;
      }

      // Server streams newline-delimited JSON, one line per provider as it
      // finishes, rather than one combined response after all of them
      // complete — read and apply each line as it arrives.
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming is not supported by this browser");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;

          const msg = JSON.parse(line) as
            | { type: "resume"; resumeId: number; createdAt: string }
            | { type: "result"; result: ProviderResult };

          if (msg.type === "resume") {
            setSelectedResumeId(msg.resumeId);
          } else if (msg.type === "result") {
            setResults((prev) => new Map(prev).set(msg.result.provider, msg.result));
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      loadHistory();
    }
  }

  return (
    <div className="page">
      {history.length > 0 && (
        <div className="history-list">
          {history.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={
                entry.id === selectedResumeId ? "history-item history-item-active" : "history-item"
              }
              onClick={() => openHistoryEntry(entry.id)}
              disabled={historyLoading}
            >
              <span className="history-item-name">{entry.filename}</span>
              <span className="history-item-date">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="provider-checkboxes">
        {ALL_PROVIDERS.map((provider) => (
          <label key={provider}>
            <input
              type="checkbox"
              checked={selectedProviders.has(provider)}
              onChange={() => toggleProvider(provider)}
            />
            {PROVIDER_LABELS[provider]}
          </label>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        <div
          className={
            isDragOver ? "dropzone dropzone-active" : file ? "dropzone dropzone-filled" : "dropzone"
          }
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Choose or drop a resume PDF"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="dropzone-input"
          />
          <svg
            className="dropzone-icon"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 16V4M12 4L7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="dropzone-text">
            {file ? (
              <>
                <strong>{file.name}</strong>
                <span>Click or drop to replace</span>
              </>
            ) : (
              <>
                <strong>Choose a resume PDF</strong>
                <span>or drag and drop it here</span>
              </>
            )}
          </div>
        </div>

        <div className="upload-actions">
          <button
            type="submit"
            className="upload-button"
            disabled={!file || loading || selectedProviders.size === 0}
          >
            {loading ? "Processing…" : "Upload & Extract"}
          </button>
          {loading && (
            <span className="timer">{(elapsedMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      </form>

      {selectedProviders.size === 0 && (
        <p className="hint">Select at least one provider to run.</p>
      )}

      {error && <div className="error-box">Error: {error}</div>}

      {activeProviders.length > 0 && (
        <div className="comparison-grid">
          {activeProviders.map((provider) => {
            const result = results.get(provider);
            return result ? (
              <ProviderPanel key={provider} result={result} />
            ) : (
              <PendingProviderPanel key={provider} provider={provider} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PendingProviderPanel({ provider }: { provider: Provider }) {
  return (
    <div className="provider-panel">
      <h2>{PROVIDER_LABELS[provider]}</h2>
      <div className="pending-box" aria-label="Extracting">
        {[0, 1, 2].map((i) => (
          <span key={i} className="pending-dot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function ProviderPanel({ result }: { result: ProviderResult }) {
  return (
    <div className="provider-panel">
      <h2>{PROVIDER_LABELS[result.provider]}</h2>

      {result.error && (
        <div className="error-box">Failed: {result.error}</div>
      )}

      {!result.error && !result.isResume && (
        <div className="rejection-box">
          <h3>Not a resume</h3>
          <p>{result.reason}</p>
        </div>
      )}

      {!result.error && (
        <UsageBox
          inputTokens={result.inputTokens}
          outputTokens={result.outputTokens}
          pagesProcessed={result.pagesProcessed}
          costUsd={result.costUsd}
          durationMs={result.durationMs}
        />
      )}

      {!result.error && result.isResume && result.data && (
        <ExtractedView data={result.data} />
      )}
    </div>
  );
}

// Extraction schema asks for plain strings in list fields, but models sometimes
// return richer objects (e.g. {name, issuer, cert_no}) instead — render either shape.
function displayListItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    return Object.values(item as Record<string, unknown>)
      .filter((v) => v !== null && v !== undefined && v !== "")
      .join(" - ");
  }
  return String(item);
}

function displayList(items: unknown[]): string {
  return items.map(displayListItem).join(", ") || "-";
}

function ExtractedView({ data }: { data: ExtractedData }) {
  // Only Mistral enforces a JSON schema server-side — DeepSeek/Groq/MiMo use
  // plain json_object mode, so a field can be missing entirely rather than
  // just empty. Default everything so .length/.map below never crash.
  const p = data.personal_info ?? ({} as ExtractedData["personal_info"]);
  const experience = data.experience ?? [];
  const education = data.education ?? [];
  const skills = data.skills ?? [];
  const languageProficiency = data.language_proficiency ?? [];
  const certifications = data.certifications ?? [];
  return (
    <div className="extracted">
      <section>
        <h3>Personal Info</h3>
        <ul>
          <li>Name: {p.name || "-"}</li>
          <li>IC Number: {p.ic_number || "-"}</li>
          <li>Date of Birth: {p.date_of_birth || "-"}</li>
          <li>Age: {p.age ?? "-"}</li>
          <li>Gender: {p.gender || "-"}</li>
          <li>Nationality: {p.nationality || "-"}</li>
          <li>Marital Status: {p.marital_status || "-"}</li>
          <li>Email: {p.email || "-"}</li>
          <li>Phone: {p.phone || "-"}</li>
          <li>Address: {p.address || "-"}</li>
          <li>LinkedIn: {p.linkedin || "-"}</li>
        </ul>
      </section>

      {data.summary && (
        <section>
          <h3>Summary</h3>
          <p>{data.summary}</p>
        </section>
      )}

      <section>
        <h3>Experience</h3>
        {experience.length === 0 && <p>None found.</p>}
        {experience.map((exp, i) => (
          <div key={i} className="entry">
            <strong>{exp.title}</strong> at {exp.company} ({exp.start_date} -{" "}
            {exp.end_date}), {exp.location}
            <p>{exp.description}</p>
          </div>
        ))}
      </section>

      <section>
        <h3>Education</h3>
        {education.length === 0 && <p>None found.</p>}
        {education.map((ed, i) => (
          <div key={i} className="entry">
            <strong>{ed.qualification}</strong> ({ed.level}) - {ed.institution}
            , {ed.start_date} - {ed.end_date} {ed.cgpa && `CGPA: ${ed.cgpa}`}
          </div>
        ))}
      </section>

      <section>
        <h3>Skills</h3>
        <p>{displayList(skills)}</p>
      </section>

      <section>
        <h3>Languages</h3>
        <p>{displayList(languageProficiency)}</p>
      </section>

      <section>
        <h3>Certifications</h3>
        <p>{displayList(certifications)}</p>
      </section>

      <section>
        <h3>Other</h3>
        <ul>
          <li>Expected Salary: {data.expected_salary || "-"}</li>
          <li>Notice Period: {data.notice_period || "-"}</li>
          <li>Driving License: {data.driving_license || "-"}</li>
        </ul>
      </section>
    </div>
  );
}
