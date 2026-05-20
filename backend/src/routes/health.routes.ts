import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { checkRedisReady } from "../config/redis.js";
import { storage } from "../services/storage.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", service: "getcompressly-api", timestamp: new Date().toISOString() });
  })
);

router.get("/live", (_req, res) => {
  res.json({ status: "live", service: "getcompressly-api", timestamp: new Date().toISOString() });
});

router.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    const checks = {
      database: false,
      redis: { enabled: false },
      storage: false
    };
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
    checks.redis = await checkRedisReady();
    checks.storage = await storage.isReady();
    res.json({ status: "ready", checks, timestamp: new Date().toISOString() });
  })
);

export default router;
