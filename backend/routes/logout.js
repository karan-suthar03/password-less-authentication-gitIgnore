/**
 * routes/logout.js
 * POST /logout
 *
 * Clears the access_token httpOnly cookie.
 */

import express from "express";
import { verifyAccessToken } from "../modules/auth/auth.service.js";
import { clearSession } from "../modules/session/session.store.js";

const router = express.Router();

router.post("/", (req, res) => {
  // Best-effort: clear the session-IP binding if the token is still valid.
  try {
    const payload = verifyAccessToken(req.cookies?.access_token);
    clearSession({ userId: payload.userId, deviceId: payload.deviceId });
  } catch { /* token may already be expired — that's fine */ }

  res.clearCookie("access_token", {
    httpOnly: true,
    sameSite: "lax",
  });
  res.json({ message: "Logged out." });
});

export default router;
