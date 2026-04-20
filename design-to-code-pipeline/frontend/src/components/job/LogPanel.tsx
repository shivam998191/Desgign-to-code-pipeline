import type { JobLog } from "../../types/job";

export function LogPanel({ logs }: { logs: JobLog[] }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0b0e14]">
      <div className="border-b border-slate-800/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Activity Logs</h3>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-4 font-mono text-xs leading-relaxed text-slate-300">
        {logs.length === 0 ? <div className="text-slate-500">No activity yet.</div> : null}
        {logs.map((log, idx) => (
          <div key={`${log.createdAt}-${idx}`} className="border-b border-slate-800/40 py-2 last:border-0">
            <span className="text-slate-500">
              {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.
            </span>{" "}
            <span
              className={
                log.level === "error" ? "text-red-300" : log.level === "warn" ? "text-amber-200/90" : "text-slate-200"
              }
            >
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
