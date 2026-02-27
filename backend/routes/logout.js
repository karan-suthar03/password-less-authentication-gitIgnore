/**
 * routes/logout.js
 * POST /logout
 *
 * Clears the access_token httpOnly cookie.
 */

import express from "express";

const router = express.Router();

router.post("/", (_req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    sameSite: "lax",
  });
  res.json({ message: "Logged out." });
});

export default router;
