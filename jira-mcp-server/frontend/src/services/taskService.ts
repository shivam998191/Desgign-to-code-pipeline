import type { TaskAPI } from '../types/taskApi'
import { MockTaskService } from '../mocks/mockTaskService'

/**
 * Single composition root for task data access.
 * Replace `MockTaskService` with an HTTP/WebSocket client that implements `TaskAPI`.
 */
let singleton: MockTaskService | null = null

export function getTaskService(): TaskAPI {
  if (!singleton) singleton = new MockTaskService()
  return singleton
}

/** Mock-only helper until `TaskAPI` gains a first-class retry operation. */
export async function retryFailedTask(id: string): Promise<void> {
  const svc = getTaskServiceInternal()
  await svc.retryFailedTask(id)
}

/** Toggle for UI demos of list error handling. */
export function setFailNextTaskListFetch(shouldFail: boolean): void {
  getTaskServiceInternal().failNextList = shouldFail
}

function getTaskServiceInternal(): MockTaskService {
  if (!singleton) singleton = new MockTaskService()
  return singleton
}
