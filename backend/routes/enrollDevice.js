/**
 * routes/enrollDevice.js
 * POST /enroll-device
 *
 * First-device enrollment. Requires a valid signupToken (from POST /signup).
 * Sets device_id HTTP-only cookie on the response.
 *
 * The "credentialId" is the simulated WebAuthn passkey identifier
 * created client-side (stored in navigator credentials or localStorage).
 */

import express from "express";
import { verifySignupToken } from "../modules/auth/auth.service.js";
import { enrollTrustedDevice } from "../modules/device/device.service.js";
import { assess } from "../modules/risk/risk.engine.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { signupToken, deviceContext, credentialId } = req.body ?? {};

  if (!signupToken) {
    return res.status(401).json({ error: "signupToken required" });
  }

  let userId;
  try {
    ({ userId } = verifySignupToken(signupToken));
  } catch {
    return res.status(401).json({ error: "Invalid or expired signupToken" });
  }

  // Risk check on the incoming context (should be clean for first device)
  const risk = assess({ device: null, context: deviceContext ?? {} });

  const device = enrollTrustedDevice({ userId, contextSnapshot: deviceContext ?? {}, credentialId });

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
