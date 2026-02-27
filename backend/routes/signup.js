/**
 * routes/signup.js
 * POST /signup
 *
 * One-time identity registration.
 * No passwords. No authentication tokens issued here.
 * Returns a short-lived signup_token for first-device enrollment ONLY.
 */

import express from "express";
import { createUser } from "../modules/identity/identity.service.js";
import { issueSignupToken } from "../modules/auth/auth.service.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { email, govIdNumber } = req.body ?? {};

  if (!email || !govIdNumber) {
    return res.status(400).json({ error: "email and govIdNumber are required" });
  }

  try {
    const user = createUser({ email, govIdNumber });

    // Issue a short-lived token authorising ONLY first-device enrollment.
    // This is NOT an authentication token.
    const signupToken = issueSignupToken(user.userId);

    res.status(201).json({
      message: "Identity registered. Enroll your first device to continue.",
      userId: user.userId,
      signupToken, // expires in 10 min — use it for /enroll-device
    });
  } catch (err) {
    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already registered" });
    }
    throw err;
  }
});

export default router;
