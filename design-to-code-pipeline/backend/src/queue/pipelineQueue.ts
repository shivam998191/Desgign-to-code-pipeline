import { Queue } from "bullmq";
import { getConfig } from "../config/index.js";
import { createRedisConnection } from "./connection.js";

const QUEUE_NAME = "design-pipeline";

let queue: Queue<{ jobId: string }> | null = null;

export function getPipelineQueue(): Queue<{ jobId: string }> {
  if (queue) return queue;
  const connection = createRedisConnection();
  queue = new Queue<{ jobId: string }>(QUEUE_NAME, { connection });
  return queue;
}

export async function enqueuePipelineJob(jobId: string): Promise<void> {
  const cfg = getConfig();
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
