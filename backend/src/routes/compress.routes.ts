import fs from "node:fs/promises";
import crypto from "node:crypto";
import { Router } from "express";
import { CompressionLevel, FileType, JobStatus, PlanType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { enforceCompressionLimits } from "../middleware/limits.js";
import { guestCompressRateLimiter, userCompressRateLimiter } from "../middleware/rateLimiters.js";
import { upload, validateUploadedFiles } from "../middleware/upload.js";
import { enqueueCompressionJob } from "../queues/compression.queue.js";
import { getCompressionQueue } from "../queues/compression.queue.js";
import { storage } from "../services/storage.service.js";
import { recordUpload } from "../services/usage-metrics.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { compressionPercentage, makeDownloadToken, sanitizeDisplayFileName, sanitizeFileName } from "../utils/files.js";

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
  progress: number;
  stage: string;
  retryCount: number;
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
    progress: job.progress,
    stage: job.stage,
    retryCount: job.retryCount,
    etaSeconds: job.status === JobStatus.PROCESSING ? Math.max(5, Math.round((100 - job.progress) * 1.5)) : null,
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
  guestCompressRateLimiter,
  userCompressRateLimiter,
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
      const safeOriginalName = sanitizeDisplayFileName(file.originalname);
      const originalPath = await storage.saveOriginal(file.path, sanitizeFileName(file.originalname));
      const guestToken = req.user ? null : crypto.randomBytes(32).toString("base64url");
      const job = await prisma.compressionJob.create({
        data: {
          userId: req.user?.id,
          originalFileName: safeOriginalName,
          originalMimeType: file.mimetype,
          originalSize: file.size,
          compressionLevel,
          fileType,
          status: JobStatus.PENDING,
          progress: 0,
          stage: "queued",
          originalPath,
          downloadToken: makeDownloadToken(),
          guestRecoveryTokenHash: guestToken ? hashToken(guestToken) : null,
          guestRecoveryExpiresAt: guestToken ? expiresAt : null,
          expiresAt
        }
      });
      await prisma.usageLog.create({
        data: { userId: req.user?.id, ipAddress: req.ip ?? "unknown", action: "compress", fileSize: file.size }
      });
      await recordUpload(req.user?.id, file.size);
      const priority = req.user?.plan === PlanType.PRO || req.user?.plan === PlanType.PRO_MONTHLY || req.user?.plan === PlanType.PRO_YEARLY ? 1 : 5;
      await enqueueCompressionJob(job.id, priority);
      jobs.push({ ...(await prisma.compressionJob.findUniqueOrThrow({ where: { id: job.id } })), guestRecoveryToken: guestToken });
    }

    res.status(201).json({
      jobs: jobs.map((job) => ({ ...jobDto(job), guestRecoveryToken: "guestRecoveryToken" in job ? job.guestRecoveryToken : undefined }))
    });
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
  optionalAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.compressionJob.findUnique({ where: { id: req.params.id } });
    if (!job) throw new AppError("Compression job not found", 404, "JOB_NOT_FOUND");
    if (job.userId && job.userId !== req.user?.id) throw new AppError("Compression job not found", 404, "JOB_NOT_FOUND");
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
    const localPath = await storage.getLocalPath(job.compressedPath);
    await fs.access(localPath);
    res.download(localPath, `compressed-${sanitizeDisplayFileName(job.originalFileName)}`);
  })
);

router.delete(
  "/jobs/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.compressionJob.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!job) throw new AppError("Compression job not found", 404, "JOB_NOT_FOUND");
    await prisma.compressionJob.delete({ where: { id: job.id } });
    await storage.remove(job.originalPath);
    await storage.remove(job.compressedPath);
    res.status(204).send();
  })
);

router.post(
  "/cancel/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const job = await getAuthorizedJob(z.string().parse(req.params.id), req.user?.id);
    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) throw new AppError("Only queued or processing jobs can be canceled", 400, "JOB_NOT_CANCELABLE");
    await prisma.compressionJob.update({ where: { id: job.id }, data: { status: JobStatus.FAILED, stage: "canceled", progress: 100, canceledAt: new Date(), retryable: false, errorMessage: "Job canceled by user" } });
    await getCompressionQueue().getJob(job.id).then((queueJob) => queueJob?.remove()).catch(() => undefined);
    res.json({ job: jobDto(await prisma.compressionJob.findUniqueOrThrow({ where: { id: job.id } })) });
  })
);

router.post(
  "/retry/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const job = await getAuthorizedJob(z.string().parse(req.params.id), req.user?.id);
    if (job.status !== JobStatus.FAILED) throw new AppError("Only failed jobs can be retried", 400, "JOB_NOT_FAILED");
    if (!job.retryable) throw new AppError("This failure cannot be retried", 400, "JOB_NOT_RETRYABLE");
    if (job.retryCount >= env.MAX_JOB_RETRIES) throw new AppError("Maximum retries reached", 400, "JOB_RETRY_LIMIT");
    const updated = await prisma.compressionJob.update({
      where: { id: job.id },
      data: { status: JobStatus.PENDING, stage: "queued", progress: 0, errorMessage: null, retryCount: { increment: 1 } }
    });
    await enqueueCompressionJob(job.id);
    res.json({ job: jobDto(updated) });
  })
);

async function getAuthorizedJob(id: string, userId: string | undefined) {
  const job = await prisma.compressionJob.findUnique({ where: { id } });
  if (!job) throw new AppError("Compression job not found", 404, "JOB_NOT_FOUND");
  if (job.userId && job.userId !== userId) throw new AppError("Compression job not found", 404, "JOB_NOT_FOUND");
  return job;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default router;
