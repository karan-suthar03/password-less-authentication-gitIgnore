/**
 * routes/revokeDevice.js
 * POST /revoke-device
 *
 * Called from a TRUSTED device (requires Bearer JWT with trustState=trusted).
 * Marks the target device as REVOKED, blocking future logins from it.
 * A user can revoke any of their own devices (including the current one).
 */

import express from "express";
import { requireAuth, requireTrustedDevice } from "../modules/auth/auth.service.js";
import { revokeDevice, getDevice } from "../modules/device/device.service.js";

const router = express.Router();

router.post("/", requireAuth, requireTrustedDevice, (req, res) => {
  const { deviceId } = req.body ?? {};

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  // Verify the device belongs to the authenticated user
  const device = getDevice(deviceId);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }
  if (device.userId !== req.auth.userId) {
    return res.status(403).json({ error: "Cannot revoke another user's device" });
  }

  try {
    const revoked = revokeDevice(deviceId);
    res.json({
      message: "Device has been revoked.",
      deviceId: revoked.deviceId,
      trustState: revoked.trustState,
    });
  } catch (err) {
    if (err.code === "DEVICE_NOT_FOUND") return res.status(404).json({ error: err.message });
    throw err;
  }
});

export default router;
