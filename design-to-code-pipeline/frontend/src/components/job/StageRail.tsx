import { Check, Circle } from "lucide-react";
import type { MilestoneState } from "../../lib/stageDisplay";
import type { StepStatus } from "../../types/job";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "DONE") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/60">
        <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 ring-2 ring-red-500/50">
        <Circle className="h-5 w-5 text-red-400" />
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 ring-2 ring-sky-400/70">
        <Circle className="h-5 w-5 text-sky-300" />
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80">
      <Circle className="h-5 w-5 text-slate-600" />
    </span>
  );
}

export function StageRail({ milestones }: { milestones: MilestoneState[] }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {milestones.map((m) => (
          <div key={m.id} className="flex flex-col items-center text-center">
            <StepIcon status={m.status} />
            <div className="mt-2 text-[11px] font-medium leading-tight text-slate-300">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StageProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(fraction * 100);
  return (
    <div className="mt-5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
