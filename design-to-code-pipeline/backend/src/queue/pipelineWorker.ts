import { Worker } from "bullmq";
import { getConfig } from "../config/index.js";
import { createLogger } from "../logger/index.js";
import { runPipeline } from "../modules/orchestrator/orchestrator.js";
import { createRedisConnection } from "./connection.js";

const log = createLogger("pipeline-worker");

const QUEUE_NAME = "design-pipeline";

export function createPipelineWorker(): Worker<{ jobId: string }> | null {
  const cfg = getConfig();
  if (cfg.DISABLE_REDIS) {
    log.warn("DISABLE_REDIS=true — BullMQ worker not started (pipelines run inline)");
    return null;
  }
  const connection = createRedisConnection();
  const worker = new Worker<{ jobId: string }>(
    QUEUE_NAME,
    async (job) => {
      const { jobId } = job.data;
      log.info({ jobId, bullJobId: job.id }, "Processing pipeline job");
      await runPipeline(jobId);
    },
    { connection },
  );
  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.data.jobId, err }, "Worker job failed");
  });
  return worker;
}
