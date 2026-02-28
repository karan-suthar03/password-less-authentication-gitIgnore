import express from "express";
import { issueBackdoorToken, requireBackdoorAuth } from "../modules/auth/auth.service.js";
import { baseCookieOptions } from "../modules/cookie.config.js";
import passkey from "../passkey.js";

const router = express.Router();


router.post("/login", async (req, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: "Recovery key token is required." });

  let payload;
  try {
    payload = await passkey.verifyRecoveryKey(token);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired recovery key.", detail: err.message });
  }

  const backdoorToken = issueBackdoorToken({
    userId: payload.userId,
    email:  payload.email,
    keyId:  payload.keyId,
  });

  res.cookie("backdoor_token", backdoorToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.json({ message: "Backdoor session active. You may now manage your devices.", email: payload.email });
});


router.get("/devices", requireBackdoorAuth, async (req, res) => {
  const { devices } = await passkey.getDevicesByUser(req.backdoorAuth.userId);
  const sanitised = devices.map((d) => ({
    deviceId:   d.deviceId,
    trustState: d.trustState,
    enrolledAt: d.enrolledAt,
    lastSeen:   d.lastSeen,
    platform:   d.contextSnapshot?.platform  ?? "unknown",
    userAgent:  d.contextSnapshot?.userAgent  ?? "unknown",
  }));
  res.json({ devices: sanitised });
});


router.post("/revoke", requireBackdoorAuth, async (req, res) => {
  const { deviceId } = req.body ?? {};
  if (!deviceId) return res.status(400).json({ error: "deviceId is required." });

  const { devices } = await passkey.getDevicesByUser(req.backdoorAuth.userId);
  const target = devices.find((d) => d.deviceId === deviceId);

  if (!target)                          return res.status(404).json({ error: "Device not found for this account." });
  if (target.trustState === "revoked")  return res.status(409).json({ error: "Device is already revoked." });

  try {
    const { device: revoked } = await passkey.revokeDevice(deviceId);
    res.json({ message: "Device has been blocklisted.", deviceId: revoked.deviceId, trustState: revoked.trustState });
  } catch (err) {
    console.error("[BACKDOOR] revokeDevice failed:", err.message, err.response?.data ?? "");
    res.status(err.response?.status ?? 500).json({ error: err.message });
  }
});


router.post("/logout", (req, res) => {
  res.clearCookie("backdoor_token", baseCookieOptions);
  res.json({ message: "Backdoor session ended." });
});

export default router;
