/**
 * routes/enrollDevice.js
 * POST /enroll-device
 *
 * First-device enrollment. Requires a valid signupToken (from POST /signup/confirm-email).
 *
 * This is the step where the user account is actually created — atomically
 * alongside the first trusted device.  Before this point the identity has
 * been verified (KYC + email) but no user record exists.
 *
 * Sets device_id HTTP-only cookie on the response.
 *
 * Captures a snapshot of allowable system and contextual signals for
 * baseline risk assessment.  The "credentialId" is the WebAuthn passkey
 * identifier created client-side (stored in navigator credentials).
 */

import express from "express";
import { verifySignupToken } from "../modules/auth/auth.service.js";
import { createUserFromVerified } from "../modules/identity/identity.service.js";
import { enrollTrustedDevice } from "../modules/device/device.service.js";
import { assess } from "../modules/risk/risk.engine.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { signupToken, deviceContext, credentialId } = req.body ?? {};

  if (!signupToken) {
    return res.status(401).json({ error: "signupToken required" });
  }

  let email, govIdHash;
  try {
    ({ email, govIdHash } = verifySignupToken(signupToken));
  } catch {
    return res.status(401).json({ error: "Invalid or expired signupToken" });
  }

  // ── Create the user account (first time it exists) ──────────────
  let user;
  try {
    user = createUserFromVerified({ email, govIdHash });
  } catch (err) {
    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already registered." });
    }
    throw err;
  }

  // Build the baseline contextual snapshot that will be compared on
  // every future login for risk assessment.
  const contextSnapshot = {
    userAgent:      deviceContext?.userAgent      ?? null,
    platform:       deviceContext?.platform        ?? null,
    language:       deviceContext?.language         ?? null,
    languages:      deviceContext?.languages        ?? null,
    timezone:       deviceContext?.timezone         ?? null,
    timezoneOffset: deviceContext?.timezoneOffset   ?? null,
    screenWidth:    deviceContext?.screenWidth      ?? null,
    screenHeight:   deviceContext?.screenHeight     ?? null,
    colorDepth:     deviceContext?.colorDepth       ?? null,
    deviceMemory:   deviceContext?.deviceMemory     ?? null,
    hardwareConcurrency: deviceContext?.hardwareConcurrency ?? null,
    touchSupport:   deviceContext?.touchSupport     ?? null,
    enrolledAt:     Date.now(),
  };

  // Risk check on the incoming context (should be clean for first device)
  const risk = assess({ device: null, context: contextSnapshot });

  const device = enrollTrustedDevice({ userId: user.userId, contextSnapshot, credentialId });

  // Set the persistent device identity cookie
  res.cookie("device_id", device.deviceId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  });

  res.status(201).json({
    message: "Device enrolled and trusted. You can now log in.",
    deviceId: device.deviceId,
    trustState: device.trustState,
    risk,
  });
});

export default router;
