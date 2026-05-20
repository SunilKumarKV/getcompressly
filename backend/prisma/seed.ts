import { PrismaClient, PlanType } from "@prisma/client";

const prisma = new PrismaClient();

await prisma.plan.upsert({
  where: { name: PlanType.FREE },
  update: { dailyLimit: Number(process.env.FREE_DAILY_LIMIT ?? 5), maxFileSizeMb: Number(process.env.FREE_MAX_FILE_SIZE_MB ?? 10), batchLimit: 3, priceMonthly: 0 },
  create: { name: PlanType.FREE, dailyLimit: Number(process.env.FREE_DAILY_LIMIT ?? 5), maxFileSizeMb: Number(process.env.FREE_MAX_FILE_SIZE_MB ?? 10), batchLimit: 3, priceMonthly: 0 }
});

await prisma.plan.upsert({
  where: { name: PlanType.PRO },
  update: { dailyLimit: Number(process.env.PRO_DAILY_LIMIT ?? 100), maxFileSizeMb: Number(process.env.PRO_MAX_FILE_SIZE_MB ?? 200), batchLimit: 20, priceMonthly: 1200 },
  create: { name: PlanType.PRO, dailyLimit: Number(process.env.PRO_DAILY_LIMIT ?? 100), maxFileSizeMb: Number(process.env.PRO_MAX_FILE_SIZE_MB ?? 200), batchLimit: 20, priceMonthly: 1200 }
});

for (const [name, priceMonthly] of [
  [PlanType.PRO_MONTHLY, 1200],
  [PlanType.PRO_YEARLY, 999]
] as const) {
  await prisma.plan.upsert({
    where: { name },
    update: {
      dailyLimit: Number(process.env.PRO_DAILY_LIMIT ?? 100),
      maxFileSizeMb: Number(process.env.PRO_MAX_FILE_SIZE_MB ?? 200),
      batchLimit: 20,
      priceMonthly,
      stripePriceIdMonthly: process.env.STRIPE_PRICE_MONTHLY || null,
      stripePriceIdYearly: process.env.STRIPE_PRICE_YEARLY || null
    },
    create: {
      name,
      dailyLimit: Number(process.env.PRO_DAILY_LIMIT ?? 100),
      maxFileSizeMb: Number(process.env.PRO_MAX_FILE_SIZE_MB ?? 200),
      batchLimit: 20,
      priceMonthly,
      stripePriceIdMonthly: process.env.STRIPE_PRICE_MONTHLY || null,
      stripePriceIdYearly: process.env.STRIPE_PRICE_YEARLY || null
    }
  });
}

await prisma.$disconnect();
