import axios, { type AxiosInstance } from "axios";
import FormData from "form-data";
import { getConfig } from "../../config/index.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("bitbucket");
const API_BASE = "https://api.bitbucket.org/2.0";

const RESERVED_SRC_FIELD_NAMES = new Set(["message", "branch", "author", "parents", "files"]);

export type RepoSlug = { workspace: string; repoSlug: string };

export function parseRepoFullName(full: string): RepoSlug {
  const parts = full.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid Bitbucket repo slug (expected workspace/repo): ${full}`);
  const [workspace, ...rest] = parts;
  const repoSlug = rest.join("/");
  if (!workspace || !repoSlug) throw new Error(`Invalid Bitbucket repo slug: ${full}`);
  return { workspace, repoSlug };
}

function buildAuthHeader(username: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${username}:${apiToken}`, "utf8").toString("base64")}`;
}

function formFieldNameForRepoPath(repoPath: string): string {
  const normalized = String(repoPath).replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("..")) {
    throw new Error(`Invalid file path: ${repoPath}`);
  }
  if (normalized.startsWith("/")) return normalized;
  const base = normalized.split("/").pop() ?? "";
  if (base && RESERVED_SRC_FIELD_NAMES.has(base)) {
    return `/${normalized}`;
  }
  return normalized;
}

function bb(): AxiosInstance {
  const cfg = getConfig();
  const auth = buildAuthHeader(cfg.BITBUCKET_USERNAME, cfg.BITBUCKET_API_TOKEN);
  return axios.create({
    baseURL: API_BASE,
    timeout: 120_000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
  });
}

function throwIfBad(res: { status: number; data: unknown }, context: string): void {
  if (res.status >= 200 && res.status < 300) return;
  const data = res.data as { error?: { message?: string }; message?: string } | string | null;
  let msg = `HTTP ${res.status}`;
  if (data && typeof data === "object" && "error" in data && data.error?.message) msg = data.error.message;
  else if (data && typeof data === "object" && "message" in data && typeof data.message === "string") msg = data.message;
  else if (typeof data === "string" && data.trim()) msg = data.trim().slice(0, 500);
  log.error({ context, status: res.status, msg }, "Bitbucket API error");
  throw new Error(`${context}: ${msg}`);
}

export async function getRepositoryMainBranch(fullRepo: string): Promise<string> {
  const { workspace, repoSlug } = parseRepoFullName(fullRepo);
  const cfg = getConfig();
  const path = `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}`;
  const res = await bb().get(path);
  throwIfBad(res, "get_repository");
  const main = (res.data as { mainbranch?: { name?: string } })?.mainbranch?.name;
  return (main && main.trim()) || cfg.BITBUCKET_DEFAULT_BRANCH;
}

export async function getBranchTipHash(fullRepo: string, branchName: string): Promise<string> {
  const { workspace, repoSlug } = parseRepoFullName(fullRepo);
  const url = `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/refs/branches/${encodeURIComponent(branchName)}`;
  const res = await bb().get(url);
  throwIfBad(res, "get_branch");
  const hash = (res.data as { target?: { hash?: string } })?.target?.hash;
  if (!hash) throw new Error("Could not read branch tip hash");
  return hash;
}

export async function getDefaultBranchRef(fullRepo: string): Promise<{ ref: string; sha: string }> {
  const ref = await getRepositoryMainBranch(fullRepo);
  const sha = await getBranchTipHash(fullRepo, ref);
  return { ref, sha };
}

export async function createBranchFromDefault(fullRepo: string, newBranchName: string): Promise<string> {
  const { workspace, repoSlug } = parseRepoFullName(fullRepo);
  const cfg = getConfig();
  const baseBranch = await getRepositoryMainBranch(fullRepo);
  const hash = await getBranchTipHash(fullRepo, baseBranch);
  const url = `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/refs/branches`;
  const res = await bb().post(
    url,
    { name: newBranchName, target: { hash } },
    { headers: { "Content-Type": "application/json" } },
  );
  throwIfBad(res, "create_branch");
  log.info({ workspace, repoSlug, newBranchName }, "Created Bitbucket branch");
  return newBranchName;
}

export async function upsertTextFiles(
  fullRepo: string,
  branch: string,
  files: { path: string; content: string; message: string }[],
): Promise<void> {
  if (!files.length) return;
  const { workspace, repoSlug } = parseRepoFullName(fullRepo);
  const form = new FormData();
  const message = files.map((f) => f.message).filter(Boolean).join(" | ") || "chore(pipeline): AI patch";
  form.append("message", message);
  form.append("branch", branch);
  for (const f of files) {
    const field = formFieldNameForRepoPath(f.path);
    const buf = Buffer.from(f.content ?? "", "utf8");
    const filename = f.path.split("/").pop() || "file";
    form.append(field, buf, { filename });
  }
  const url = `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/src`;
  const res = await bb().post(url, form, { headers: form.getHeaders() });
  throwIfBad(res, "commit_files");
}

export async function createPullRequest(params: {
  fullRepo: string;
  head: string;
  base?: string;
  title: string;
  body: string;
}): Promise<string> {
  const { workspace, repoSlug } = parseRepoFullName(params.fullRepo);
  const destination = params.base ?? (await getRepositoryMainBranch(params.fullRepo));
  const url = `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/pullrequests`;
  const res = await bb().post(
    url,
    {
      title: params.title,
      description: params.body,
      source: { branch: { name: params.head } },
      destination: { branch: { name: destination } },
      close_source_branch: false,
    },
    { headers: { "Content-Type": "application/json" } },
  );
  throwIfBad(res, "create_pull_request");
  const pr = res.data as { id?: number; links?: { html?: { href?: string } } };
  const id = pr.id;
  if (pr.links?.html?.href) return pr.links.html.href;
  if (id != null) {
    return `https://bitbucket.org/${workspace}/${repoSlug}/pull-requests/${id}`;
  }
  throw new Error("PR created but no link returned");
}

