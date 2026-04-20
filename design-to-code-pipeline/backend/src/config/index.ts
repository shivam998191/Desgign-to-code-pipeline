import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

if (!process.env.BITBUCKET_API_TOKEN && process.env.BITBUCKET_TOKEN) {
  process.env.BITBUCKET_API_TOKEN = process.env.BITBUCKET_TOKEN;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  /** When true, jobs are kept in process memory only (no MONGODB_URI needed; data is lost on restart). */
  DISABLE_MONGODB: z
    .union([z.string(), z.undefined()])
    .transform((v) => {
      if (v === undefined || v === "") return false;
      const s = v.toLowerCase();
      return s === "true" || s === "1" || s === "yes";
    }),
  MONGODB_URI: z.string().default("").describe("MongoDB connection string; not used when DISABLE_MONGODB=true"),
  MONGODB_DB_NAME: z.string().min(1).default("design_pipeline"),
  /** When true, jobs run in-process (no Redis/BullMQ). For local testing only. */
  DISABLE_REDIS: z
    .union([z.string(), z.undefined()])
    .transform((v) => {
      if (v === undefined || v === "") return false;
      const s = v.toLowerCase();
      return s === "true" || s === "1" || s === "yes";
    }),
  REDIS_HOST: z.string().min(1).default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JIRA_BASE_URL: z
    .string()
    .url()
    .describe("Jira Cloud site root only, e.g. https://paytmpayments.atlassian.net (not a /browse/... issue URL)"),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  JIRA_TLS_INSECURE: z
    .union([z.string(), z.undefined()])
    .transform((v) => {
      if (v === undefined || v === "") return false;
      const s = v.toLowerCase();
      return s === "true" || s === "1" || s === "yes";
    }),
  FIGMA_API_TOKEN: z.string().min(1),
  BITBUCKET_USERNAME: z.string().min(1).describe("Atlassian / Bitbucket username (usually email)"),
  BITBUCKET_API_TOKEN: z.string().min(1).describe("Bitbucket app password or API token with repo write"),
  BITBUCKET_DEFAULT_BRANCH: z.string().min(1).default("develop"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  DEPLOY_WEBHOOK_URL: z.string().url().optional(),
  PIPELINE_MAX_ATTEMPTS: z.coerce.number().min(1).max(10).default(1),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  const data = parsed.data;
  if (!data.DISABLE_MONGODB && !data.MONGODB_URI.trim()) {
    throw new Error("Invalid environment: MONGODB_URI is required unless DISABLE_MONGODB=true");
  }
  cached = data;
  return cached;
}
