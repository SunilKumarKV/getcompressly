import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { compressionPercentage } from "../utils/files.js";

const router = Router();

router.get(
  "/recover/:token",
  asyncHandler(async (req, res) => {
    const tokenHash = crypto.createHash("sha256").update(z.string().parse(req.params.token)).digest("hex");
    const jobs = await prisma.compressionJob.findMany({
      where: { userId: null, guestRecoveryTokenHash: tokenHash, guestRecoveryExpiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    if (jobs.length === 0) throw new AppError("Recovery link is invalid or expired", 404, "GUEST_RECOVERY_NOT_FOUND");
    res.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        originalFileName: job.originalFileName,
        originalSize: job.originalSize,
        compressedSize: job.compressedSize,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        errorMessage: job.errorMessage,
        downloadToken: job.status === "COMPLETED" ? job.downloadToken : undefined,
        compressionPercentage: compressionPercentage(job.originalSize, job.compressedSize),
        expiresAt: job.expiresAt,
        createdAt: job.createdAt
      }))
    });
  })
);

export default router;
