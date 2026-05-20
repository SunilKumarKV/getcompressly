import fs from "node:fs/promises";
import { Router } from "express";
import { CompressionLevel, FileType, JobStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { enforceCompressionLimits } from "../middleware/limits.js";
import { upload, validateUploadedFiles } from "../middleware/upload.js";
import { processCompressionJob } from "../services/compression.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { compressionPercentage, makeDownloadToken } from "../utils/files.js";

const router = Router();
const schema = z.object({ compressionLevel: z.nativeEnum(CompressionLevel).default(CompressionLevel.medium) });

function jobDto(job: {
  id: string;
  originalFileName: string;
  originalMimeType: string;
  originalSize: number;
  compressedSize: number | null;
  compressionLevel: CompressionLevel;
  fileType: FileType;
  status: JobStatus;
  errorMessage: string | null;
  downloadToken: string;
  expiresAt: Date;
  createdAt: Date;
}) {
  return {
    id: job.id,
    originalFileName: job.originalFileName,
    originalMimeType: job.originalMimeType,
    originalSize: job.originalSize,
    compressedSize: job.compressedSize,
    compressionLevel: job.compressionLevel,
    fileType: job.fileType,
    status: job.status,
    errorMessage: job.errorMessage,
    downloadToken: job.status === JobStatus.COMPLETED ? job.downloadToken : undefined,
    expiresAt: job.expiresAt,
    createdAt: job.createdAt,
    compressionPercentage: compressionPercentage(job.originalSize, job.compressedSize)
  };
}

router.post(
  "/",
  optionalAuth,
  upload.array("files", 20),
  validateUploadedFiles,
  enforceCompressionLimits,
  asyncHandler(async (req, res) => {
    const { compressionLevel } = schema.parse(req.body);
    const files = req.files as Express.Multer.File[];
    const expiresAt = new Date(Date.now() + env.TEMP_FILE_EXPIRY_HOURS * 60 * 60 * 1000);
    const jobs = [];

    for (const file of files) {
      const fileType = file.mimetype === "application/pdf" ? FileType.PDF : FileType.IMAGE;
      const job = await prisma.compressionJob.create({
        data: {
          userId: req.user?.id,
          originalFileName: file.originalname,
          originalMimeType: file.mimetype,
          originalSize: file.size,
          compressionLevel,
          fileType,
          status: JobStatus.PENDING,
          originalPath: file.path,
          downloadToken: makeDownloadToken(),
          expiresAt
        }
      });
      await prisma.usageLog.create({
        data: { userId: req.user?.id, ipAddress: req.ip ?? "unknown", action: "compress", fileSize: file.size }
      });
      await processCompressionJob(job.id);
      jobs.push(await prisma.compressionJob.findUniqueOrThrow({ where: { id: job.id } }));
    }

    res.status(201).json({ jobs: jobs.map(jobDto) });
  })
);

router.get(
  "/jobs",
  requireAuth,
  asyncHandler(async (req, res) => {
    const jobs = await prisma.compressionJob.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json({ jobs: jobs.map(jobDto) });
  })
);

router.get(
  "/jobs/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.compressionJob.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!job) throw new AppError("Compression job not found", 404, "JOB_NOT_FOUND");
    res.json({ job: jobDto(job) });
  })
);

router.get(
  "/download/:token",
  asyncHandler(async (req, res) => {
    const job = await prisma.compressionJob.findUnique({ where: { downloadToken: req.params.token } });
    if (!job || job.status !== JobStatus.COMPLETED || !job.compressedPath) {
      throw new AppError("Download is unavailable", 404, "DOWNLOAD_NOT_FOUND");
    }
    if (job.expiresAt < new Date()) throw new AppError("Download has expired", 410, "DOWNLOAD_EXPIRED");
    await fs.access(job.compressedPath);
    res.download(job.compressedPath, `compressed-${job.originalFileName}`);
  })
);

router.delete(
  "/jobs/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.compressionJob.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!job) throw new AppError("Compression job not found", 404, "JOB_NOT_FOUND");
    await prisma.compressionJob.delete({ where: { id: job.id } });
    await fs.rm(job.originalPath, { force: true });
    if (job.compressedPath) await fs.rm(job.compressedPath, { force: true });
    res.status(204).send();
  })
);

export default router;
