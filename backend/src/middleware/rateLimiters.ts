import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";
import { getRedisConnection } from "../config/redis.js";

function store(prefix: string) {
  const redis = getRedisConnection();
  if (!redis) return undefined;
  return new RedisStore({
    sendCommand: async (...args: string[]) => redis.call(args[0] ?? "", ...args.slice(1)) as Promise<RedisReply>,
    prefix
  });
}

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: store("gc:rl:global:")
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later.", code: "AUTH_RATE_LIMIT" },
  store: store("gc:rl:auth:")
});

export const guestCompressRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => Boolean(req.user),
  message: { message: "Too many guest compression requests. Please try again later.", code: "GUEST_RATE_LIMIT" },
  store: store("gc:rl:guest-compress:")
});

export const userCompressRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => !req.user,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "0.0.0.0"),
  message: { message: "Too many compression requests. Please try again later.", code: "USER_RATE_LIMIT" },
  store: store("gc:rl:user-compress:")
});

export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many admin requests. Please try again later.", code: "ADMIN_RATE_LIMIT" },
  store: store("gc:rl:admin:")
});
