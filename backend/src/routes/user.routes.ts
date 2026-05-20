import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { getUsageLimit } from "../middleware/limits.js";
import { dayStart, monthStart } from "../services/usage-metrics.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

function startOfDay() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

router.get(
  "/usage",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const limits = await getUsageLimit(req.user);
    const where = req.user
      ? { userId: req.user.id, action: "compress", createdAt: { gte: startOfDay() } }
      : { ipAddress: req.ip ?? "unknown", action: "compress", createdAt: { gte: startOfDay() } };
    const usedToday = await prisma.usageLog.count({ where });
    const [todayMetric, monthMetrics] = req.user
      ? await Promise.all([
          prisma.usageMetric.findUnique({ where: { userId_date: { userId: req.user.id, date: dayStart() } } }),
          prisma.usageMetric.findMany({ where: { userId: req.user.id, date: { gte: monthStart() } } })
        ])
      : [null, []];
    const monthly = monthMetrics.reduce(
      (acc, metric) => ({
        uploadsCount: acc.uploadsCount + metric.uploadsCount,
        successCount: acc.successCount + metric.successCount,
        failedCount: acc.failedCount + metric.failedCount,
        bytesUploaded: acc.bytesUploaded + Number(metric.bytesUploaded),
        bytesSaved: acc.bytesSaved + Number(metric.bytesSaved)
      }),
      { uploadsCount: 0, successCount: 0, failedCount: 0, bytesUploaded: 0, bytesSaved: 0 }
    );
    res.json({
      usage: {
        ...limits,
        usedToday,
        remainingToday: Math.max(0, limits.dailyLimit - usedToday),
        today: todayMetric ? metricDto(todayMetric) : null,
        monthly
      }
    });
  })
);

router.get(
  "/usage/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const metrics = await prisma.usageMetric.findMany({ where: { userId: req.user!.id }, orderBy: { date: "desc" }, take: 60 });
    res.json({ history: metrics.map(metricDto) });
  })
);

function metricDto(metric: { date: Date; uploadsCount: number; successCount: number; failedCount: number; bytesUploaded: bigint; bytesSaved: bigint }) {
  return {
    date: metric.date,
    uploadsCount: metric.uploadsCount,
    successCount: metric.successCount,
    failedCount: metric.failedCount,
    bytesUploaded: Number(metric.bytesUploaded),
    bytesSaved: Number(metric.bytesSaved)
  };
}

export default router;
