import { Router } from "express";
import { z } from "zod";
import { jobSnapshot } from "../modules/orchestrator/orchestrator.js";
import * as jobRepo from "../modules/jobs/jobRepository.js";
import * as jobService from "../modules/jobs/jobService.js";

export const jobsRouter = Router();

jobsRouter.get("/", async (_req, res, next) => {
  try {
    const jobs = await jobRepo.listJobs(100);
    res.json(jobs.map((j) => jobSnapshot(j)));
  } catch (e) {
    next(e);
  }
});

jobsRouter.get("/:jobId", async (req, res, next) => {
  try {
    const job = await jobRepo.getJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(jobSnapshot(job));
  } catch (e) {
    next(e);
  }
});

const createBody = z.object({
  ticketId: z.string().min(1),
  repo: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
});

jobsRouter.post("/", async (req, res, next) => {
  try {
    const body = createBody.parse(req.body);
    const job = await jobService.createJob(body);
    res.status(201).json({ id: job.id });
  } catch (e) {
    next(e);
  }
});

jobsRouter.post("/:jobId/retry", async (req, res, next) => {
  try {
    const updated = await jobService.retryJob(req.params.jobId);
    res.json({ ok: true, job: updated ? jobSnapshot(updated) : null });
  } catch (e) {
    next(e);
  }
});
