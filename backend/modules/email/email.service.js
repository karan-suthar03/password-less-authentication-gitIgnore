/**
 * email.service.js
 * Framework module — email verification via magic links.
 *
 * In production this would send real emails (SES, SendGrid, etc.).
 * Here the magic link is console.log'd so the developer can click it.
 *
 * Links expire after 10 minutes and are single-use.
 */

import { randomBytes } from "crypto";

// In-memory store: token → { email, expiresAt, payload }
const pendingVerifications = new Map();

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

/**
 * Generate a magic-link token and associate it with an email + arbitrary payload.
 * The full link is logged to the console (in production it would be emailed).
 *
 * @param {string} email
 * @param {object} payload  arbitrary data to return on successful verification
 * @returns {string} the generated token
 */
export function createEmailVerification(email, payload = {}) {
  const token = randomBytes(32).toString("hex");

  pendingVerifications.set(token, {
    email: email.toLowerCase(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
    payload,
  });

  const magicLink = `${FRONTEND_ORIGIN}/verify-email?token=${token}`;

  // In production: send the magic link via email here.
  console.log(`\n────────────────────────────────────────────────`);
  console.log(`[EMAIL SIM] Magic link for ${email}:`);
  console.log(magicLink);
  console.log(`────────────────────────────────────────────────\n`);

  return token;
}

/**
 * Verify a magic-link token.
 * On success, clears the pending record and returns the stored payload + email.
 *
 * @param {string} token
 * @returns {{ valid: boolean, email?: string, payload?: object, error?: string }}
 */
export function confirmEmailVerification(token) {
  const record = pendingVerifications.get(token);

  if (!record) {
    return { valid: false, error: "Invalid or already-used magic link." };
  }

  if (Date.now() > record.expiresAt) {
    pendingVerifications.delete(token);
    return { valid: false, error: "Magic link has expired. Please sign up again." };
  }

  // Single-use: delete after successful verification
  const { email, payload } = record;
  pendingVerifications.delete(token);

  return { valid: true, email, payload };
}
