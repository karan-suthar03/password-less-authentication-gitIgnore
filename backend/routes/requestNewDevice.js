/**
 * routes/requestNewDevice.js
 * POST /request-new-device
 *
 * Called from a NEW, untrusted device.
 * Creates a pending device record, sets a device_id cookie for the new device,
 * and returns a requestId that an existing trusted device must approve.
 *
 * NO JWT is issued here. The new device cannot authenticate until approved.
 */

import express from "express";
import { getUserByEmail } from "../modules/identity/identity.service.js";
import {
  createPendingDevice,
  createPendingApproval,
} from "../modules/device/device.service.js";
import { assess } from "../modules/risk/risk.engine.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { email, deviceContext, credentialId } = req.body ?? {};

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  const user = getUserByEmail(email);
  if (!user) {
    // Return same response to prevent user enumeration
    return res.status(202).json({
      message: "If that email is registered, an approval request has been created.",
    });
  }

  // Risk assessment: this is a NEW device, so risk is always high
  const risk = assess({ device: null, context: deviceContext ?? {} });

  // Create the pending device record
  const pendingDevice = createPendingDevice({
    userId: user.userId,
    contextSnapshot: deviceContext ?? {},
    credentialId: credentialId ?? null,
  });

  // Create the approval record that a trusted device will approve
  const approval = createPendingApproval({
    userId: user.userId,
    newDeviceId: pendingDevice.deviceId,
    newDeviceContext: deviceContext ?? {},
  });

  // Set device_id cookie for the new (pending) device.
  // Login will fail until a trusted device approves the request.
  res.cookie("device_id", pendingDevice.deviceId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 60 * 1000, // 30 min pending window
  });

  res.status(202).json({
    message: "Device access request created. Approve from a trusted device to continue.",
    requestId: approval.requestId,
    trustState: pendingDevice.trustState,
    risk,
  });
});

export default router;
