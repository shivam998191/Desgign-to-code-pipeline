import { enqueuePipelineJob } from "../../queue/pipelineQueue.js";
import * as jobRepo from "./jobRepository.js";

export async function createJob(input: { ticketId: string; repo: string }) {
  const job = await jobRepo.createJobRecord(input);
  await jobRepo.appendLog(job.id, "info", "Job queued");
  await enqueuePipelineJob(job.id);
  return job;
}

export async function retryJob(jobId: string) {
  const job = await jobRepo.getJob(jobId);
  if (!job) throw new Error("job_not_found");
  if (job.status === "RUNNING") throw new Error("job_running");
  await jobRepo.resetJobForRetry(jobId);
  await jobRepo.appendLog(jobId, "info", "Manual retry requested");
  await enqueuePipelineJob(jobId);
  return jobRepo.getJob(jobId);
}
