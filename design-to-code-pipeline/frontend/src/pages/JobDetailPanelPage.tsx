import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { StageProgressBar, StageRail } from "../components/job/StageRail";
import { LogPanel } from "../components/job/LogPanel";
import { useJobUpdates, useSubscribeJob } from "../context/PipelineSocket";
import { buildMilestones, formatJobStatus, milestoneProgress } from "../lib/stageDisplay";
import * as api from "../services/api";
import type { Job } from "../types/job";

export function JobDetailPanelPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useSubscribeJob(jobId);

  const load = useCallback(async () => {
    if (!jobId) return;
    setError(null);
    try {
      const data = await api.getJob(jobId);
      setJob(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load job");
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRemote = useCallback(
    (incoming: Job) => {
      if (incoming.id === jobId) setJob(incoming);
    },
    [jobId],
  );
  useJobUpdates(onRemote);

  const milestones = useMemo(() => (job ? buildMilestones(job) : []), [job]);
  const progress = useMemo(() => milestoneProgress(milestones), [milestones]);

  const stepIndexText = useMemo(() => {
    if (!job || milestones.length === 0) return "";
    if (job.status === "COMPLETED") {
      return `Step ${milestones.length} of ${milestones.length}: Pipeline finished`;
    }
    if (job.status === "FAILED" || job.status === "ROLLED_BACK") {
      const failed = milestones.findIndex((m) => m.status === "FAILED");
      const idx = failed >= 0 ? failed + 1 : milestones.length;
      return `Step ${idx} of ${milestones.length}: ${progress.currentLabel}`;
    }
    const active = milestones.findIndex((m) => m.status === "IN_PROGRESS");
    const idx = active >= 0 ? active + 1 : Math.min(progress.completed + 1, milestones.length);
    return `Step ${idx} of ${milestones.length}: ${progress.currentLabel}…`;
  }, [job, milestones, progress]);

  async function onRetry() {
    if (!jobId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.retryJob(jobId);
      if (res.job) setJob(res.job);
      else void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  }

  if (!jobId) {
    return null;
  }

  return (
    <div className="p-6 lg:p-8">
      {error ? (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      {!job ? (
        <div className="text-slate-500">Loading job…</div>
      ) : (
        <>
          <h1 className="text-xl font-semibold tracking-tight text-white lg:text-2xl">
            Job Details: <span className="text-sky-300">{job.ticketId}</span>
          </h1>

          <div className="mt-5 flex flex-wrap gap-x-10 gap-y-2 border-b border-slate-800/80 pb-5 text-sm">
            <div>
              <span className="text-slate-500">Repo: </span>
              <span className="font-mono text-slate-200">{job.repo}</span>
            </div>
            <div>
              <span className="text-slate-500">Status: </span>
              <span className="text-slate-100">{formatJobStatus(job)}</span>
            </div>
            <div>
              <span className="text-slate-500">Job ID: </span>
              <span className="font-mono text-slate-300">{job.id.slice(0, 8)}</span>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800/80 bg-[#0c1018] p-6 shadow-xl shadow-black/20">
            <h2 className="text-sm font-semibold text-slate-400">Current Stage</h2>
            <div className="mt-5">
              <StageRail milestones={milestones} />
              <StageProgressBar fraction={progress.fraction} />
              <p className="mt-3 text-sm text-slate-400">{stepIndexText}</p>
            </div>
          </div>

          <div className="mt-6">
            <LogPanel logs={job.logs} />
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-[#0c1018] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pull Request</div>
              {job.prUrl ? (
                <a href={job.prUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-sky-400 hover:underline">
                  {job.prUrl}
                </a>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No PR yet — pipeline still running or failed before PR.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {job.prUrl ? (
                <a
                  href={job.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
                >
                  View PR
                </a>
              ) : (
                <span className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-500">
                  View PR
                </span>
              )}
              <button
                type="button"
                disabled={busy || job.status === "RUNNING"}
                onClick={() => void onRetry()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
              >
                {busy ? "Retrying" : "Retry"}
              </button>
              <button
                type="button"
                disabled={job.status !== "COMPLETED" || !job.prUrl}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                title="Deploy runs automatically when the pipeline reaches the deploy stage if a webhook is configured."
              >
                Deploy Now
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3 text-sm">
            <span className="font-semibold text-amber-200">Deployment status: </span>
            <span className="text-amber-100/90">
              {job.deployStatus
                ? job.deployStatus
                : job.status === "COMPLETED"
                  ? "No deploy webhook configured, or deploy skipped."
                  : "Pending deployment…"}
            </span>
          </div>

          {job.branchName ? (
            <p className="mt-3 text-xs text-slate-500">
              Branch: <span className="font-mono text-slate-400">{job.branchName}</span>
            </p>
          ) : null}
          {job.errorMessage ? (
            <div className="mt-4 rounded-lg border border-red-900/40 bg-red-950/25 p-3 text-sm text-red-200">{job.errorMessage}</div>
          ) : null}
        </>
      )}
    </div>
  );
}
