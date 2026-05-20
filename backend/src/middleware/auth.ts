import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface JwtPayload {
  sub: string;
}

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) req.user = { id: user.id, email: user.email, role: user.role, plan: user.plan };
  } catch {
    return next();
  }
  return next();
});

export const requireAuth = [
  optionalAuth,
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    next();
  })
];

export const requireAdmin = [
  ...requireAuth,
  asyncHandler(async (req, _res, next) => {
    if (req.user?.role !== "ADMIN") throw new AppError("Admin access required", 403, "ADMIN_REQUIRED");
    next();
  })
];
