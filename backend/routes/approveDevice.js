/**
 * routes/approveDevice.js
 * POST /approve-device
 *
 * Called ONLY from a TRUSTED device (requires valid Bearer JWT with trustState=trusted).
 * Upgrades the pending device identified by requestId to "trusted",
 * allowing it to complete login.
 */

import express from "express";
import { requireAuth, requireTrustedDevice } from "../modules/auth/auth.service.js";
import {
  approveDevice,
  getPendingApproval,
  getDevicesByUser,
} from "../modules/device/device.service.js";

const router = express.Router();

router.post("/", requireAuth, requireTrustedDevice, (req, res) => {
  const { requestId } = req.body ?? {};

  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" });
  }

  // Verify the approval belongs to the same user as the approving device
  const approval = getPendingApproval(requestId);
  if (!approval) {
    return res.status(404).json({ error: "Approval request not found or already processed" });
  }
  if (approval.userId !== req.auth.userId) {
    return res.status(403).json({ error: "Cannot approve requests for another user" });
  }

  try {
    const device = approveDevice(requestId);
    res.json({
      message: "Device approved and trusted.",
      deviceId: device.deviceId,
      trustState: device.trustState,
    });
  } catch (err) {
    if (err.code === "APPROVAL_NOT_FOUND") return res.status(404).json({ error: err.message });
    if (err.code === "DEVICE_REVOKED") return res.status(409).json({ error: err.message });
    throw err;
  }
});

export default router;
