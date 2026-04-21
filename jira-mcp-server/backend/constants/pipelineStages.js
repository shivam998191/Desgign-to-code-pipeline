/** Ordered pipeline stages persisted on each Jira ticket job (MCP tools drive transitions). */
export const PIPELINE_STAGE_DEFS = [
  { id: 'FETCH_JIRA', label: 'Fetch Jira Ticket' },
  { id: 'ANALYZE_JIRA', label: 'Analyze Jira Info' },
  { id: 'DEVELOPMENT', label: 'Development' },
  { id: 'COMMIT', label: 'Commit' },
  { id: 'RAISE_PR', label: 'Raise PR' },
  { id: 'MERGED_PR', label: 'Merged PR' },
  { id: 'BUILD', label: 'Build' },
  { id: 'DEPLOY', label: 'Deploy' },
];

export const PIPELINE_STAGE_IDS = PIPELINE_STAGE_DEFS.map((s) => s.id);

export const DEFAULT_USER_DOC_ID = 'default-pipeline-user';

export const DEFAULT_USER_EMAIL = 'radheshyam1.kumar@paytmpayments.com';
