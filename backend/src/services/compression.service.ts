import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CompressionLevel, FileType, JobStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { storage } from "./storage.service.js";
import { compressPdf } from "./pdf.service.js";

const qualities: Record<CompressionLevel, number> = { low: 85, medium: 70, high: 55 };

export async function processCompressionJob(jobId: string) {
  const job = await prisma.compressionJob.update({
    where: { id: jobId },
    data: { status: JobStatus.PROCESSING }
  });

  const ext = path.extname(job.originalFileName).toLowerCase() || (job.fileType === FileType.PDF ? ".pdf" : ".bin");
  const outputPath = storage.resolve("compressed", `${job.id}${ext}`);

  try {
    if (job.fileType === FileType.IMAGE) {
      const pipeline = sharp(job.originalPath, { failOn: "warning" });
      if (job.originalMimeType === "image/png") {
        await pipeline.png({ quality: qualities[job.compressionLevel], compressionLevel: 9 }).toFile(outputPath);
      } else if (job.originalMimeType === "image/webp") {
        await pipeline.webp({ quality: qualities[job.compressionLevel] }).toFile(outputPath);
      } else {
        await pipeline.jpeg({ quality: qualities[job.compressionLevel], mozjpeg: true }).toFile(outputPath);
      }
    } else {
      await compressPdf(job.originalPath, outputPath, job.compressionLevel);
    }

    const stat = await fs.stat(outputPath);
    await prisma.compressionJob.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED, compressedSize: stat.size, compressedPath: outputPath, errorMessage: null }
    });
  } catch (error) {
    await storage.remove(outputPath);
    await prisma.compressionJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Compression failed"
      }
    });
  }
}
