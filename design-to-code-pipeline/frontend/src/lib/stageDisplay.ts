import type { Job, JobStep, StepStatus } from "../types/job";

/** Milestone labels aligned with the product mockup (maps internal steps). */
export const DISPLAY_MILESTONES = [
  {
    id: "m1",
    label: "Fetch Jira Ticket",
    stepNames: ["FETCH_JIRA", "PARSE_REQUIREMENTS"] as const,
  },
  {
    id: "m2",
    label: "Extract Figma Design",
    stepNames: ["FETCH_FIGMA"] as const,
  },
  {
    id: "m3",
    label: "Generate Code",
    stepNames: ["ANALYZE", "GENERATE_CODE"] as const,
  },
  {
    id: "m4",
    label: "Create Pull Request",
    stepNames: ["CREATE_BRANCH", "COMMIT_CODE", "CREATE_PR"] as const,
  },
  {
    id: "m5",
    label: "Deploy Changes",
    stepNames: ["DEPLOY"] as const,
  },
] as const;

function stepMap(steps: JobStep[]): Map<string, StepStatus> {
  return new Map(steps.map((s) => [s.stepName, s.status as StepStatus]));
}

function aggregateStatus(statuses: StepStatus[]): StepStatus {
  if (statuses.some((s) => s === "FAILED")) return "FAILED";
  if (statuses.some((s) => s === "IN_PROGRESS")) return "IN_PROGRESS";
  if (statuses.every((s) => s === "DONE" || s === "SKIPPED")) return "DONE";
  if (statuses.some((s) => s === "DONE")) return "IN_PROGRESS";
  return "PENDING";
}

export type MilestoneState = {
  id: string;
  label: string;
  status: StepStatus;
};

export function buildMilestones(job: Job): MilestoneState[] {
  const map = stepMap(job.steps);
  return DISPLAY_MILESTONES.map((m) => {
    const statuses = m.stepNames.map((name) => map.get(name) ?? "PENDING");
    return { id: m.id, label: m.label, status: aggregateStatus(statuses) };
  });
}

export function milestoneProgress(milestones: MilestoneState[]): {
  completed: number;
  total: number;
  fraction: number;
  currentLabel: string;
} {
  const total = milestones.length;
  const doneCount = milestones.filter((m) => m.status === "DONE").length;
  const inProgressIdx = milestones.findIndex((m) => m.status === "IN_PROGRESS");
  const failedIdx = milestones.findIndex((m) => m.status === "FAILED");
  const current =
    failedIdx >= 0
      ? milestones[failedIdx]?.label ?? milestones[doneCount]?.label ?? milestones[0]?.label ?? ""
      : inProgressIdx >= 0
        ? milestones[inProgressIdx]?.label ?? ""
        : doneCount < total
          ? milestones[doneCount]?.label ?? ""
          : milestones[total - 1]?.label ?? "";
  const activeIndex = failedIdx >= 0 ? failedIdx : inProgressIdx >= 0 ? inProgressIdx : Math.min(doneCount, total - 1);
  const fraction = total === 0 ? 0 : (activeIndex + (milestones[activeIndex]?.status === "DONE" ? 1 : 0.35)) / total;
  return {
    completed: doneCount,
    total,
    fraction: Math.min(1, Math.max(0, fraction)),
    currentLabel: current,
  };
}

export function jobSummaryLine(job: Job): string {
  const meta = job.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta) && "plan" in meta) {
    const plan = (meta as { plan?: unknown }).plan;
    if (typeof plan === "string") {
      const line = plan.split("\n").find((l) => l.trim().length > 0);
      if (line) return line.trim().slice(0, 72);
    }
  }
  return "Automated pipeline run";
}

export function formatJobStatus(job: Job): string {
  switch (job.status) {
    case "RUNNING":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "ROLLED_BACK":
      return "Rolled Back";
    default:
      return "Pending";
  }
}
