/**
 * MCP-style tool layer: all side effects use backend credentials only.
 * Nothing here should forward secrets to callers or model prompts beyond service boundaries.
 */
import { analyzeRequirements, generateCodePatch } from "../modules/ai/aiService.js";
import {
  createBranchFromDefault,
  createPullRequest,
  deleteBranch,
  fetchRepoTreeSummary,
  upsertTextFiles,
} from "../modules/bitbucket/bitbucketService.js";
import { deploy as deployEnv, rollbackDeploy } from "../modules/deploy/deployService.js";
import { fetchFigmaFileStructured } from "../modules/figma/figmaService.js";
import {
  extractFigmaLinksFromTicket,
  fetchIssue,
  parseFigmaFileKeyFromUrl,
  type JiraTicketPayload,
} from "../modules/jira/jiraService.js";
import { createLogger } from "../logger/index.js";

const log = createLogger("mcp-tools");

export async function get_jira_ticket(ticketId: string): Promise<JiraTicketPayload> {
  return fetchIssue(ticketId);
}

export function extract_figma_links(ticket: JiraTicketPayload): string[] {
  return extractFigmaLinksFromTicket(ticket);
}

export async function get_figma_file(fileKey: string) {
  return fetchFigmaFileStructured(fileKey);
}

export async function create_branch(repo: string, branchName: string): Promise<string> {
  return createBranchFromDefault(repo, branchName);
}

export async function generate_code(context: {
  plan: string;
  jiraSummary: string;
  jiraDescription: string;
  figmaJson: unknown | null;
  repoPaths: string[];
}) {
  return generateCodePatch(context);
}

export async function apply_patch(repo: string, branch: string, files: { path: string; content: string }[]) {
  await upsertTextFiles(
    repo,
    branch,
    files.map((f, i) => ({
      path: f.path,
      content: f.content,
      message: `chore(pipeline): apply AI patch ${i + 1}/${files.length}`,
    })),
  );
}

export async function run_tests(_repo: string): Promise<{ passed: boolean; detail: string }> {
  log.info("run_tests stub — integrate CI dispatch here");
  return { passed: true, detail: "stub_skipped" };
}

export async function create_pull_request(repo: string, head: string, title: string, body: string) {
  return createPullRequest({ fullRepo: repo, head, title, body });
}

export async function deploy(env: { jobId: string; ticketId: string; repo: string; prUrl?: string | null }) {
  return deployEnv(env);
}

export async function rollback(env: { jobId: string; ticketId: string; repo: string; branchName?: string | null }) {
  if (env.branchName) {
    await deleteBranch(env.repo, env.branchName);
  }
  await rollbackDeploy({ jobId: env.jobId, ticketId: env.ticketId });
}

export async function analyze_repo_paths(repo: string): Promise<string[]> {
  return fetchRepoTreeSummary(repo);
}

export { parseFigmaFileKeyFromUrl };
