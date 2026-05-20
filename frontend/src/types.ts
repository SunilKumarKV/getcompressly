import type { ApiUser, CompressionJobDto, UsageDto } from "@getcompressly/shared";

export interface AuthResponse {
  user: ApiUser;
  token: string;
}

export interface JobsResponse {
  jobs: Array<CompressionJobDto & { compressionPercentage: number }>;
}

export interface UsageResponse {
  usage: UsageDto;
}
