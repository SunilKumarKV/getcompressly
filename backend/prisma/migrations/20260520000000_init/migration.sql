CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO');
CREATE TYPE "CompressionLevel" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "FileType" AS ENUM ('PDF', 'IMAGE');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "plan" "PlanType" NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompressionJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "originalFileName" TEXT NOT NULL,
  "originalMimeType" TEXT NOT NULL,
  "originalSize" INTEGER NOT NULL,
  "compressedSize" INTEGER,
  "compressionLevel" "CompressionLevel" NOT NULL,
  "fileType" "FileType" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "originalPath" TEXT NOT NULL,
  "compressedPath" TEXT,
  "downloadToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompressionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "ipAddress" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "name" "PlanType" NOT NULL,
  "dailyLimit" INTEGER NOT NULL,
  "maxFileSizeMb" INTEGER NOT NULL,
  "batchLimit" INTEGER NOT NULL,
  "priceMonthly" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "CompressionJob_downloadToken_key" ON "CompressionJob"("downloadToken");
CREATE INDEX "CompressionJob_userId_createdAt_idx" ON "CompressionJob"("userId", "createdAt");
CREATE INDEX "CompressionJob_downloadToken_idx" ON "CompressionJob"("downloadToken");
CREATE INDEX "CompressionJob_expiresAt_idx" ON "CompressionJob"("expiresAt");
CREATE INDEX "UsageLog_userId_createdAt_idx" ON "UsageLog"("userId", "createdAt");
CREATE INDEX "UsageLog_ipAddress_createdAt_idx" ON "UsageLog"("ipAddress", "createdAt");
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

ALTER TABLE "CompressionJob" ADD CONSTRAINT "CompressionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
