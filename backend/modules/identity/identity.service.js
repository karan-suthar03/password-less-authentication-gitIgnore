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
 */
export function createUser({ email, govIdNumber }) {
  if (emailIndex.has(email)) {
    throw Object.assign(new Error("Email already registered"), { code: "EMAIL_TAKEN" });
  }

  const govIdHash = createHash("sha256").update(govIdNumber).digest("hex");
  const userId = uuid();

  const user = {
    userId,
    email,
    govIdHash,
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

/** List all users (for admin/debug only). */
export function listUsers() {
  return [...users.values()];
}
