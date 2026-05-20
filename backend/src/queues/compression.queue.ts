import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";

export const compressionQueueName = "compression";

export interface CompressionQueuePayload {
  jobId: string;
}

let queue: Queue<CompressionQueuePayload> | null = null;

export function getCompressionQueue() {
  const connection = getRedisConnection();
  if (!connection) throw new AppError("Compression queue is unavailable. Configure REDIS_URL and start Redis.", 503, "QUEUE_UNAVAILABLE");
  queue ??= new Queue<CompressionQueuePayload>(compressionQueueName, { connection });
  return queue;
}

export async function enqueueCompressionJob(jobId: string, priority = 5) {
  const queue = getCompressionQueue();
  await queue.add(
    "compress-file",
    { jobId },
    {
      jobId,
      priority,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 5000 }
    }
  );
}
