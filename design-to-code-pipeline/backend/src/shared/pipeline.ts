export const PIPELINE_STAGES = [
  "FETCH_JIRA",
  "PARSE_REQUIREMENTS",
  "FETCH_FIGMA",
  "ANALYZE",
  "GENERATE_CODE",
  "CREATE_BRANCH",
  "COMMIT_CODE",
  "CREATE_PR",
  "DEPLOY",
  "ROLLBACK",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(value);
}
