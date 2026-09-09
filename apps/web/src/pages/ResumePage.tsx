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

interface ApiResponse {
  resumeId: number;
  createdAt: string;
  results: ProviderResult[];
}

const PROVIDER_LABELS: Record<ProviderResult["provider"], string> = {
  deepseek: "DeepSeek",
  mistral: "Mistral",
  groq: "Groq",
  mimo: "MiMo",
};

const ALL_PROVIDERS = Object.keys(PROVIDER_LABELS) as ProviderResult["provider"][];

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<
    Set<ProviderResult["provider"]>
  >(new Set(ALL_PROVIDERS));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  function toggleProvider(provider: ProviderResult["provider"]) {
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

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("providers", Array.from(selectedProviders).join(","));

      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });

      const json = (await res.json()) as ApiResponse | { error: string };

      if (!res.ok && "error" in json) {
        setError(json.error);
      } else {
        setResponse(json as ApiResponse);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Resume Parser (Provider Comparison)</h1>
      <p className="subtitle">
        Upload a resume PDF to compare OCR/extraction accuracy, speed, and
        cost across providers.
      </p>

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
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="submit"
          disabled={!file || loading || selectedProviders.size === 0}
        >
          {loading ? "Processing..." : "Upload & Extract"}
        </button>
        {loading && (
          <span className="timer">{(elapsedMs / 1000).toFixed(1)}s</span>
        )}
      </form>

      {selectedProviders.size === 0 && (
        <p className="hint">Select at least one provider to run.</p>
      )}

      {error && <div className="error-box">Error: {error}</div>}

      {response && (
        <div className="comparison-grid">
          {response.results.map((result) => (
            <ProviderPanel key={result.provider} result={result} />
          ))}
        </div>
      )}
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
