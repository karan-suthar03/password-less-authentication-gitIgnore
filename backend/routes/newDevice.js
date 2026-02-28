import express from "express";
import { getUserByEmail } from "../modules/identity/identity.service.js";
import {
  createPendingDevice,
  createPendingApproval,
  approveDevice,
  getDevice,
  getPendingApproval,
  getPendingApprovalsByUser,
  revokeDevice,
} from "../modules/device/device.service.js";
import { deletePendingApproval } from "../modules/device/device.store.js";
import {
  requireAuth,
  requireTrustedDevice,
} from "../modules/auth/auth.service.js";
import { baseCookieOptions } from "../modules/cookie.config.js";

const router = express.Router();


router.post("/request", (req, res) => {
  const { email, credentialId, deviceContext } = req.body ?? {};

  if (!email) {
    return res.status(400).json({ error: "email is required." });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "No account found for that email." });
  }

  const contextSnapshot = {
    userAgent:    deviceContext?.userAgent    ?? null,
    platform:     deviceContext?.platform     ?? null,
    language:     deviceContext?.language     ?? null,
    timezone:     deviceContext?.timezone     ?? null,
    touchSupport: deviceContext?.touchSupport ?? null,
  };

  const device = createPendingDevice({
    userId: user.userId,
    contextSnapshot,
    credentialId: credentialId ?? null,
  });

  const approval = createPendingApproval({
    userId: user.userId,
    newDeviceId: device.deviceId,
    newDeviceContext: contextSnapshot,
  });

  res.cookie("device_id", device.deviceId, {
    ...baseCookieOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message: "Device registration pending. Ask a trusted device to approve this request.",
    requestId: approval.requestId,
    deviceId: device.deviceId,
  });
});


router.get("/status", (req, res) => {
  const deviceId = req.cookies?.device_id;
  if (!deviceId) {
    return res.status(400).json({ error: "No device cookie found." });
  }

  const device = getDevice(deviceId);
  if (!device) {
    return res.status(404).json({ error: "Device not found." });
  }

  res.json({
    deviceId: device.deviceId,
    trustState: device.trustState,
    enrolledAt: device.enrolledAt,
  });
});


router.get("/pending-approvals", requireAuth, requireTrustedDevice, (req, res) => {
  const approvals = getPendingApprovalsByUser(req.auth.userId);

  const enriched = approvals.map((a) => {
    const device = getDevice(a.newDeviceId);
    return {
      requestId:     a.requestId,
      newDeviceId:   a.newDeviceId,
      createdAt:     a.createdAt,
      platform:      a.newDeviceContext?.platform  ?? "unknown",
      timezone:      a.newDeviceContext?.timezone  ?? "unknown",
      userAgent:     a.newDeviceContext?.userAgent ?? "unknown",
      trustState:    device?.trustState ?? "unknown",
    };
  });

  res.json({ pendingApprovals: enriched });
});


router.post("/approve", requireAuth, requireTrustedDevice, (req, res) => {
  const { requestId } = req.body ?? {};
  if (!requestId) {
    return res.status(400).json({ error: "requestId is required." });
  }

  const approval = getPendingApproval(requestId);
  if (!approval || approval.userId !== req.auth.userId) {
    return res.status(404).json({ error: "Approval request not found." });
  }

  try {
    const device = approveDevice(requestId);
    res.json({
      message: "Device approved. It can now log in.",
      deviceId: device.deviceId,
      trustState: device.trustState,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.post("/deny", requireAuth, requireTrustedDevice, (req, res) => {
  const { requestId } = req.body ?? {};
  if (!requestId) {
    return res.status(400).json({ error: "requestId is required." });
  }

  const approval = getPendingApproval(requestId);
  if (!approval || approval.userId !== req.auth.userId) {
    return res.status(404).json({ error: "Approval request not found." });
  }

  try { revokeDevice(approval.newDeviceId); } catch {}
  deletePendingApproval(requestId);

  res.json({ message: "Device request denied and revoked." });
});

export default router;
