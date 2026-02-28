import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

const RECOVERY_SECRET =
  process.env.RECOVERY_SECRET ?? "recovery-secret-change-in-production";

const RECOVERY_TTL = "365d";

const issuedKeys = new Map();

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

export function verifyRecoveryKey(token) {
  const payload = jwt.verify(token, RECOVERY_SECRET);

  if (payload.scope !== "backdoor") {
    throw new Error("Invalid recovery key scope");
  }

  const record = issuedKeys.get(payload.keyId);
  if (record && record.revoked) {
    throw new Error("This recovery key has been revoked");
  }

  return payload;
}

export function revokeRecoveryKey(keyId) {
  const record = issuedKeys.get(keyId);
  if (record) {
    record.revoked = true;
  }
}
