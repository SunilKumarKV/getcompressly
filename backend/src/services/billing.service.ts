import type Stripe from "stripe";
import { PlanType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { requireStripe } from "../config/stripe.js";
import { AppError } from "../utils/AppError.js";
import { sendPaymentReceiptEmail } from "./email.service.js";

export function priceIdForInterval(interval: "monthly" | "yearly") {
  const priceId = interval === "monthly" ? env.STRIPE_PRICE_MONTHLY : env.STRIPE_PRICE_YEARLY;
  if (!priceId) throw new AppError("Stripe price is not configured", 500, "STRIPE_PRICE_MISSING");
  return priceId;
}

export async function getOrCreateStripeCustomer(userId: string) {
  const stripe = requireStripe();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId) return { user, customerId: user.stripeCustomerId };
  const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return { user: updated, customerId: customer.id };
}

export async function createCheckoutSession(userId: string, interval: "monthly" | "yearly") {
  const stripe = requireStripe();
  const { customerId } = await getOrCreateStripeCustomer(userId);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdForInterval(interval), quantity: 1 }],
    success_url: `${env.APP_URL}/dashboard?billing=success`,
    cancel_url: `${env.APP_URL}/pricing?billing=cancelled`,
    subscription_data: { metadata: { userId, interval } },
    metadata: { userId, interval }
  });
  return session;
}

export async function createPortalSession(userId: string) {
  const stripe = requireStripe();
  const { customerId } = await getOrCreateStripeCustomer(userId);
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${env.APP_URL}/dashboard` });
}

export async function handleStripeEvent(event: Stripe.Event) {
  try {
    await prisma.webhookEvent.create({
      data: { provider: "stripe", eventId: event.id, payload: event as unknown as object }
    });
  } catch {
    return { duplicate: true };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "invoice.payment_succeeded":
      await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await updateCustomerSubscriptionStatus((event.data.object as Stripe.Invoice).customer, "past_due");
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }
  return { duplicate: false };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.customer) {
    await prisma.user.updateMany({ where: { stripeCustomerId: String(session.customer) }, data: { subscriptionStatus: "checkout_completed" } });
  }
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  await updateCustomerSubscriptionStatus(invoice.customer, "active");
  const user = invoice.customer ? await prisma.user.findFirst({ where: { stripeCustomerId: String(invoice.customer) } }) : null;
  if (user) void sendPaymentReceiptEmail(user.email).catch((error) => console.error("payment receipt email failed", error));
}

async function handleSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId === env.STRIPE_PRICE_YEARLY ? PlanType.PRO_YEARLY : PlanType.PRO_MONTHLY;
  await prisma.user.updateMany({
    where: { stripeCustomerId: String(subscription.customer) },
    data: {
      plan,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date((subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000)
    }
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.user.updateMany({
    where: { stripeCustomerId: String(subscription.customer) },
    data: { plan: PlanType.FREE, subscriptionStatus: "canceled", subscriptionCurrentPeriodEnd: null }
  });
}

async function updateCustomerSubscriptionStatus(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, status: string) {
  if (!customer) return;
  await prisma.user.updateMany({ where: { stripeCustomerId: typeof customer === "string" ? customer : customer.id }, data: { subscriptionStatus: status } });
}
