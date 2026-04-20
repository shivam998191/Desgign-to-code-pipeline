import { randomUUID } from "node:crypto";
import type { JobStatus } from "../../db/types.js";
import * as tools from "../../mcp/tools.js";
import { createLogger } from "../../logger/index.js";
import { PIPELINE_STAGES, type PipelineStage } from "../../shared/pipeline.js";
import { analyzeRequirements } from "../ai/aiService.js";
import * as jobRepo from "../jobs/jobRepository.js";
import { notifyJob } from "../realtime/bus.js";

const log = createLogger("orchestrator");

type Ctx = {
  ticket?: Awaited<ReturnType<typeof tools.get_jira_ticket>>;
  figmaJson?: unknown | null;
  plan?: string;
  files?: { path: string; content: string }[];
  branchName?: string;
  prUrl?: string;
};

function stageOrder(name: string): number {
  const idx = PIPELINE_STAGES.indexOf(name as PipelineStage);
  return idx === -1 ? 999 : idx;
}

export async function runPipeline(jobId: string): Promise<void> {
  const ctx: Ctx = {};
  const job = await jobRepo.getJob(jobId);
  if (!job) throw new Error("job_not_found");
  const { repo, ticketId } = job;

  await jobRepo.updateJobFields(jobId, { status: "RUNNING", errorMessage: null });
  await jobRepo.appendLog(jobId, "info", "Pipeline started");
  notify(jobId);

  const linearStages = PIPELINE_STAGES.filter((s) => s !== "ROLLBACK");

  try {
    for (const stage of linearStages) {
      await jobRepo.updateJobFields(jobId, { currentStage: stage });
      notify(jobId);
      await runStage(jobId, stage, ctx, repo, ticketId);
    }
    await jobRepo.updateStep(jobId, "ROLLBACK", {
      status: "SKIPPED",
      endedAt: new Date(),
      errorMessage: null,
    });
    await jobRepo.updateJobFields(jobId, { status: "COMPLETED" });
    await jobRepo.appendLog(jobId, "info", "Pipeline completed");
    notify(jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error({ jobId, err: e }, "Pipeline failed");
    await jobRepo.appendLog(jobId, "error", `Pipeline error: ${message}`);
    notify(jobId);

    try {
      await beginRollbackStep(jobId);
      await tools.rollback({
        jobId,
        ticketId,
        repo,
        branchName: ctx.branchName ?? null,
      });
      await finishStep(jobId, "ROLLBACK", "DONE");
      await jobRepo.updateJobFields(jobId, { status: "ROLLED_BACK", errorMessage: message });
      await jobRepo.appendLog(jobId, "warn", "Rollback finished");
    } catch (rbErr) {
      await finishStep(jobId, "ROLLBACK", "FAILED", rbErr instanceof Error ? rbErr.message : String(rbErr));
      await jobRepo.appendLog(jobId, "error", "Rollback failed");
      await jobRepo.updateJobFields(jobId, { status: "FAILED", errorMessage: message });
    }
    notify(jobId);
  }
}

async function beginRollbackStep(jobId: string): Promise<void> {
  await jobRepo.updateJobFields(jobId, { currentStage: "ROLLBACK" });
  await jobRepo.updateStep(jobId, "ROLLBACK", {
    status: "IN_PROGRESS",
    startedAt: new Date(),
  });
  notify(jobId);
}

function notify(jobId: string): void {
  notifyJob(jobId);
}

async function runStage(jobId: string, stage: PipelineStage, ctx: Ctx, repo: string, ticketId: string): Promise<void> {
  await jobRepo.updateStep(jobId, stage, {
    status: "IN_PROGRESS",
    startedAt: new Date(),
    errorMessage: null,
  });
  await jobRepo.appendLog(jobId, "info", `Stage ${stage} in progress`);
  notify(jobId);

  try {
    switch (stage) {
      case "FETCH_JIRA": {
        ctx.ticket = await tools.get_jira_ticket(ticketId);
        await jobRepo.appendLog(jobId, "info", `Fetched Jira ${ctx.ticket.key}: ${ctx.ticket.summary}`);
        break;
      }
      case "PARSE_REQUIREMENTS": {
        if (!ctx.ticket) throw new Error("missing_ticket_context");
        const links = tools.extract_figma_links(ctx.ticket);
        await jobRepo.appendLog(jobId, "info", `Found ${links.length} Figma link(s)`);
        await jobRepo.updateJobFields(jobId, {
          metadata: {
            figmaLinks: links,
            jiraKey: ctx.ticket.key,
          } as Record<string, unknown>,
        });
        break;
      }
      case "FETCH_FIGMA": {
        if (!ctx.ticket) throw new Error("missing_ticket_context");
        const links = tools.extract_figma_links(ctx.ticket);
        if (!links.length) {
          ctx.figmaJson = null;
          await jobRepo.appendLog(jobId, "info", "No Figma links; skipping remote Figma fetch");
        } else {
          const key = tools.parseFigmaFileKeyFromUrl(links[0]);
          if (!key) throw new Error("invalid_figma_url");
          const figma = await tools.get_figma_file(key);
          ctx.figmaJson = figma;
          await jobRepo.appendLog(jobId, "info", `Loaded Figma file ${figma.name}`);
        }
        break;
      }
      case "ANALYZE": {
        if (!ctx.ticket) throw new Error("missing_ticket_context");
        const repoPaths = await tools.analyze_repo_paths(repo);
        const plan = await analyzeRequirements({
          jiraSummary: ctx.ticket.summary,
          jiraDescription: [ctx.ticket.description, ctx.ticket.acceptanceCriteria].filter(Boolean).join("\n\n"),
          figmaJson: ctx.figmaJson ?? null,
          repoPaths,
        });
        ctx.plan = plan;
        const existingJob = await jobRepo.getJob(jobId);
        const prevMeta =
          existingJob?.metadata && typeof existingJob.metadata === "object" && !Array.isArray(existingJob.metadata)
            ? (existingJob.metadata as Record<string, unknown>)
            : {};
        await jobRepo.updateJobFields(jobId, {
          metadata: { ...prevMeta, plan, repoPaths } as Record<string, unknown>,
        });
        await jobRepo.appendLog(jobId, "info", "Analysis complete");
        break;
      }
      case "GENERATE_CODE": {
        if (!ctx.ticket || !ctx.plan) throw new Error("missing_context_for_generation");
        const repoPaths = await tools.analyze_repo_paths(repo);
        const gen = await tools.generate_code({
          plan: ctx.plan,
          jiraSummary: ctx.ticket.summary,
          jiraDescription: [ctx.ticket.description, ctx.ticket.acceptanceCriteria].filter(Boolean).join("\n\n"),
          figmaJson: ctx.figmaJson ?? null,
          repoPaths,
        });
        ctx.files = gen.files;
        await jobRepo.appendLog(jobId, "info", `Generated ${gen.files.length} file(s)`);
        break;
      }
      case "CREATE_BRANCH": {
        const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
        const safeKey = (ctx.ticket?.key ?? ticketId).replace(/[^a-zA-Z0-9_-]/g, "");
        const branch = `pipeline/${safeKey}-${suffix}`;
        await tools.create_branch(repo, branch);
        ctx.branchName = branch;
        await jobRepo.updateJobFields(jobId, { branchName: branch });
        await jobRepo.appendLog(jobId, "info", `Branch ${branch} created`);
        break;
      }
      case "COMMIT_CODE": {
        if (!ctx.files?.length || !ctx.branchName) throw new Error("missing_files_or_branch");
        await tools.apply_patch(repo, ctx.branchName, ctx.files);
        const tests = await tools.run_tests(repo);
        if (!tests.passed) throw new Error(`tests_failed:${tests.detail}`);
        await jobRepo.appendLog(jobId, "info", "Committed AI patch");
        break;
      }
      case "CREATE_PR": {
        if (!ctx.branchName || !ctx.ticket) throw new Error("missing_branch");
        const title = `${ctx.ticket.key}: ${ctx.ticket.summary}`.slice(0, 240);
        const body = `Automated PR from design-to-code pipeline.\n\nTicket: ${ctx.ticket.key}`;
        const prUrl = await tools.create_pull_request(repo, ctx.branchName, title, body);
        ctx.prUrl = prUrl;
        await jobRepo.updateJobFields(jobId, { prUrl });
        await jobRepo.appendLog(jobId, "info", `Pull request created`);
        break;
      }
      case "DEPLOY": {
        const res = await tools.deploy({ jobId, ticketId, repo, prUrl: ctx.prUrl ?? null });
        await jobRepo.updateJobFields(jobId, { deployStatus: res.detail });
        await jobRepo.appendLog(jobId, "info", `Deploy: ${res.detail}`);
        if (!res.ok) throw new Error("deploy_failed");
        break;
      }
      default:
        break;
    }
    await finishStep(jobId, stage, "DONE");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await finishStep(jobId, stage, "FAILED", msg);
    throw err;
  }
}

async function finishStep(jobId: string, stage: PipelineStage, status: "DONE" | "FAILED", errorMessage?: string): Promise<void> {
  await jobRepo.updateStep(jobId, stage, {
    status,
    endedAt: new Date(),
    errorMessage: errorMessage ?? null,
  });
  await jobRepo.appendLog(jobId, status === "DONE" ? "info" : "error", `Stage ${stage} ${status}`);
  notify(jobId);
}

export function sortSteps<T extends { stepName: string }>(steps: T[]): T[] {
  return [...steps].sort((a, b) => stageOrder(a.stepName) - stageOrder(b.stepName));
}

export function jobSnapshot(job: {
  id: string;
  ticketId: string;
  repo: string;
  status: JobStatus;
  currentStage: string;
  prUrl: string | null;
  deployStatus: string | null;
  branchName: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: unknown;
  steps: { stepName: string; status: string; startedAt: Date | null; endedAt: Date | null; errorMessage: string | null }[];
  logs?: { level: string; message: string; createdAt: Date }[];
}) {
  return {
    ...job,
    logs: job.logs ?? [],
    steps: sortSteps(job.steps),
  };
}
