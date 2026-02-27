/**
 * routes/authCheck.js
 * GET /auth/check
 *
 * Lightweight session verification.
 * Returns 200 if the access_token cookie holds a valid JWT, 401 otherwise.
 */

import express from "express";
import { requireAuth } from "../modules/auth/auth.service.js";

const router = express.Router();

router.get("/", requireAuth, (_req, res) => {
  res.json({ authenticated: true });
});

export default router;
