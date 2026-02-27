/**
 * auth.service.js
 * Framework module — JWT issuance / verification, signup tokens.
 * No user or device creation logic here.
 */

import jwt from "jsonwebtoken";
import { baseCookieOptions } from "../cookie.config.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_TTL = "15m";

// Short-lived tokens for first-device enrollment after signup
const SIGNUP_TOKEN_SECRET = process.env.SIGNUP_TOKEN_SECRET ?? "signup-secret-change-in-production";
const SIGNUP_TOKEN_TTL = "10m";

// ── Access Tokens ──────────────────────────────────────────────

/**
 * Issue a short-lived JWT for an authenticated session.
 * Embeds userId, deviceId, and the device's current trustState.
 */
export function issueAccessToken({ userId, deviceId, trustState }) {
  return jwt.sign({ userId, deviceId, trustState }, JWT_SECRET, { expiresIn: JWT_TTL });
}

/**
 * Verify an access token.
 * Returns the decoded payload or throws if invalid/expired.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Signup Tokens ──────────────────────────────────────────────

/**
 * Issue a single-use enrollment token after email + KYC verification.
 * Carries the verified identity (email + govIdHash) so the user can be
 * created atomically alongside the first device enrollment.
 * This is NOT an authentication token — it only authorises device enrollment.
 */
export function issueSignupToken({ email, govIdHash }) {
  return jwt.sign(
    { email, govIdHash, purpose: "first-device-enrollment" },
    SIGNUP_TOKEN_SECRET,
    { expiresIn: SIGNUP_TOKEN_TTL },
  );
}

/**
 * Verify a signup (enrollment) token.
 * Returns { email, govIdHash } or throws if invalid.
 */
export function verifySignupToken(token) {
  const payload = jwt.verify(token, SIGNUP_TOKEN_SECRET);
  if (payload.purpose !== "first-device-enrollment") {
    throw new Error("Invalid token purpose");
  }
  return payload;
}

// ── Middleware helper ──────────────────────────────────────────

/**
 * Express middleware: require a valid Bearer JWT.
 * Attaches decoded payload to req.auth.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Express middleware: require trustState === "trusted" on the JWT.
 * Must be chained after requireAuth.
 */
export function requireTrustedDevice(req, res, next) {
  if (req.auth?.trustState !== "trusted") {
    return res.status(403).json({ error: "Action requires a trusted device" });
  }
  next();
}
