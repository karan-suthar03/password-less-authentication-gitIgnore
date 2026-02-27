/**
 * recovery.service.js
 * Framework module — recovery key file generation and verification.
 *
 * A recovery key is a JSON file the user downloads once during signup.
 * It contains a long-lived signed token that can ONLY be used to
 * authenticate into the restricted "backdoor" session for device
 * management (listing + revoking enrolled devices).
 *
 * The recovery key token is NOT an access token — it authorises
 * only device blocklist operations, nothing else.
 */

import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

const RECOVERY_SECRET =
  process.env.RECOVERY_SECRET ?? "recovery-secret-change-in-production";

// Recovery keys are long-lived (valid for 1 year).
// Users are expected to store them securely offline.
const RECOVERY_TTL = "365d";

// Tracks issued recovery key fingerprints so we can revoke them if needed.
// keyId → { userId, issuedAt, revoked }
const issuedKeys = new Map();

/**
 * Generate a recovery key payload that the user downloads as a JSON file.
 * Contains a signed JWT with scope "backdoor" and the user's identity.
 *
 * @param {{ userId: string, email: string }} params
 * @returns {{ fileName: string, content: object }}
 */
export function generateRecoveryKey({ userId, email }) {
  const keyId = randomBytes(16).toString("hex");

  const token = jwt.sign(
    { userId, email, keyId, scope: "backdoor" },
    RECOVERY_SECRET,
    { expiresIn: RECOVERY_TTL },
  );

  issuedKeys.set(keyId, {
    userId,
    issuedAt: Date.now(),
    revoked: false,
  });

  const content = {
    _warning:
      "KEEP THIS FILE SAFE. It is the ONLY way to manage your devices if all of them are compromised. Do NOT share it.",
    version: 1,
    email,
    keyId,
    token,
    issuedAt: new Date().toISOString(),
  };

  const fileName = `recovery-key-${email.replace(/[^a-zA-Z0-9]/g, "_")}.json`;

  return { fileName, content };
}

/**
 * Verify a recovery key token from an uploaded file.
 * Returns the decoded payload or throws if invalid / expired / revoked.
 *
 * @param {string} token — the JWT from the recovery key file
 * @returns {{ userId: string, email: string, keyId: string, scope: string }}
 */
export function verifyRecoveryKey(token) {
  const payload = jwt.verify(token, RECOVERY_SECRET);

  if (payload.scope !== "backdoor") {
    throw new Error("Invalid recovery key scope");
  }

  // Check if the key has been revoked
  const record = issuedKeys.get(payload.keyId);
  if (record && record.revoked) {
    throw new Error("This recovery key has been revoked");
  }

  return payload;
}

/**
 * Revoke a recovery key so it can no longer be used.
 * @param {string} keyId
 */
export function revokeRecoveryKey(keyId) {
  const record = issuedKeys.get(keyId);
  if (record) {
    record.revoked = true;
  }
}
