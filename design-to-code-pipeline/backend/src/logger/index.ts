import pino from "pino";
import { getConfig } from "../config/index.js";

export function createLogger(name: string) {
  const cfg = getConfig();
  return pino({
    name,
    level: cfg.NODE_ENV === "production" ? "info" : "debug",
    serializers: {
      err: pino.stdSerializers.err,
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "*.JIRA_API_TOKEN",
        "*.FIGMA_API_TOKEN",
        "*.OPENAI_API_KEY",
        "*.MONGODB_URI",
        "*.BITBUCKET_API_TOKEN",
        "*.BITBUCKET_TOKEN",
      ],
      remove: true,
    },
    transport:
      cfg.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: { colorize: true },
          }
        : undefined,
  });
}

export const rootLogger = createLogger("app");
