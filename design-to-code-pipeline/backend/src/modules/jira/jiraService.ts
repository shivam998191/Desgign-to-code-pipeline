import axios, { type AxiosInstance } from "axios";
import { getConfig } from "../../config/index.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("jira");

export type JiraTicketPayload = {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  acceptanceCriteria: string | null;
  comments: { author: string; body: string; created: string }[];
  rawFields: Record<string, unknown>;
};

function buildClient(): AxiosInstance {
  const cfg = getConfig();
  const auth = Buffer.from(`${cfg.JIRA_EMAIL}:${cfg.JIRA_API_TOKEN}`).toString("base64");
  return axios.create({
    baseURL: cfg.JIRA_BASE_URL.replace(/\/$/, ""),
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 30_000,
  });
}

export async function fetchIssue(issueKey: string): Promise<JiraTicketPayload> {
  const client = buildClient();
  const path = `/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
  log.debug({ issueKey, path: path.split("?")[0] }, "Fetching Jira issue");
  const { data } = await client.get(path, {
    params: {
      expand: "renderedFields",
      fields: "summary,description,comment",
    },
  });

  const comments =
    data.fields?.comment?.comments?.map((c: { author?: { displayName?: string }; body?: unknown; created?: string }) => ({
      author: c.author?.displayName ?? "unknown",
      body: extractTextFromADF(c.body) ?? "",
      created: c.created ?? "",
    })) ?? [];

  return {
    id: data.id,
    key: data.key,
    summary: data.fields?.summary ?? "",
    description: extractTextFromADF(data.fields?.description) ?? null,
    acceptanceCriteria: extractAcceptanceCriteria(data.fields) ?? extractAcceptanceFromDescription(data.fields?.description),
    comments,
    rawFields: data.fields ?? {},
  };
}

function extractAcceptanceCriteria(fields: Record<string, unknown> | undefined): string | null {
  if (!fields) return null;
  for (const [k, v] of Object.entries(fields)) {
    if (!k.toLowerCase().includes("acceptance")) continue;
    const text = extractTextFromADF(v);
    if (text) return text;
  }
  return null;
}

function extractAcceptanceFromDescription(description: unknown): string | null {
  const text = extractTextFromADF(description);
  if (!text) return null;
  const idx = text.toLowerCase().indexOf("acceptance criteria");
  if (idx === -1) return null;
  return text.slice(idx).slice(0, 8000);
}

function extractTextFromADF(body: unknown): string | null {
  if (body == null) return null;
  if (typeof body === "string") return body;
  if (typeof body !== "object") return String(body);
  const doc = body as { type?: string; content?: unknown[]; text?: string };
  if (doc.type === "doc" && Array.isArray(doc.content)) {
    return walkAdf(doc.content);
  }
  if (typeof doc.text === "string") return doc.text;
  return JSON.stringify(body).slice(0, 8000);
}

function walkAdf(nodes: unknown[]): string {
  const parts: string[] = [];
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    const node = n as { type?: string; text?: string; content?: unknown[] };
    if (node.text) parts.push(node.text);
    if (Array.isArray(node.content)) parts.push(walkAdf(node.content));
  }
  return parts.join("\n").trim();
}

export function extractFigmaLinksFromTicket(ticket: JiraTicketPayload): string[] {
  const blob = [ticket.summary, ticket.description ?? "", ticket.acceptanceCriteria ?? "", ...ticket.comments.map((c) => c.body)].join(
    "\n",
  );
  const regex = /https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)(?:\/[^\s]*)?/g;
  const keys = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(blob)) !== null) {
    keys.add(`https://www.figma.com/file/${m[1]}`);
  }
  return [...keys];
}

export function parseFigmaFileKeyFromUrl(url: string): string | null {
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}
