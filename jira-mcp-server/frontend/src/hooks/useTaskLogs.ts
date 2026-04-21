import { useEffect, useState } from 'react'
import { getTaskService } from '../services/taskService'
import type { Task } from '../types/task'

/**
 * Polls `getTaskLogs` while a task is active — mirrors a future WebSocket log stream
 * without extending the `TaskAPI` contract yet.
 */
export function useTaskLogs(task: Task | null): {
  lines: string[]
  loading: boolean
  error: string | null
} {
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taskId = task?.id ?? null
  const taskStatus = task?.status ?? null

  const active =
    taskStatus === 'pending' || taskStatus === 'running' || taskStatus === 'failed'

  useEffect(() => {
    if (!taskId) {
      const handle = window.requestAnimationFrame(() => {
        setLines([])
        setError(null)
      })
      return () => window.cancelAnimationFrame(handle)
    }

    let cancelled = false

    const pull = async (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true)
        setError(null)
      }
      try {
        const next = await getTaskService().getTaskLogs(taskId)
        if (!cancelled) setLines(next)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load logs.')
        }
      } finally {
        if (!cancelled && showSpinner) setLoading(false)
      }
    }

    void pull(true)

    if (!active) {
      return () => {
        cancelled = true
      }
    }

    const intervalId = window.setInterval(() => {
      void pull(false)
    }, 900)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [taskId, taskStatus, active])

  return { lines, loading, error }
}
