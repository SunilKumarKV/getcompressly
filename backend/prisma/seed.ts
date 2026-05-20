import { PrismaClient, PlanType } from "@prisma/client";

const prisma = new PrismaClient();

await prisma.plan.upsert({
  where: { name: PlanType.FREE },
  update: { dailyLimit: Number(process.env.FREE_DAILY_LIMIT ?? 5), maxFileSizeMb: 25, batchLimit: 3, priceMonthly: 0 },
  create: { name: PlanType.FREE, dailyLimit: Number(process.env.FREE_DAILY_LIMIT ?? 5), maxFileSizeMb: 25, batchLimit: 3, priceMonthly: 0 }
});

await prisma.plan.upsert({
  where: { name: PlanType.PRO },
  update: { dailyLimit: Number(process.env.PRO_DAILY_LIMIT ?? 100), maxFileSizeMb: 100, batchLimit: 20, priceMonthly: 1200 },
  create: { name: PlanType.PRO, dailyLimit: Number(process.env.PRO_DAILY_LIMIT ?? 100), maxFileSizeMb: 100, batchLimit: 20, priceMonthly: 1200 }
});

await prisma.$disconnect();
