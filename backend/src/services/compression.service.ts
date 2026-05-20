import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CompressionLevel, FileType, JobStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { storage } from "./storage.service.js";
import { compressPdf } from "./pdf.service.js";
import { validateFileForCompression } from "./file-validation.service.js";
import { ValidationFailure } from "./validation-error.js";

const qualities: Record<CompressionLevel, number> = { low: 85, medium: 70, high: 55 };

export async function processCompressionJob(jobId: string) {
  const job = await prisma.compressionJob.update({
    where: { id: jobId },
    data: { status: JobStatus.PROCESSING }
  });

  const ext = path.extname(job.originalFileName).toLowerCase() || (job.fileType === FileType.PDF ? ".pdf" : ".bin");
  const inputPath = await storage.getLocalPath(job.originalPath);
  const outputTempPath = storage.resolve("work", `${job.id}${ext}`);

  try {
    await validateFileForCompression(inputPath, job.fileType);
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
      await compressPdf(inputPath, outputTempPath, job.compressionLevel);
    }

    const stat = await fs.stat(outputTempPath);
    const compressedPath = await storage.saveCompressed(outputTempPath, `${job.id}${ext}`);
    await prisma.compressionJob.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED, compressedSize: stat.size, compressedPath, errorMessage: null }
    });
  } catch (error) {
    await fs.rm(outputTempPath, { force: true }).catch(() => undefined);
    await prisma.compressionJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Compression failed"
      }
    });
    if (error instanceof ValidationFailure) return;
    throw error;
  }
}
