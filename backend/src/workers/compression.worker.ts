import { Worker } from "bullmq";
import { prisma } from "../config/prisma.js";
import { getRedisConnection } from "../config/redis.js";
import { compressionQueueName, type CompressionQueuePayload } from "../queues/compression.queue.js";
import { cleanupExpiredFiles } from "../services/cleanup.service.js";
import { processCompressionJob } from "../services/compression.service.js";
import { storage } from "../services/storage.service.js";

const connection = getRedisConnection();
if (!connection) {
  console.error("REDIS_URL is required to start the compression worker.");
  process.exit(1);
}

await storage.ensureReady();

const worker = new Worker<CompressionQueuePayload>(
  compressionQueueName,
  async (job) => {
    console.log(`processing compression job ${job.data.jobId}, attempt ${job.attemptsMade + 1}`);
    await processCompressionJob(job.data.jobId);
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job) => {
  console.log(`compression queue job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`compression queue job failed: ${job?.id ?? "unknown"} ${error.message}`);
});

const cleanupInterval = setInterval(() => {
  void cleanupExpiredFiles()
    .then((count) => {
      if (count > 0) console.log(`cleanup removed ${count} expired job(s)`);
    })
    .catch((error) => console.error("cleanup failed", error));
}, 60 * 60 * 1000);
cleanupInterval.unref();

async function shutdown() {
  console.log("shutting down compression worker");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
