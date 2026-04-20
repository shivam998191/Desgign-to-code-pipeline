import type { Job } from "../types/job";

const base = import.meta.env.VITE_API_BASE ?? "";

function errorMessageFromBody(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown };
    if (typeof parsed?.error === "string" && parsed.error.length > 0) {
      return parsed.error;
    }
  } catch {
    // not JSON
  }
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(errorMessageFromBody(text, res.statusText));
  }
  const body = text.trim();
  if (!body) return {} as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Invalid JSON from server");
  }
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${base}/api/jobs`);
  return parse<Job[]>(res);
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${base}/api/jobs/${jobId}`);
  return parse<Job>(res);
}

export async function createJob(body: { ticketId: string; repo: string }): Promise<{ id: string }> {
  const res = await fetch(`${base}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse<{ id: string }>(res);
}

export async function retryJob(jobId: string): Promise<{ ok: boolean; job: Job | null }> {
  const res = await fetch(`${base}/api/jobs/${jobId}/retry`, { method: "POST" });
  return parse<{ ok: boolean; job: Job | null }>(res);
}
