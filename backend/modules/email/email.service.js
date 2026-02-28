

import { randomBytes } from "crypto";

const pendingVerifications = new Map();

const TOKEN_TTL_MS = 10 * 60 * 1000; 
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

export function createEmailVerification(email, payload = {}) {
  const token = randomBytes(32).toString("hex");

  pendingVerifications.set(token, {
    email: email.toLowerCase(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
    payload,
  });

  const magicLink = `${FRONTEND_ORIGIN}/verify-email?token=${token}`;
  console.log(`\n────────────────────────────────────────────────`);
  console.log(`[EMAIL SIM] Magic link for ${email}:`);
  console.log(magicLink);
  console.log(`────────────────────────────────────────────────\n`);

  return token;
}

export function confirmEmailVerification(token) {
  const record = pendingVerifications.get(token);

  if (!record) {
    return { valid: false, error: "Invalid or already-used magic link." };
  }

  if (Date.now() > record.expiresAt) {
    pendingVerifications.delete(token);
    return { valid: false, error: "Magic link has expired. Please sign up again." };
  }

  const { email, payload } = record;
  pendingVerifications.delete(token);

  return { valid: true, email, payload };
}
