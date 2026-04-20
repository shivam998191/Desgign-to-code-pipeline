import { Redis } from "ioredis";
import { getConfig } from "../config/index.js";

export function createRedisConnection(): Redis {
  const cfg = getConfig();
  return new Redis({
    host: cfg.REDIS_HOST,
    port: cfg.REDIS_PORT,
    password: cfg.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
}
