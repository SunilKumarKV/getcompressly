import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CompressionLevel, FileType, JobStatus, PlanType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { storage } from "./storage.service.js";
import { compressPdf } from "./pdf.service.js";
import { validateFileForCompression } from "./file-validation.service.js";
import { ValidationFailure } from "./validation-error.js";
import { recordJobFailure, recordJobSuccess } from "./usage-metrics.service.js";
import { sendDownloadReadyEmail } from "./email.service.js";

const qualities: Record<CompressionLevel, number> = { low: 85, medium: 70, high: 55 };

type ProgressReporter = (percentage: number, stage: string) => Promise<void>;

async function setProgress(jobId: string, percentage: number, stage: string, report?: ProgressReporter) {
  await prisma.compressionJob.update({ where: { id: jobId }, data: { progress: percentage, stage } });
  await report?.(percentage, stage);
}

export async function processCompressionJob(jobId: string, report?: ProgressReporter) {
  const job = await prisma.compressionJob.update({
    where: { id: jobId },
    data: { status: JobStatus.PROCESSING, progress: 5, stage: "validating" },
    include: { user: true }
  });
  if (job.canceledAt) return;

  const ext = path.extname(job.originalFileName).toLowerCase() || (job.fileType === FileType.PDF ? ".pdf" : ".bin");
  const inputPath = await storage.getLocalPath(job.originalPath);
  const outputTempPath = storage.resolve("work", `${job.id}${ext}`);

  try {
    await setProgress(jobId, 15, "validating", report);
    const pro = job.user?.plan === PlanType.PRO || job.user?.plan === PlanType.PRO_MONTHLY || job.user?.plan === PlanType.PRO_YEARLY;
    await validateFileForCompression(inputPath, job.fileType, pro ? env.MAX_PDF_PAGES * 2 : env.MAX_PDF_PAGES);
    await setProgress(jobId, 30, "processing", report);
    if (job.fileType === FileType.IMAGE) {
      const pipeline = sharp(inputPath, { failOn: "warning" });
      if (job.originalMimeType === "image/png") {
        await pipeline.png({ quality: qualities[job.compressionLevel], compressionLevel: 9 }).toFile(outputTempPath);
      } else if (job.originalMimeType === "image/webp") {
        await pipeline.webp({ quality: qualities[job.compressionLevel] }).toFile(outputTempPath);
      } else {
        await pipeline.jpeg({ quality: qualities[job.compressionLevel], mozjpeg: true }).toFile(outputTempPath);
      }
    } else {
      await setProgress(jobId, 45, "compressing", report);
      await compressPdf(inputPath, outputTempPath, job.compressionLevel);
    }

    await setProgress(jobId, 80, "uploading", report);
    const stat = await fs.stat(outputTempPath);
    const compressedPath = await storage.saveCompressed(outputTempPath, `${job.id}${ext}`);
    await prisma.compressionJob.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED, compressedSize: stat.size, compressedPath, errorMessage: null, progress: 100, stage: "completed" }
    });
    await recordJobSuccess(job.userId, job.originalSize, stat.size);
    if (job.user) void sendDownloadReadyEmail(job.user.email, job.originalFileName).catch((error) => console.error("download ready email failed", error));
  } catch (error) {
    await fs.rm(outputTempPath, { force: true }).catch(() => undefined);
    await prisma.compressionJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        progress: 100,
        stage: "failed",
        retryable: !(error instanceof ValidationFailure),
        errorMessage: error instanceof Error ? error.message : "Compression failed"
      }
    });
    await recordJobFailure(job.userId);
    if (error instanceof ValidationFailure) return;
    throw error;
  }
}
