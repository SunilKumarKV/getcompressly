import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const weakSecrets = new Set(["development-secret-change-before-production", "development-cookie-secret-change-before-production", "changeme", "password", "secret"]);

const envSchema = z
  .object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/getcompressly?schema=public"),
  JWT_SECRET: z.string().min(16).default("development-secret-change-before-production"),
  COOKIE_SECRET: z.string().min(16).default("development-cookie-secret-change-before-production"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(25),
  FREE_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  PRO_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(200),
  UPLOAD_DIR: z.string().default("uploads"),
  TEMP_FILE_EXPIRY_HOURS: z.coerce.number().positive().default(24),
  FREE_DAILY_LIMIT: z.coerce.number().positive().default(5),
  PRO_DAILY_LIMIT: z.coerce.number().positive().default(100),
  MAX_JOB_RETRIES: z.coerce.number().int().positive().default(3),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().default("http://localhost:5000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  REDIS_URL: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  MAX_PDF_PAGES: z.coerce.number().int().positive().default(300),
  MAX_IMAGE_DIMENSION: z.coerce.number().int().positive().default(10000),
  MAX_IMAGE_PIXELS: z.coerce.number().int().positive().default(100000000),
  CLAMAV_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().int().positive().optional()
})
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production") {
      if (weakSecrets.has(value.JWT_SECRET) || value.JWT_SECRET.length < 32) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["JWT_SECRET"], message: "JWT_SECRET must be strong in production" });
      }
      if (weakSecrets.has(value.COOKIE_SECRET) || value.COOKIE_SECRET.length < 32) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["COOKIE_SECRET"], message: "COOKIE_SECRET must be strong in production" });
      }
      if (!process.env.DATABASE_URL) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["DATABASE_URL"], message: "DATABASE_URL is required in production" });
      }
      for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_YEARLY", "RESEND_API_KEY", "EMAIL_FROM"] as const) {
        if (!value[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required in production` });
      }
    }
    if (value.STORAGE_PROVIDER === "s3") {
      for (const key of ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"] as const) {
        if (!value[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required when STORAGE_PROVIDER=s3` });
      }
    }
    if (value.CLAMAV_ENABLED && (!value.CLAMAV_HOST || !value.CLAMAV_PORT)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CLAMAV_HOST"], message: "CLAMAV_HOST and CLAMAV_PORT are required when CLAMAV_ENABLED=true" });
    }
  });

export const env = envSchema.parse(process.env);
