export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "ROLLED_BACK";

export type StepStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "FAILED" | "SKIPPED";

export type JobStepDoc = {
  id: string;
  stepName: string;
  status: StepStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  errorMessage: string | null;
  attempt: number;
};

export type JobLogDoc = {
  id: string;
  level: string;
  message: string;
  createdAt: Date;
};

export type JobDoc = {
  id: string;
  ticketId: string;
  repo: string;
  status: JobStatus;
  currentStage: string;
  prUrl: string | null;
  deployStatus: string | null;
  branchName: string | null;
  metadata: unknown | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  steps: JobStepDoc[];
  logs: JobLogDoc[];
};

/** API / Prisma-shaped job (camelCase dates as Date for JSON serialization). */
export type JobRow = Omit<JobDoc, "steps" | "logs"> & {
  steps: JobStepDoc[];
  logs: JobLogDoc[];
};
