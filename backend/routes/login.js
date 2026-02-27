/**
 * routes/login.js
 * POST /login
 *
 * Passwordless login using the device_id cookie.
 * The device must be in "trusted" state.
 * The credentialId from the simulated WebAuthn assertion is verified
 * against the value stored during enrollment.
 */

import express from "express";
import { getDevice, touchDevice } from "../modules/device/device.service.js";
import { issueAccessToken } from "../modules/auth/auth.service.js";
import { assess, isBlocked } from "../modules/risk/risk.engine.js";

const router = express.Router();

router.post("/", (req, res) => {
  const deviceId = req.cookies.device_id;
  const { credentialId, deviceContext } = req.body ?? {};

  if (!deviceId) {
    return res.status(401).json({ error: "No device cookie present. Enroll a device first." });
  }

  const device = getDevice(deviceId);
  if (!device) {
    return res.status(401).json({ error: "Unknown device." });
  }

  // Risk assessment
  const risk = assess({ device, context: deviceContext ?? {} });
  if (isBlocked(risk)) {
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

  // Verify simulated WebAuthn credential (credentialId must match enrollment)
  if (device.credentialId && credentialId && device.credentialId !== credentialId) {
    return res.status(401).json({ error: "Credential mismatch. WebAuthn assertion failed." });
  }

  touchDevice(deviceId);

  const token = issueAccessToken({
    userId: device.userId,
    deviceId: device.deviceId,
    trustState: device.trustState,
  });

  res.json({
    message: "Authenticated.",
    token,
    userId: device.userId,
    deviceId: device.deviceId,
    trustState: device.trustState,
    risk,
  });
});

export default router;
