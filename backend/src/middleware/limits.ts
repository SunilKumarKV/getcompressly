import { PlanType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function startOfDay() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getUsageLimit(user: Express.User | undefined) {
  if (!user) return { dailyLimit: env.FREE_DAILY_LIMIT, maxFileSizeMb: env.FREE_MAX_FILE_SIZE_MB, batchLimit: 3, plan: "GUEST" as const };
  const plan = await prisma.plan.findUnique({ where: { name: user.plan } });
  return {
    dailyLimit: plan?.dailyLimit ?? (user.plan === PlanType.PRO ? env.PRO_DAILY_LIMIT : env.FREE_DAILY_LIMIT),
    maxFileSizeMb: plan?.maxFileSizeMb ?? (user.plan === PlanType.PRO ? env.PRO_MAX_FILE_SIZE_MB : env.FREE_MAX_FILE_SIZE_MB),
    batchLimit: plan?.batchLimit ?? (user.plan === PlanType.PRO ? 20 : 3),
    plan: user.plan
  };
}

export const enforceCompressionLimits = asyncHandler(async (req, _res, next) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const limits = await getUsageLimit(req.user);
  if (files.length > limits.batchLimit) throw new AppError(`Batch limit is ${limits.batchLimit} files`, 429, "BATCH_LIMIT");

  const maxBytes = limits.maxFileSizeMb * 1024 * 1024;
  if (files.some((file) => file.size > maxBytes)) {
    throw new AppError(`Maximum file size is ${limits.maxFileSizeMb} MB`, 413, "FILE_TOO_LARGE");
  }

  const where = req.user
    ? { userId: req.user.id, createdAt: { gte: startOfDay() }, action: "compress" }
    : { ipAddress: req.ip ?? "unknown", createdAt: { gte: startOfDay() }, action: "compress" };
  const usedToday = await prisma.usageLog.count({ where });
  if (usedToday + files.length > limits.dailyLimit) throw new AppError("Daily compression limit reached", 429, "DAILY_LIMIT");

  next();
});
