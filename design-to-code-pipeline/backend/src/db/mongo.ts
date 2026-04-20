import { MongoClient, type Db } from "mongodb";
import { getConfig } from "../config/index.js";
import { createLogger } from "../logger/index.js";

const log = createLogger("mongo");

const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient; mongoDb?: Db };

export function getMongoClient(): MongoClient {
  if (globalForMongo.mongoClient) return globalForMongo.mongoClient;
  const cfg = getConfig();
  const client = new MongoClient(cfg.MONGODB_URI, {
    maxPoolSize: 10,
  });
  globalForMongo.mongoClient = client;
  return client;
}

export async function getDb(): Promise<Db> {
  if (globalForMongo.mongoDb) return globalForMongo.mongoDb;
  const cfg = getConfig();
  const client = getMongoClient();
  await client.connect();
  const db = client.db(cfg.MONGODB_DB_NAME);
  globalForMongo.mongoDb = db;
  await db.collection("jobs").createIndex({ id: 1 }, { unique: true });
  log.info({ dbName: cfg.MONGODB_DB_NAME }, "MongoDB connected");
  return db;
}

export async function connectMongo(): Promise<void> {
  await getDb();
}
