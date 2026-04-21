import { PIPELINE_STEPS, pipelineStepLabel } from '../lib/pipeline'
import type { Task } from '../types/task'
import { useTaskLogs } from '../hooks/useTaskLogs'
import { useTaskDashboardStore } from '../hooks/useTaskDashboardStore'
import { LogsViewer } from './LogsViewer'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'

function repoSlugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug || 'app-repo'
}

export function TaskDetailsPanel({ task }: { task: Task | null }) {
  if (!task) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Select a job to inspect pipeline progress, logs, and deployment status.
      </section>
    )
  }

  return <TaskDetailsBody task={task} />
}

function TaskDetailsBody({ task }: { task: Task }) {
  const { lines, loading, error } = useTaskLogs(task)
  const retryTask = useTaskDashboardStore((s) => s.retryTask)

  const repo = repoSlugFromName(task.name)
  const prUrl =
    task.status === 'completed'
      ? `https://github.com/org/${repo}/pull/${Math.abs(hash(task.id) % 9000) + 1000}`
      : null

  const stepIndex = (() => {
    const n = PIPELINE_STEPS.length
    if (task.status === 'completed') return n
    if (task.status === 'failed') return Math.min(n, Math.max(1, Math.ceil((task.progress / 100) * n)))
    return Math.min(n, Math.max(1, Math.ceil((task.progress / 100) * n)))
  })()

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="shrink-0 space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-[#002E7E]">
          Job details — <span className="font-mono font-semibold text-[#00BAF2]">{task.id}</span>
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
          <p>
            <span className="text-slate-500">Repo:</span>{' '}
            <span className="font-mono font-medium text-slate-800">{repo}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-slate-500">Status:</span> <StatusBadge status={task.status} />
          </p>
          <p>
            <span className="text-slate-500">Job ID:</span>{' '}
            <span className="font-mono font-medium text-slate-800">{shortId(task.id)}</span>
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <div className="rounded-xl border border-slate-200 bg-[#F5F7F9] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#002E7E]">Current stage</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {PIPELINE_STEPS.map((label, idx) => {
              const done = task.status === 'completed' || idx < stepIndex - 1
              const current = task.status !== 'completed' && idx === stepIndex - 1
              return (
                <li key={label} className="flex items-center gap-2 text-sm text-slate-800">
                  <span
                    className={[
                      'inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]',
                      done
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : current
                          ? 'border-[#00BAF2] bg-sky-50 text-[#002E7E]'
                          : 'border-slate-200 bg-white text-slate-400',
                    ].join(' ')}
                    aria-hidden
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className={done || current ? 'font-medium' : 'text-slate-500'}>{label}</span>
                </li>
              )
            })}
          </ol>
          <div className="mt-4">
            <ProgressBar value={task.progress} />
            <p className="mt-2 text-sm text-slate-700">
              {pipelineStepLabel(task.progress, task.status)}
            </p>
          </div>
        </div>

        <LogsViewer lines={lines} loading={loading} error={error} />

        <div className="rounded-xl border border-slate-200 bg-[#F5F7F9] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#002E7E]">Pull request</p>
          {prUrl ? (
            <>
              <p className="mt-2 break-all font-mono text-xs font-medium text-[#00BAF2]">{prUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#002E7E] shadow-sm hover:bg-slate-50"
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View PR
                </a>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  onClick={() => {
                    alert('Re-sync will call the MCP server when the backend exposes it.')
                  }}
                >
                  Re-sync
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                  onClick={() => {
                    alert('Deploy Now will trigger your deployment pipeline (mock).')
                  }}
                >
                  Deploy Now
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#00BAF2] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00a8d9]"
                  onClick={() => {
                    void navigator.clipboard.writeText(prUrl)
                  }}
                >
                  Copy link
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">PR link appears when the job completes.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <p>
            <span className="text-slate-500">Deployment status:</span>{' '}
            <span className="font-semibold text-[#002E7E]">
              {task.status === 'completed'
                ? 'Deployed'
                : task.status === 'failed'
                  ? 'Failed'
                  : 'Pending deployment…'}
            </span>
          </p>
          {task.status === 'failed' ? (
            <button
              type="button"
              className="rounded-lg bg-[#00BAF2] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00a8d9]"
              onClick={() => void retryTask(task.id)}
            >
              Retry (mock)
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function shortId(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '')
  return compact.slice(0, 10) || id.slice(0, 10)
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
