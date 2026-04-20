import { CircleHelp, History, Settings } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-slate-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#0c1018] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-lg shadow-sky-900/40">
            X
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">AI DevOps Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/80"
          >
            <History className="h-4 w-4 text-slate-400" />
            Job History
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/80"
            title="Settings coming soon"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Settings
          </button>
          <button
            type="button"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white"
            title="Help"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
