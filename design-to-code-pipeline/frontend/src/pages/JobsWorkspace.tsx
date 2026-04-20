import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { SidebarJobCard } from "../components/sidebar/SidebarJobCard";
import { useJobUpdates } from "../context/PipelineSocket";
import * as api from "../services/api";
import type { Job } from "../types/job";

export function JobsWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.listJobs();
      setJobs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useJobUpdates(() => {
    void load();
  });

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-slate-800/80 bg-[#0a0d12]">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Job List</h2>
          <Link
            to="/jobs/new"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow hover:bg-sky-500"
            title="New job"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {error ? (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-200">{error}</div>
          ) : null}
          {jobs.map((job) => (
            <SidebarJobCard key={job.id} job={job} />
          ))}
          {jobs.length === 0 && !error ? (
            <p className="px-1 text-center text-xs text-slate-500">No jobs yet. Create one with +</p>
          ) : null}
        </div>
      </aside>
      <section className="min-w-0 flex-1 overflow-y-auto bg-[#06080c]">
        <Outlet context={{ jobs, reload: load }} />
      </section>
    </div>
  );
}
