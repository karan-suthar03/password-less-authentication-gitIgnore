import express from "express";
import { v4 as uuid } from "uuid";
import deviceStore from "../store/deviceStore.js";

const router = express.Router();

router.post("/", (req, res) => {
  const deviceId = uuid();
  const metadata = req.body || {};

  deviceStore.create({
    deviceId,
    userId: "user-1",
    createdAt: Date.now(),
    lastSeen: Date.now(),
    metadata
  });

  // Store deviceId as secure cookie
  res.cookie("device_id", deviceId, {
    httpOnly: true,
    sameSite: "lax"
  });

  res.json({
    message: "Device enrolled (passwordless)",
    deviceId
  });
});

export default router;