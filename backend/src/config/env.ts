import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/getcompressly?schema=public"),
  JWT_SECRET: z.string().min(16).default("development-secret-change-before-production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(25),
  UPLOAD_DIR: z.string().default("uploads"),
  TEMP_FILE_EXPIRY_HOURS: z.coerce.number().positive().default(24),
  FREE_DAILY_LIMIT: z.coerce.number().positive().default(5),
  PRO_DAILY_LIMIT: z.coerce.number().positive().default(100)
});

export const env = envSchema.parse(process.env);