export async function deleteBranch(fullRepo: string, branch: string): Promise<void> {
  const { workspace, repoSlug } = parseRepoFullName(fullRepo);
  const url = `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/refs/branches/${encodeURIComponent(branch)}`;
  const res = await bb().delete(url);
  if (res.status === 204 || res.status === 200) {
    log.warn({ workspace, repoSlug, branch }, "Deleted Bitbucket branch (rollback)");
    return;
  }
  if (res.status === 404) {
    log.warn({ branch }, "Branch already absent during rollback");
    return;
  }
  throwIfBad(res, "delete_branch");
}

type SrcEntry = { type?: string; path?: string; mimetype?: string };

export async function fetchRepoTreeSummary(fullRepo: string, maxEntries = 80): Promise<string[]> {
  const { workspace, repoSlug } = parseRepoFullName(fullRepo);
  const branch = await getRepositoryMainBranch(fullRepo);
  const root = `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/src/${encodeURIComponent(branch)}`;
  const out: string[] = [];
  const queue: string[] = [""];
  const seen = new Set<string>();
  let depthLimit = 0;

  while (queue.length && out.length < maxEntries && depthLimit < 400) {
    depthLimit += 1;
    const prefix = queue.shift() ?? "";
    if (seen.has(prefix)) continue;
    seen.add(prefix);
    const sub = prefix ? `${prefix.split("/").map(encodeURIComponent).join("/")}` : "";
    const url = sub ? `${root}/${sub}?pagelen=100` : `${root}?pagelen=100`;
    const res = await bb().get(url);
    if (res.status !== 200) continue;
    const data = res.data as { values?: SrcEntry[] };
    const values = Array.isArray(data?.values) ? data.values : [];
    for (const v of values) {
      if (out.length >= maxEntries) break;
      const p = v.path ?? "";
      const fullPath = prefix ? `${prefix}/${p}` : p;
      const isDir = v.type === "commit_directory" || v.mimetype === "application/x-directory";
      if (isDir) {
        queue.push(fullPath);
      } else {
        out.push(fullPath);
      }
    }
  }

  if (out.length === 0) {
    out.push(`${workspace}/${repoSlug}@${branch}`);
  }
  return out.slice(0, maxEntries);
}
