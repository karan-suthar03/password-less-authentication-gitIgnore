import express from "express";
import { verifySignupToken } from "../modules/auth/auth.service.js";
import { createUserFromVerified } from "../modules/identity/identity.service.js";
import { baseCookieOptions } from "../modules/cookie.config.js";
import passkey from "../passkey.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { signupToken, deviceContext, credentialId } = req.body ?? {};

  if (!signupToken) {
    return res.status(401).json({ error: "signupToken required" });
  }

  let email, govIdHash, userId;
  try {
    ({ email, govIdHash, userId } = verifySignupToken(signupToken));
  } catch {
    return res.status(401).json({ error: "Invalid or expired signupToken" });
  }

  let user;
  try {
    user = createUserFromVerified({ userId, email, govIdHash });
  } catch (err) {
    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already registered." });
    }
    throw err;
  }

  const contextSnapshot = {
    userAgent:    deviceContext?.userAgent    ?? null,
    platform:     deviceContext?.platform     ?? null,
    language:     deviceContext?.language     ?? null,
    timezone:     deviceContext?.timezone     ?? null,
    touchSupport: deviceContext?.touchSupport ?? null,
  };

  const risk         = await passkey.assessRisk({ deviceId: null, context: contextSnapshot });
  const { device }   = await passkey.enrollDevice({ userId: user.userId, contextSnapshot, credentialId });
  const recoveryData = await passkey.generateRecoveryKey({ userId: user.userId, email });

  res.cookie("device_id", device.deviceId, {
    ...baseCookieOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message:          "Device enrolled and trusted. Download your recovery key file and store it safely.",
    deviceId:         device.deviceId,
    trustState:       device.trustState,
    risk,
    recoveryKey:      recoveryData.content,
    recoveryFileName: recoveryData.fileName,
  });
});

export default router;
