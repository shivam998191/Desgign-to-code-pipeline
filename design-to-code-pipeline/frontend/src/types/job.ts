export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "ROLLED_BACK";

export type StepStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "FAILED" | "SKIPPED";

export type JobStep = {
  stepName: string;
  status: StepStatus;
  startedAt: string | null;
  endedAt: string | null;
  errorMessage: string | null;
};

export type JobLog = {
  level: string;
  message: string;
  createdAt: string;
};

export type Job = {
  id: string;
  ticketId: string;
  repo: string;
  status: JobStatus;
  currentStage: string;
  prUrl: string | null;
  deployStatus: string | null;
  branchName: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: unknown;
  steps: JobStep[];
  logs: JobLog[];
};
