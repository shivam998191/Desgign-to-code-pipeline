import mongoose from 'mongoose';

const BuildSchema = new mongoose.Schema(
  {
    params: {
      SERVICE_NAME: { type: String, default: '' },
      REPO_NAME: { type: String, default: '' },
      Branch: { type: String, default: '' },
      Env: { type: String, default: '' },
      build_type: { type: String, default: '' },
      release: { type: String, default: '' },
    },
    JENKINS_BUILD_BASE_URL: { type: String, default: '' },
    JENKINS_BUILD_JOB_PATH: { type: String, default: '' },
    JENKINS_BUILD_USERNAME: { type: String, default: '' },
    JENKINS_BUILD_API_TOKEN: { type: String, default: '' },
    SAMPLE_FILE_URL: { type: String, default: '' },
    requiredParams: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const DeploySchema = new mongoose.Schema(
  {
    params: {
      type: Map,
      of: String,
      default: {},
    },
    JENKINS_DEPLOYMENT_BASE_URL: { type: String, default: '' },
    JENKINS_DEPLOYMENT_JOB_PATH: { type: String, default: '' },
    JENKINS_DEPLOYMENT_USERNAME: { type: String, default: '' },
    JENKINS_DEPLOYMENT_API_TOKEN: { type: String, default: '' },
    SAMPLE_FILE_URL: { type: String, default: '' },
    requiredParams: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const RepoConfigSchema = new mongoose.Schema(
  {
    build: BuildSchema,
    deploy: DeploySchema,
  },
  {
    _id: false,
    strict: false,
  },
);

const JiraEnvSchema = new mongoose.Schema(
  {
    JIRA_DOMAIN: { type: String, default: '' },
    JIRA_EMAIL: { type: String, default: '' },
    JIRA_API_TOKEN: { type: String, default: '' },
    GOOGLE_CLIENT_ID: { type: String, default: '' },
    GOOGLE_CLIENT_SECRET: { type: String, default: '' },
    GOOGLE_REFRESH_TOKEN: { type: String, default: '' },
    BITBUCKET_USERNAME: { type: String, default: '' },
    BITBUCKET_API_TOKEN: { type: String, default: '' },
    BITBUCKET_WORKSPACE: { type: String, default: '' },
    BITBUCKET_REPO: { type: String, default: 'ump2-ui' },
    JIRA_TLS_INSECURE: { type: String, default: 'true' },
  },
  { _id: false },
);

const McpServerSchema = new mongoose.Schema(
  {
    jira: {
      env: JiraEnvSchema,
      reposConfig: {
        type: Map,
        of: RepoConfigSchema,
        default: {},
      },
    },
    user_email: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const UserConfigModel = mongoose.models.UserConfig || mongoose.model('UserConfig', McpServerSchema);
