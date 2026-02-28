import express from "express";
import { getUserByEmail } from "../modules/identity/identity.service.js";
import { requireAuth, requireTrustedDevice } from "../modules/auth/auth.service.js";
import { baseCookieOptions } from "../modules/cookie.config.js";
import passkey from "../passkey.js";

const router = express.Router();


router.post("/request", async (req, res) => {
  const { email, credentialId, deviceContext } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "email is required." });

  const user = getUserByEmail(email);
  if (!user) return res.status(404).json({ error: "No account found for that email." });

  const contextSnapshot = {
    userAgent:    deviceContext?.userAgent    ?? null,
    platform:     deviceContext?.platform     ?? null,
    language:     deviceContext?.language     ?? null,
    timezone:     deviceContext?.timezone     ?? null,
    touchSupport: deviceContext?.touchSupport ?? null,
  };

  const { device }   = await passkey.createPendingDevice({ userId: user.userId, contextSnapshot, credentialId: credentialId ?? null });
  const { approval } = await passkey.createApproval({ userId: user.userId, newDeviceId: device.deviceId, newDeviceContext: contextSnapshot });

  res.cookie("device_id", device.deviceId, {
    ...baseCookieOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message:   "Device registration pending. Ask a trusted device to approve this request.",
    requestId: approval.requestId,
    deviceId:  device.deviceId,
  });
});


router.get("/status", async (req, res) => {
  const deviceId = req.cookies?.device_id;
  if (!deviceId) return res.status(400).json({ error: "No device cookie found." });

  try {
    const { device } = await passkey.getDevice(deviceId);
    res.json({ deviceId: device.deviceId, trustState: device.trustState, enrolledAt: device.enrolledAt });
  } catch {
    return res.status(404).json({ error: "Device not found." });
  }
});


router.get("/pending-approvals", requireAuth, requireTrustedDevice, async (req, res) => {
  const { approvals } = await passkey.getPendingApprovals(req.auth.userId);
  const enriched = approvals.map((a) => ({
    requestId:   a.requestId,
    newDeviceId: a.newDeviceId,
    createdAt:   a.createdAt,
    platform:    a.newDeviceContext?.platform  ?? "unknown",
    timezone:    a.newDeviceContext?.timezone  ?? "unknown",
    userAgent:   a.newDeviceContext?.userAgent ?? "unknown",
    trustState:  a.trustState ?? "unknown",
  }));
  res.json({ pendingApprovals: enriched });
});


router.post("/approve", requireAuth, requireTrustedDevice, async (req, res) => {
  const { requestId } = req.body ?? {};
  if (!requestId) return res.status(400).json({ error: "requestId is required." });

  try {
    const { device } = await passkey.approveDevice(requestId, req.auth.userId);
    res.json({ message: "Device approved. It can now log in.", deviceId: device.deviceId, trustState: device.trustState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.post("/deny", requireAuth, requireTrustedDevice, async (req, res) => {
  const { requestId } = req.body ?? {};
  if (!requestId) return res.status(400).json({ error: "requestId is required." });

  try {
    await passkey.denyDevice(requestId, req.auth.userId);
    res.json({ message: "Device request denied and revoked." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
