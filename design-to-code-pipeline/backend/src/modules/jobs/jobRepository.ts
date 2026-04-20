import { randomUUID } from "node:crypto";
import type { UpdateFilter } from "mongodb";
import { getDb } from "../../db/mongo.js";
import type { JobDoc, JobLogDoc, JobRow, JobStatus, JobStepDoc, StepStatus } from "../../db/types.js";
import { PIPELINE_STAGES, type PipelineStage } from "../../shared/pipeline.js";

const COL = "jobs";

type JobMongoDoc = JobDoc & { _id?: unknown };

function stripId(doc: JobMongoDoc & { _id?: unknown }): JobDoc {
  const { _id, ...rest } = doc as JobMongoDoc & { _id?: unknown };
  return rest as JobDoc;
}

function emptyJobDoc(overrides: Partial<JobDoc> & Pick<JobDoc, "id" | "ticketId" | "repo">): JobDoc {
  const now = new Date();
  const steps: JobStepDoc[] = PIPELINE_STAGES.map((name) => ({
    id: randomUUID(),
    stepName: name,
    status: "PENDING" as StepStatus,
    startedAt: null,
    endedAt: null,
    errorMessage: null,
    attempt: 0,
  }));
  return {
    ticketId: overrides.ticketId,
    repo: overrides.repo,
    id: overrides.id,
    status: overrides.status ?? "PENDING",
    currentStage: overrides.currentStage ?? "FETCH_JIRA",
    prUrl: overrides.prUrl ?? null,
    deployStatus: overrides.deployStatus ?? null,
    branchName: overrides.branchName ?? null,
    metadata: overrides.metadata ?? null,
    errorMessage: overrides.errorMessage ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    steps,
    logs: overrides.logs ?? [],
  };
}

function toRow(doc: JobDoc | null): JobRow | null {
  if (!doc) return null;
  return { ...doc };
}

export async function createJobRecord(input: { ticketId: string; repo: string }): Promise<JobRow> {
  const db = await getDb();
  const id = randomUUID();
  const doc = emptyJobDoc({ id, ticketId: input.ticketId, repo: input.repo });
  await db.collection(COL).insertOne(doc);
  return toRow(doc)!;
}

export async function getJob(jobId: string): Promise<JobRow | null> {
  const db = await getDb();
  const raw = await db.collection<JobMongoDoc>(COL).findOne({ id: jobId });
  if (!raw) return null;
  const doc = stripId(raw);
  const logs = [...(doc.logs ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(-500);
  const steps = [...(doc.steps ?? [])].sort((a, b) => a.stepName.localeCompare(b.stepName));
  return toRow({ ...doc, logs, steps });
}

export async function listJobs(take = 50): Promise<JobRow[]> {
  const db = await getDb();
  const cursor = db
    .collection<JobMongoDoc>(COL)
    .find({}, { projection: { logs: 0 } })
    .sort({ createdAt: -1 })
    .limit(take);
  const docs = await cursor.toArray();
  return docs.map((raw) => {
    const d = stripId(raw);
    const steps = [...(d.steps ?? [])].sort((a, b) => a.stepName.localeCompare(b.stepName));
    return toRow({ ...d, steps, logs: [] })!;
  });
}

export async function updateJobFields(
  jobId: string,
  data: Partial<{
    status: JobStatus;
    currentStage: string;
    prUrl: string | null;
    deployStatus: string | null;
    branchName: string | null;
    errorMessage: string | null;
    metadata: unknown | null;
  }>,
): Promise<void> {
  const db = await getDb();
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) $set[k] = v;
  }
  await db.collection(COL).updateOne({ id: jobId }, { $set });
}

export async function updateStep(
  jobId: string,
  stepName: PipelineStage,
  data: Partial<{ status: StepStatus; startedAt: Date | null; endedAt: Date | null; errorMessage: string | null; attempt: number }>,
): Promise<void> {
  const db = await getDb();
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status !== undefined) $set["steps.$[s].status"] = data.status;
  if (data.startedAt !== undefined) $set["steps.$[s].startedAt"] = data.startedAt;
  if (data.endedAt !== undefined) $set["steps.$[s].endedAt"] = data.endedAt;
  if (data.errorMessage !== undefined) $set["steps.$[s].errorMessage"] = data.errorMessage;
  if (data.attempt !== undefined) $set["steps.$[s].attempt"] = data.attempt;
  await db.collection(COL).updateOne({ id: jobId }, { $set }, { arrayFilters: [{ "s.stepName": stepName }] });
}

export async function appendLog(jobId: string, level: string, message: string): Promise<void> {
  const db = await getDb();
  const entry: JobLogDoc = {
    id: randomUUID(),
    level,
    message,
    createdAt: new Date(),
  };
  const update: UpdateFilter<JobMongoDoc> = {
    $push: { logs: { $each: [entry], $slice: -600 } },
    $set: { updatedAt: new Date() },
  };
  await db.collection<JobMongoDoc>(COL).updateOne({ id: jobId }, update);
}

export async function resetJobForRetry(jobId: string): Promise<void> {
  const db = await getDb();
  const steps: JobStepDoc[] = PIPELINE_STAGES.map((name) => ({
    id: randomUUID(),
    stepName: name,
    status: "PENDING" as StepStatus,
    startedAt: null,
    endedAt: null,
    errorMessage: null,
    attempt: 0,
  }));
  await db.collection(COL).updateOne(
    { id: jobId },
    {
      $set: {
        steps,
        status: "PENDING",
        currentStage: "FETCH_JIRA",
        errorMessage: null,
        prUrl: null,
        deployStatus: null,
        branchName: null,
        updatedAt: new Date(),
      },
    },
  );
}
