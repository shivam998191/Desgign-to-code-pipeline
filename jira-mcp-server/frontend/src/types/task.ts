import type { PipelineStageRow } from './jiraTicket'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Task {
  id: string
  name: string
  status: TaskStatus
  progress: number
  createdAt: string
  updatedAt: string
  /** Raw Firestore pipeline status (e.g. CLOSED). */
  pipelineStatus?: string
  currentStatusDescription?: string
  repository?: string
  prUrl?: string
  stages?: PipelineStageRow[]
  jiraStatus?: string
}
