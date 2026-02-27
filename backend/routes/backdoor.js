/**
 * routes/backdoor.js
 *
 * Restricted emergency access for device management ONLY.
 * Authenticated exclusively via a recovery key file — no cookies, no passkeys.
 *
 *   POST /backdoor/login       — Upload recovery key file → get restricted session
 *   GET  /backdoor/devices     — List all enrolled devices (backdoor session only)
 *   POST /backdoor/revoke      — Revoke / blocklist a device  (backdoor session only)
 *   POST /backdoor/logout      — Clear the backdoor session cookie
 */

import express from "express";
import { verifyRecoveryKey } from "../modules/recovery/recovery.service.js";
import {
  getDevicesByUser,
  revokeDevice,
} from "../modules/device/device.service.js";
import { issueBackdoorToken, requireBackdoorAuth } from "../modules/auth/auth.service.js";
import { baseCookieOptions } from "../modules/cookie.config.js";

const router = express.Router();

// ── POST /backdoor/login ───────────────────────────────────────
// Body: { token: "<JWT from recovery key file>" }

router.post("/login", (req, res) => {
  const { token } = req.body ?? {};

  if (!token) {
    return res.status(400).json({ error: "Recovery key token is required." });
  }

  let payload;
  try {
    payload = verifyRecoveryKey(token);
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired recovery key.",
      detail: err.message,
    });
  }

  // Issue a short-lived backdoor JWT (scope: "backdoor").
  // This token can ONLY be used on /backdoor/* endpoints.
  const backdoorToken = issueBackdoorToken({
    userId: payload.userId,
    email: payload.email,
    keyId: payload.keyId,
  });

  res.cookie("backdoor_token", backdoorToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.json({
    message: "Backdoor session active. You may now manage your devices.",
    email: payload.email,
  });
});

// ── GET /backdoor/devices ──────────────────────────────────────
// Requires a valid backdoor_token cookie.

router.get("/devices", requireBackdoorAuth, (req, res) => {
  const devices = getDevicesByUser(req.backdoorAuth.userId);

  const sanitised = devices.map((d) => ({
    deviceId: d.deviceId,
    trustState: d.trustState,
    enrolledAt: d.enrolledAt,
    lastSeen: d.lastSeen,
    platform: d.contextSnapshot?.platform ?? "unknown",
    userAgent: d.contextSnapshot?.userAgent ?? "unknown",
  }));

  res.json({ devices: sanitised });
});

// ── POST /backdoor/revoke ──────────────────────────────────────
// Body: { deviceId: "<id>" }

router.post("/revoke", requireBackdoorAuth, (req, res) => {
  const { deviceId } = req.body ?? {};

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required." });
  }

  // Ensure the device belongs to the authenticated user
  const devices = getDevicesByUser(req.backdoorAuth.userId);
  const target = devices.find((d) => d.deviceId === deviceId);

  if (!target) {
    return res.status(404).json({ error: "Device not found for this account." });
  }

  if (target.trustState === "revoked") {
    return res.status(409).json({ error: "Device is already revoked." });
  }

  const revoked = revokeDevice(deviceId);

  res.json({
    message: "Device has been blocklisted.",
    deviceId: revoked.deviceId,
    trustState: revoked.trustState,
  });
});

// ── POST /backdoor/logout ──────────────────────────────────────

router.post("/logout", (req, res) => {
  res.clearCookie("backdoor_token", baseCookieOptions);
  res.json({ message: "Backdoor session ended." });
});

export default router;
