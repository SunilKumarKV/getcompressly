ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'PRO_MONTHLY';
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'PRO_YEARLY';

ALTER TABLE "User"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerificationToken" TEXT,
  ADD COLUMN "emailVerificationExpires" TIMESTAMP(3),
  ADD COLUMN "passwordResetToken" TEXT,
  ADD COLUMN "passwordResetExpires" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

ALTER TABLE "CompressionJob"
  ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'queued',
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "retryable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "guestRecoveryTokenHash" TEXT,
  ADD COLUMN "guestRecoveryExpiresAt" TIMESTAMP(3);

CREATE INDEX "CompressionJob_guestRecoveryTokenHash_idx" ON "CompressionJob"("guestRecoveryTokenHash");

ALTER TABLE "Plan"
  ADD COLUMN "stripePriceIdMonthly" TEXT,
  ADD COLUMN "stripePriceIdYearly" TEXT;

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

CREATE TABLE "UsageMetric" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "uploadsCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "bytesUploaded" BIGINT NOT NULL DEFAULT 0,
  "bytesSaved" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageMetric_userId_date_key" ON "UsageMetric"("userId", "date");
CREATE INDEX "UsageMetric_date_idx" ON "UsageMetric"("date");

ALTER TABLE "UsageMetric" ADD CONSTRAINT "UsageMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
