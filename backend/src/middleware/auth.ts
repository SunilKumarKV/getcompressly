import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAccessTokenFromRequest, verifyAccessToken } from "../services/auth.service.js";

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = getAccessTokenFromRequest(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
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
