export type CompressionLevel = "low" | "medium" | "high";
export type FileType = "PDF" | "IMAGE";
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type Role = "USER" | "ADMIN";
export type Plan = "FREE" | "PRO";

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
}
