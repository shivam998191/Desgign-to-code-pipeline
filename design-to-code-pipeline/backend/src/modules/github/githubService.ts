import { Octokit } from "@octokit/rest";
import { getConfig } from "../../config/index.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("github");

export type RepoSlug = { owner: string; repo: string };

export function parseRepoFullName(full: string): RepoSlug {
  const [owner, repo] = full.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo slug: ${full}`);
  return { owner, repo };
}

function client(): Octokit {
  const cfg = getConfig();
  return new Octokit({ auth: cfg.GITHUB_TOKEN });
}

export async function getDefaultBranchRef(fullRepo: string): Promise<{ ref: string; sha: string }> {
  const { owner, repo } = parseRepoFullName(fullRepo);
  const octo = client();
  const { data: repoMeta } = await octo.repos.get({ owner, repo });
  const branch = repoMeta.default_branch;
  const { data: refData } = await octo.git.getRef({ owner, repo, ref: `heads/${branch}` });
  return { ref: branch, sha: refData.object.sha };
}

export async function createBranchFromDefault(fullRepo: string, newBranchName: string): Promise<string> {
  const { owner, repo } = parseRepoFullName(fullRepo);
  const octo = client();
  const { sha } = await getDefaultBranchRef(fullRepo);
  await octo.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranchName}`,
    sha,
  });
  log.info({ owner, repo, newBranchName }, "Created branch");
  return newBranchName;
}

export async function upsertTextFiles(
  fullRepo: string,
  branch: string,
  files: { path: string; content: string; message: string }[],
): Promise<void> {
  const { owner, repo } = parseRepoFullName(fullRepo);
  const octo = client();
  for (const f of files) {
    let sha: string | undefined;
    try {
      const existing = await octo.repos.getContent({ owner, repo, path: f.path, ref: branch });
      if (!Array.isArray(existing.data) && "sha" in existing.data) {
        sha = existing.data.sha;
      }
    } catch {
      sha = undefined;
    }
    await octo.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: f.path,
      message: f.message,
      content: Buffer.from(f.content, "utf8").toString("base64"),
      branch,
      sha,
    });
  }
}

export async function createPullRequest(params: {
  fullRepo: string;
  head: string;
  base?: string;
  title: string;
  body: string;
}): Promise<string> {
  const { owner, repo } = parseRepoFullName(params.fullRepo);
  const octo = client();
  const base = params.base ?? (await getDefaultBranchRef(params.fullRepo)).ref;
  const { data } = await octo.pulls.create({
    owner,
    repo,
    head: params.head,
    base,
    title: params.title,
    body: params.body,
  });
  log.info({ pr: data.html_url }, "Opened pull request");
  return data.html_url;
}

export async function deleteBranch(fullRepo: string, branch: string): Promise<void> {
  const { owner, repo } = parseRepoFullName(fullRepo);
  const octo = client();
  try {
    await octo.git.deleteRef({ owner, repo, ref: `heads/${branch}` });
    log.warn({ owner, repo, branch }, "Deleted branch (rollback)");
  } catch (e) {
    log.error({ err: e, branch }, "Failed to delete branch during rollback");
  }
}

export async function fetchRepoTreeSummary(fullRepo: string, maxEntries = 80): Promise<string[]> {
  const { owner, repo } = parseRepoFullName(fullRepo);
  const octo = client();
  const { sha } = await getDefaultBranchRef(fullRepo);
  const { data } = await octo.git.getTree({ owner, repo, tree_sha: sha, recursive: "true" });
  return (data.tree ?? [])
    .filter((t) => t.type === "blob" && t.path)
    .map((t) => t.path as string)
    .slice(0, maxEntries);
}
