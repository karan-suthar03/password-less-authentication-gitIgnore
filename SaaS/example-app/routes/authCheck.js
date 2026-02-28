import express from "express";
import { requireAuth } from "../modules/auth/auth.service.js";

const router = express.Router();

router.get("/", requireAuth, (_req, res) => {
  res.json({ authenticated: true });
});

export default router;
