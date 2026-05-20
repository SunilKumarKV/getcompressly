import bcrypt from "bcryptjs";
import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiters.js";
import { clearAuthCookies, createRefreshToken, getRefreshTokenFromRequest, revokeRefreshToken, rotateRefreshToken, setAuthCookies, signAccessToken } from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

function toUserDto(user: { id: string; name: string; email: string; role: string; plan: string; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, createdAt: user.createdAt };
}

async function issueSession(res: Response, userId: string) {
  const token = signAccessToken(userId);
  const refresh = await createRefreshToken(userId);
  setAuthCookies(res, token, refresh.token, refresh.expiresAt);
  return token;
}

router.post(
  "/register",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new AppError("Email is already registered", 409, "EMAIL_EXISTS");
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({ data: { name: body.name, email: body.email, passwordHash } });
    res.status(201).json({ user: toUserDto(user), token: await issueSession(res, user.id) });
  })
);

router.post(
  "/login",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    res.json({ user: toUserDto(user), token: await issueSession(res, user.id) });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) throw new AppError("Refresh token is missing", 401, "REFRESH_REQUIRED");
    const session = await rotateRefreshToken(refreshToken);
    if (!session) throw new AppError("Refresh token is invalid or expired", 401, "REFRESH_INVALID");
    const accessToken = signAccessToken(session.user.id);
    setAuthCookies(res, accessToken, session.refresh.token, session.refresh.expiresAt);
    res.json({ user: toUserDto(session.user), token: accessToken });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({ user: toUserDto(user) });
  })
);

router.post("/logout", asyncHandler(async (req, res) => {
  await revokeRefreshToken(getRefreshTokenFromRequest(req));
  clearAuthCookies(res);
  res.status(204).send();
}));

export default router;
