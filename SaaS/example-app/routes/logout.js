import express from "express";
import { baseCookieOptions } from "../modules/cookie.config.js";

const router = express.Router();

router.post("/", (_req, res) => {
  res.clearCookie("access_token", baseCookieOptions);
  res.json({ message: "Logged out." });
});

export default router;
