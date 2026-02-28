import express from "express";
import { verifySignupToken } from "../modules/auth/auth.service.js";
import { createUserFromVerified } from "../modules/identity/identity.service.js";
import { enrollTrustedDevice } from "../modules/device/device.service.js";
import { assess } from "../modules/risk/risk.engine.js";
import { baseCookieOptions } from "../modules/cookie.config.js";
import { generateRecoveryKey } from "../modules/recovery/recovery.service.js";

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


  let user;
  try {
    user = createUserFromVerified({ email, govIdHash });
  } catch (err) {
    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already registered." });
    }
    throw err;
  }

  const contextSnapshot = {
    userAgent:           deviceContext?.userAgent           ?? null,
    platform:            deviceContext?.platform            ?? null,
    language:            deviceContext?.language            ?? null,
    timezone:            deviceContext?.timezone            ?? null,
    touchSupport:        deviceContext?.touchSupport        ?? null,
  };

  const risk = assess({ device: null, context: contextSnapshot });

  const device = enrollTrustedDevice({ userId: user.userId, contextSnapshot, credentialId });

  const recoveryKey = generateRecoveryKey({ userId: user.userId, email });

  res.cookie("device_id", device.deviceId, {
    ...baseCookieOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message: "Device enrolled and trusted. Download your recovery key file and store it safely.",
    deviceId: device.deviceId,
    trustState: device.trustState,
    risk,
    recoveryKey: recoveryKey.content,
    recoveryFileName: recoveryKey.fileName,
  });
});

export default router;
