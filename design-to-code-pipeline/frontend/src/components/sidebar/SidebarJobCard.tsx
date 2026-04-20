import { NavLink } from "react-router-dom";
import type { Job } from "../../types/job";
import { jobSummaryLine, formatJobStatus } from "../../lib/stageDisplay";

const badgeClass: Record<Job["status"], string> = {
  PENDING: "bg-slate-600 text-slate-100",
  RUNNING: "bg-emerald-600 text-white",
  COMPLETED: "bg-amber-600 text-white",
  FAILED: "bg-red-600 text-white",
  ROLLED_BACK: "bg-amber-700 text-amber-50",
};

const bracketClass: Record<Job["status"], string> = {
  PENDING: "text-slate-500",
  RUNNING: "text-cyan-400",
  COMPLETED: "text-slate-500",
  FAILED: "text-sky-400",
  ROLLED_BACK: "text-amber-300/90",
};

export function SidebarJobCard({ job }: { job: Job }) {
  const statusLabel = formatJobStatus(job).toUpperCase();
  return (
    <NavLink
      to={`/jobs/${job.id}`}
      className={({ isActive }) =>
        [
          "block rounded-xl border p-3 transition",
          isActive
            ? "border-cyan-500/70 bg-[#141b26] shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
            : "border-slate-800/90 bg-[#10151e] hover:border-slate-700 hover:bg-[#131a24]",
        ].join(" ")
      }
    >
      <div className="font-mono text-sm font-semibold text-white">{job.ticketId}</div>
      <div className="mt-1 line-clamp-2 text-xs leading-snug text-slate-400">{jobSummaryLine(job)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass[job.status]}`}>
          {job.status === "RUNNING"
            ? "STATUS"
            : job.status === "COMPLETED"
              ? "COMPLETED"
              : job.status === "FAILED"
                ? "FAILED"
                : job.status === "ROLLED_BACK"
                  ? "ROLLBACK"
                  : "PENDING"}
        </span>
        <span className={`text-[11px] font-medium ${bracketClass[job.status]}`}>[{statusLabel}]</span>
      </div>
    </NavLink>
  );
}
