export type CompressionLevel = "low" | "medium" | "high";
export type FileType = "PDF" | "IMAGE";
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type Role = "USER" | "ADMIN";
export type Plan = "FREE" | "PRO" | "PRO_MONTHLY" | "PRO_YEARLY";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  plan: Plan;
  createdAt: string;
}

export interface CompressionJobDto {
  id: string;
  originalFileName: string;
  originalMimeType: string;
  originalSize: number;
  compressedSize: number | null;
  compressionLevel: CompressionLevel;
  fileType: FileType;
  status: JobStatus;
  progress: number;
  stage: string;
  retryCount: number;
  etaSeconds?: number | null;
  errorMessage: string | null;
  downloadToken?: string;
  expiresAt: string;
  createdAt: string;
}

export interface UsageDto {
  plan: Plan | "GUEST";
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  maxFileSizeMb: number;
  batchLimit: number;
  today?: UsageMetricDto | null;
  monthly?: UsageMetricSummary;
}

export interface UsageMetricDto {
  date: string;
  uploadsCount: number;
  successCount: number;
  failedCount: number;
  bytesUploaded: number;
  bytesSaved: number;
}

export interface UsageMetricSummary {
  uploadsCount: number;
  successCount: number;
  failedCount: number;
  bytesUploaded: number;
  bytesSaved: number;
}
