import express from "express";
import { requireAuth, requireTrustedDevice } from "../modules/auth/auth.service.js";
import passkey from "../passkey.js";

const router = express.Router();

router.get("/", requireAuth, requireTrustedDevice, async (req, res) => {
  try {
    const { device } = await passkey.getDevice(req.auth.deviceId);
    if (!device || device.trustState === "revoked") {
      return res.status(403).json({ error: "Device has been revoked." });
    }
  } catch {
    return res.status(403).json({ error: "Device has been revoked." });
  }

  res.json({
    message:    "Access granted to protected resource.",
    userId:     req.auth.userId,
    deviceId:   req.auth.deviceId,
    trustState: req.auth.trustState,
    timestamp:  new Date().toISOString(),
    data: {
      secret: "This data is only accessible with a trusted, non-revoked device.",
    },
  });
});

export default router;
