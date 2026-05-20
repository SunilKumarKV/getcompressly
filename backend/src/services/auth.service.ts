import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

const accessCookieName = "gc_access";
const refreshCookieName = "gc_refresh";

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId, typ: "access" }, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as { sub: string; typ?: string };
}

export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(48).toString("base64url");
  const tokenHash = await bcrypt.hash(token, 12);
  const expiresAt = new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN));
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return { token, expiresAt };
}

export async function rotateRefreshToken(refreshToken: string) {
  const candidates = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  for (const candidate of candidates) {
    if (await bcrypt.compare(refreshToken, candidate.tokenHash)) {
      await prisma.refreshToken.update({ where: { id: candidate.id }, data: { revokedAt: new Date() } });
      return { user: candidate.user, refresh: await createRefreshToken(candidate.userId) };
    }
  }
  return null;
}

export async function revokeRefreshToken(refreshToken: string | undefined) {
  if (!refreshToken) return;
  const candidates = await prisma.refreshToken.findMany({ where: { revokedAt: null }, orderBy: { createdAt: "desc" }, take: 50 });
  for (const candidate of candidates) {
    if (await bcrypt.compare(refreshToken, candidate.tokenHash)) {
      await prisma.refreshToken.update({ where: { id: candidate.id }, data: { revokedAt: new Date() } });
      return;
    }
  }
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, refreshExpiresAt: Date) {
  const secure = env.NODE_ENV === "production";
  const sameSite = secure ? "none" : "lax";
  res.cookie(accessCookieName, accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    signed: true,
    maxAge: parseDurationMs(env.ACCESS_TOKEN_EXPIRES_IN),
    path: "/"
  });
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    signed: true,
    expires: refreshExpiresAt,
    path: "/api/auth"
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(accessCookieName, { path: "/" });
  res.clearCookie(refreshCookieName, { path: "/api/auth" });
}

export function getAccessTokenFromRequest(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.signedCookies?.[accessCookieName] ?? req.cookies?.[accessCookieName];
}

export function getRefreshTokenFromRequest(req: Request) {
  return req.signedCookies?.[refreshCookieName] ?? req.cookies?.[refreshCookieName];
}

function parseDurationMs(value: string) {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === "s") return amount * 1000;
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "h") return amount * 60 * 60 * 1000;
  return amount * 24 * 60 * 60 * 1000;
}
