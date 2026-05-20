import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { requireStripe } from "../config/stripe.js";
import { requireAuth } from "../middleware/auth.js";
import { createCheckoutSession, createPortalSession, handleStripeEvent } from "../services/billing.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const checkoutSchema = z.object({ interval: z.enum(["monthly", "yearly"]) });

router.get("/plans", (_req, res) => {
  res.json({
    plans: [
      { code: "FREE", name: "Free", dailyLimit: 5, maxFileSizeMb: 10, priceMonthly: 0 },
      { code: "PRO_MONTHLY", name: "Pro Monthly", dailyLimit: 100, maxFileSizeMb: 200, priceMonthly: 12, stripePriceId: env.STRIPE_PRICE_MONTHLY },
      { code: "PRO_YEARLY", name: "Pro Yearly", dailyLimit: 100, maxFileSizeMb: 200, priceMonthly: 9.99, stripePriceId: env.STRIPE_PRICE_YEARLY }
    ]
  });
});

router.post(
  "/create-checkout-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = checkoutSchema.parse(req.body);
    const session = await createCheckoutSession(req.user!.id, body.interval);
    res.json({ url: session.url });
  })
);

router.post(
  "/create-portal-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await createPortalSession(req.user!.id);
    res.json({ url: session.url });
  })
);

router.get(
  "/subscription",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({
      subscription: {
        plan: user.plan,
        status: user.subscriptionStatus,
        currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
        stripeCustomerId: user.stripeCustomerId
      }
    });
  })
);

export async function stripeWebhookHandler(req: Request, res: Response) {
  const stripe = requireStripe();
  if (!env.STRIPE_WEBHOOK_SECRET) throw new AppError("Stripe webhook secret is not configured", 500, "STRIPE_WEBHOOK_SECRET_MISSING");
  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) throw new AppError("Missing Stripe signature", 400, "STRIPE_SIGNATURE_MISSING");
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError("Invalid Stripe webhook signature", 400, "STRIPE_SIGNATURE_INVALID");
  }
  await handleStripeEvent(event);
  res.json({ received: true });
}

export default router;
