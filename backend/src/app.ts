import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import compressRoutes from "./routes/compress.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { adminRateLimiter, globalRateLimiter } from "./middleware/rateLimiters.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "frame-ancestors": ["'none'"]
        }
      },
      frameguard: { action: "deny" },
      noSniff: true,
      referrerPolicy: { policy: "no-referrer" }
    })
  );
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(globalRateLimiter);

  app.use("/api/health", healthRoutes);
  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/compress", compressRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/admin", adminRateLimiter, adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
