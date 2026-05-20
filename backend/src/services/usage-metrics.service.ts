import { prisma } from "../config/prisma.js";

function dayStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export async function recordUpload(userId: string | null | undefined, bytesUploaded: number) {
  if (!userId) return;
  await prisma.usageMetric.upsert({
    where: { userId_date: { userId, date: dayStart() } },
    create: { userId, date: dayStart(), uploadsCount: 1, bytesUploaded },
    update: { uploadsCount: { increment: 1 }, bytesUploaded: { increment: bytesUploaded } }
  });
}

export async function recordJobSuccess(userId: string | null | undefined, originalSize: number, compressedSize: number | null | undefined) {
  if (!userId) return;
  const bytesSaved = Math.max(0, originalSize - (compressedSize ?? originalSize));
  await prisma.usageMetric.upsert({
    where: { userId_date: { userId, date: dayStart() } },
    create: { userId, date: dayStart(), successCount: 1, bytesSaved },
    update: { successCount: { increment: 1 }, bytesSaved: { increment: bytesSaved } }
  });
}

export async function recordJobFailure(userId: string | null | undefined) {
  if (!userId) return;
  await prisma.usageMetric.upsert({
    where: { userId_date: { userId, date: dayStart() } },
    create: { userId, date: dayStart(), failedCount: 1 },
    update: { failedCount: { increment: 1 } }
  });
}

export function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export { dayStart };
