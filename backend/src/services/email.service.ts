import crypto from "node:crypto";
import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export function createSecureToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend || !env.EMAIL_FROM) throw new Error("Email provider is not configured");
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  if (error) throw new Error(error.message);
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail(to, "Verify your GetCompressly email", `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail(to, "Reset your GetCompressly password", `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`);
}

export async function sendDownloadReadyEmail(to: string, fileName: string) {
  await sendEmail(to, "Your compressed file is ready", `<p>${fileName} is ready in your GetCompressly dashboard.</p>`);
}

export async function sendPaymentReceiptEmail(to: string) {
  await sendEmail(to, "GetCompressly payment received", "<p>Your GetCompressly Pro subscription payment was received.</p>");
}
