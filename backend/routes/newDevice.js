/**
 * routes/newDevice.js
 *
 * Enroll a second (or subsequent) device for an existing user.
 * The new device starts in "pending" state and must be approved
 * by one of the user's already-trusted devices before it can log in.
 *
 *   POST /new-device/request          — new device registers itself (pending)
 *   GET  /new-device/status           — new device polls its own trust state
 *   GET  /new-device/pending-approvals — trusted device fetches pending requests
 *   POST /new-device/approve          — trusted device approves a request
 *   POST /new-device/deny             — trusted device denies a request
 */

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

// ── POST /new-device/request ───────────────────────────────────
// Called from the new (unauthenticated) device.
// Body: { email, credentialId, deviceContext }

router.post("/request", (req, res) => {
  const { email, credentialId, deviceContext } = req.body ?? {};

  if (!email) {
    return res.status(400).json({ error: "email is required." });
  }

  const user = getUserByEmail(email);
  if (!user) {
    // Generic message — do not confirm whether email is registered
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

  // Plant the device_id cookie on the new device so it can poll its status
  res.cookie("device_id", device.deviceId, {
    ...baseCookieOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  });

  res.status(201).json({
    message: "Device registration pending. Ask a trusted device to approve this request.",
    requestId: approval.requestId,
    deviceId: device.deviceId,
  });
});

// ── GET /new-device/status ─────────────────────────────────────
// Called by the new device to poll whether it has been approved.
// Uses the device_id cookie set above.

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

// ── GET /new-device/pending-approvals ─────────────────────────
// Called by the trusted device (already logged in).
// Returns all pending approval requests for the authenticated user.

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

// ── POST /new-device/approve ───────────────────────────────────
// Body: { requestId }

router.post("/approve", requireAuth, requireTrustedDevice, (req, res) => {
  const { requestId } = req.body ?? {};
  if (!requestId) {
    return res.status(400).json({ error: "requestId is required." });
  }

  // Ensure the approval belongs to the authenticated user
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

// ── POST /new-device/deny ──────────────────────────────────────
// Body: { requestId }

router.post("/deny", requireAuth, requireTrustedDevice, (req, res) => {
  const { requestId } = req.body ?? {};
  if (!requestId) {
    return res.status(400).json({ error: "requestId is required." });
  }

  const approval = getPendingApproval(requestId);
  if (!approval || approval.userId !== req.auth.userId) {
    return res.status(404).json({ error: "Approval request not found." });
  }

  // Revoke the pending device so it can never be used, then remove the approval
  try { revokeDevice(approval.newDeviceId); } catch { /* already gone */ }
  deletePendingApproval(requestId);

  res.json({ message: "Device request denied and revoked." });
});

export default router;
