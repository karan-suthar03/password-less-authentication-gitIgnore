import express from "express";
import { issueAccessToken } from "../modules/auth/auth.service.js";
import { baseCookieOptions } from "../modules/cookie.config.js";
import passkey from "../passkey.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const deviceId = req.cookies.device_id;
  const { credentialId, deviceContext } = req.body ?? {};

  if (!deviceId) {
    return res.status(401).json({ error: "No device cookie present. Enroll a device first." });
  }

  let device;
  try {
    ({ device } = await passkey.getDevice(deviceId));
  } catch {
    return res.status(401).json({ error: "Unknown device." });
  }

  const risk = await passkey.assessRisk({ deviceId, context: deviceContext ?? {} });
  if (risk.blocked) {
    return res.status(403).json({ error: "Device is revoked or blocked.", risk });
  }

  if (device.trustState === "revoked") {
    return res.status(403).json({ error: "This device has been revoked.", risk });
  }

  if (device.trustState === "pending") {
    return res.status(403).json({
      error: "Device is pending approval. Ask a trusted device to approve it.",
      trustState: "pending",
      risk,
    });
  }

  if (device.credentialId && credentialId && device.credentialId !== credentialId) {
    return res.status(401).json({ error: "Credential mismatch. WebAuthn assertion failed." });
  }

  await passkey.touchDevice(deviceId);

  const token = issueAccessToken({
    userId:     device.userId,
    deviceId:   device.deviceId,
    trustState: device.trustState,
  });

  res.cookie("access_token", token, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.json({
    message:    "Authenticated.",
    userId:     device.userId,
    deviceId:   device.deviceId,
    trustState: device.trustState,
    risk,
  });
});

export default router;
