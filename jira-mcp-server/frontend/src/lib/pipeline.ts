export const PIPELINE_STEPS = [
  'Fetch Jira Ticket',
  'Extract Figma Design',
  'Generate Code',
  'Create Pull Request',
  'Deploy Changes',
  'Post-deploy verification',
] as const

export function pipelineStepLabel(progress: number, status: 'failed' | 'completed' | string): string {
  const n = PIPELINE_STEPS.length
  if (status === 'completed') return `Step ${n} of ${n}: ${PIPELINE_STEPS[n - 1]}`
  if (status === 'failed') return 'Pipeline stopped due to an error.'
  const step = Math.min(n, Math.max(1, Math.ceil((progress / 100) * n)))
  return `Step ${step} of ${n}: ${PIPELINE_STEPS[step - 1]}`
}
