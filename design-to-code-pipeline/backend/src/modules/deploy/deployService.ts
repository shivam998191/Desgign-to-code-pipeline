import axios from "axios";
import { getConfig } from "../../config/index.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("deploy");

export async function deploy(env: { jobId: string; ticketId: string; repo: string; prUrl?: string | null }): Promise<{
  ok: boolean;
  detail: string;
}> {
  const cfg = getConfig();
  if (!cfg.DEPLOY_WEBHOOK_URL) {
    return { ok: true, detail: "skipped_no_webhook" };
  }
  try {
    await axios.post(
      cfg.DEPLOY_WEBHOOK_URL,
      {
        env: "staging",
        jobId: env.jobId,
        ticketId: env.ticketId,
        repo: env.repo,
        prUrl: env.prUrl ?? null,
      },
      { timeout: 15_000, headers: { "Content-Type": "application/json" } },
    );
    return { ok: true, detail: "webhook_invoked" };
  } catch (e) {
    log.error({ err: e }, "Deploy webhook failed");
    return { ok: false, detail: "webhook_failed" };
  }
}

export async function rollbackDeploy(env: { jobId: string; ticketId: string }): Promise<{ ok: boolean; detail: string }> {
  const cfg = getConfig();
  if (!cfg.DEPLOY_WEBHOOK_URL) {
    return { ok: true, detail: "skipped_no_webhook" };
  }
  try {
    await axios.post(
      cfg.DEPLOY_WEBHOOK_URL,
      {
        action: "rollback",
        jobId: env.jobId,
        ticketId: env.ticketId,
      },
      { timeout: 15_000, headers: { "Content-Type": "application/json" } },
    );
    return { ok: true, detail: "rollback_webhook_invoked" };
  } catch (e) {
    log.error({ err: e }, "Rollback webhook failed");
    return { ok: false, detail: "rollback_webhook_failed" };
  }
}
