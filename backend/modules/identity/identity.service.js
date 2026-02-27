/**
 * identity.service.js
 * Framework module — manages Users.
 * No app-specific logic. No passwords.
 */

import { createHash } from "crypto";
import { v4 as uuid } from "uuid";

// In-memory stores
const users = new Map();       // userId  → User
const emailIndex = new Map();  // email   → userId

/**
 * Create a new user identity.
 * The govIdNumber is hashed; the raw value is never retained.
 * The account starts in an unauthenticated state:
 *   - no active sessions
 *   - no trusted devices
 *   - emailVerified must already be true before calling this
 *   - kycVerified must already be true before calling this
 */
export function createUser({ email, govIdNumber, emailVerified, kycVerified }) {
  if (emailIndex.has(email)) {
    throw Object.assign(new Error("Email already registered"), { code: "EMAIL_TAKEN" });
  }

  const govIdHash = createHash("sha256").update(govIdNumber).digest("hex");
  const userId = uuid();

  const user = {
    userId,
    email,
    govIdHash,                       // one-way hash — raw ID never stored
    emailVerified: !!emailVerified,  // must be true at creation time
    kycVerified: !!kycVerified,      // must be true at creation time
    createdAt: Date.now(),
  };

  users.set(userId, user);
  emailIndex.set(email, userId);

  return user;
}

/** Check whether an email is already registered. */
export function isEmailTaken(email) {
  return emailIndex.has(email);
}

/**
 * Create a user from already-verified identity data.
 * Called during device enrollment — the govIdHash is already computed,
 * KYC and email are already confirmed.
 */
export function createUserFromVerified({ email, govIdHash }) {
  if (emailIndex.has(email)) {
    throw Object.assign(new Error("Email already registered"), { code: "EMAIL_TAKEN" });
  }

  const userId = uuid();

  const user = {
    userId,
    email,
    govIdHash,
    emailVerified: true,
    kycVerified: true,
    createdAt: Date.now(),
  };

  users.set(userId, user);
  emailIndex.set(email, userId);

  return user;
}

/** Find a user by email. Returns null if not found. */
export function getUserByEmail(email) {
  const userId = emailIndex.get(email);
  return userId ? users.get(userId) ?? null : null;
}

/** Find a user by userId. Returns null if not found. */
export function getUserById(userId) {
  return users.get(userId) ?? null;
}


