import { Router } from "express";
import { JobStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/stats",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [users, jobs, completed, failed, usageToday, planOverview] = await Promise.all([
      prisma.user.count(),
      prisma.compressionJob.count(),
      prisma.compressionJob.count({ where: { status: JobStatus.COMPLETED } }),
      prisma.compressionJob.count({ where: { status: JobStatus.FAILED } }),
      prisma.usageLog.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.user.groupBy({ by: ["plan", "subscriptionStatus"], _count: true })
    ]);
    res.json({ stats: { users, jobs, completed, failed, usageToday, planOverview } });
  })
);

export default router;
