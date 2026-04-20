import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { getConfig } from "./config/index.js";
import { connectMongo } from "./db/mongo.js";
import { jobsRouter } from "./http/jobsRouter.js";
import { rootLogger } from "./logger/index.js";
import { jobSnapshot } from "./modules/orchestrator/orchestrator.js";
import * as jobRepo from "./modules/jobs/jobRepository.js";
import { registerJobRealtime } from "./modules/realtime/bus.js";
import { createPipelineWorker } from "./queue/pipelineWorker.js";

const cfg = getConfig();
const app = express();
app.use(cors({ origin: cfg.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/jobs", jobsRouter);

const errorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  rootLogger.error({ err }, "HTTP error");
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(400).json({ error: err instanceof Error ? err.message : "error" });
};
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: cfg.FRONTEND_ORIGIN, methods: ["GET", "POST"] },
});

registerJobRealtime(async (jobId) => {
  const job = await jobRepo.getJob(jobId);
  if (!job) return;
  const payload = jobSnapshot(job);
  io.emit("job-update", payload);
  io.to(`job:${jobId}`).emit("job-update", payload);
});

io.on("connection", (socket) => {
  socket.on("subscribe-job", (jobId: string) => {
    if (typeof jobId !== "string" || !jobId) return;
    void socket.join(`job:${jobId}`);
  });
});

void (async () => {
  try {
    await connectMongo();
  } catch (err) {
    rootLogger.error({ err }, "MongoDB connection failed");
    process.exit(1);
  }
  const worker = createPipelineWorker();
  if (worker) {
    rootLogger.info("BullMQ worker started (Redis)");
  } else {
    rootLogger.warn("Pipeline queue: inline mode — set DISABLE_REDIS=false and run Redis for production-style queuing");
  }
  server.listen(cfg.PORT, () => {
    rootLogger.info({ port: cfg.PORT }, "API and WebSocket listening");
  });
})();
