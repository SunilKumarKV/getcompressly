import { prisma } from "../config/prisma.js";
import { storage } from "./storage.service.js";

export async function cleanupExpiredFiles() {
  const expired = await prisma.compressionJob.findMany({ where: { expiresAt: { lt: new Date() } } });
  for (const job of expired) {
    await storage.remove(job.originalPath);
    await storage.remove(job.compressedPath);
  }
  if (expired.length > 0) {
    await prisma.compressionJob.deleteMany({ where: { id: { in: expired.map((job) => job.id) } } });
  }
  return expired.length;
}

export function startCleanupScheduler() {
  const interval = setInterval(() => {
    void cleanupExpiredFiles().catch((error) => console.error("cleanup failed", error));
  }, 60 * 60 * 1000);
  interval.unref();
}
