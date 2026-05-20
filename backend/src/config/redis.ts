import { Redis } from "ioredis";
import { env } from "./env.js";

let redis: Redis | null = null;

export function getRedisConnection() {
  if (!env.REDIS_URL) return null;
  redis ??= new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
  return redis;
}

export async function checkRedisReady() {
  const connection = getRedisConnection();
  if (!connection) return { enabled: false };
  await connection.ping();
  return { enabled: true };
}
