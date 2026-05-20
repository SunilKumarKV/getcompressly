import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { optionalAuth } from "../middleware/auth.js";
import { getUsageLimit } from "../middleware/limits.js";
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
    res.json({ usage: { ...limits, usedToday, remainingToday: Math.max(0, limits.dailyLimit - usedToday) } });
  })
);

export default router;
