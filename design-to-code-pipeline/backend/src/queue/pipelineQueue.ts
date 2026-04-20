import { Queue } from "bullmq";
import { getConfig } from "../config/index.js";
import { createLogger } from "../logger/index.js";
import { runPipeline } from "../modules/orchestrator/orchestrator.js";
import { createRedisConnection } from "./connection.js";

const log = createLogger("pipeline-queue");

const QUEUE_NAME = "design-pipeline";

let queue: Queue<{ jobId: string }> | null = null;

export function getPipelineQueue(): Queue<{ jobId: string }> {
  const cfg = getConfig();
  if (cfg.DISABLE_REDIS) {
    throw new Error("Redis queue is disabled (DISABLE_REDIS=true)");
  }
  if (queue) return queue;
  const connection = createRedisConnection();
  queue = new Queue<{ jobId: string }>(QUEUE_NAME, { connection });
  return queue;
}

export async function enqueuePipelineJob(jobId: string): Promise<void> {
  const cfg = getConfig();
  if (cfg.DISABLE_REDIS) {
    log.info({ jobId }, "Running pipeline inline (DISABLE_REDIS=true)");
    void runPipeline(jobId).catch((err) => {
      log.error({ jobId, err }, "Inline pipeline failed");
    });
    return;
  }
  const q = getPipelineQueue();
  await q.add(
    "run",
    { jobId },
    {
      attempts: cfg.PIPELINE_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}
