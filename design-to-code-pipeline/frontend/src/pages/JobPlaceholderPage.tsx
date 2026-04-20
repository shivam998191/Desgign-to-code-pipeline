import { Link } from "react-router-dom";
import { GitBranch } from "lucide-react";

export function JobPlaceholderPage() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <GitBranch className="h-8 w-8 text-slate-500" />
      </div>
      <h2 className="text-lg font-semibold text-white">Select a job</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">Choose a ticket from the list to see live pipeline progress, logs, and PR status.</p>
      <Link
        to="/jobs/new"
        className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Start new pipeline
      </Link>
    </div>
  );
}
