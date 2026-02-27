/**
 * routes/signup.js
 *
 * Two-phase passwordless identity registration:
 *
 *   Phase 1 — POST /signup
 *     Client submits email + govIdNumber.
 *     Server verifies the government ID through a KYC check (simulated),
 *     checks email uniqueness, and sends a magic link to the user's email.
 *     No user record is created yet.
 *
 *   Phase 2 — POST /signup/confirm-email
 *     Client submits the magic-link token (extracted from the URL).
 *     Server validates the token, creates the user (unauthenticated, no devices),
 *     and issues a short-lived signupToken for first-device enrollment ONLY.
 */

import express from "express";
import { createUser, isEmailTaken } from "../modules/identity/identity.service.js";
import { issueSignupToken } from "../modules/auth/auth.service.js";
import { verifyIdentityDocument } from "../modules/kyc/kyc.service.js";
import {
  createEmailVerification,
  confirmEmailVerification,
} from "../modules/email/email.service.js";

const router = express.Router();

// ── Phase 1: Identity proof + magic link ───────────────────────

router.post("/", (req, res) => {
  const { email, govIdNumber } = req.body ?? {};

  if (!email || !govIdNumber) {
    return res.status(400).json({ error: "email and govIdNumber are required." });
  }

  // 1. Reject early if email is already taken
  if (isEmailTaken(email)) {
    return res.status(409).json({ error: "Email already registered." });
  }

  // 2. KYC: verify the government-issued ID (simulated)
  const kyc = verifyIdentityDocument({ govIdNumber, email });
  if (!kyc.passed) {
    return res.status(422).json({ error: kyc.reason });
  }

  // 3. Send a magic link email.
  //    The govIdNumber is stashed in the verification payload so Phase 2
  //    can create the user without the client resending it.
  createEmailVerification(email, { govIdNumber });

  res.status(200).json({
    message: "KYC passed. A magic link has been sent to your email.",
    email,
  });
});

// ── Phase 2: Confirm magic link → create user → issue signupToken

router.post("/confirm-email", (req, res) => {
  const { token } = req.body ?? {};

  if (!token) {
    return res.status(400).json({ error: "token is required." });
  }

  const result = confirmEmailVerification(token);
  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  const { email, payload } = result;
  const { govIdNumber } = payload;

  try {
    const user = createUser({
      email,
      govIdNumber,
      emailVerified: true,
      kycVerified: true,
    });

    // Issue a short-lived token authorising ONLY first-device enrollment.
    // This is NOT an authentication token.
    const signupToken = issueSignupToken(user.userId);

    res.status(201).json({
      message:
        "Identity verified and email confirmed. Enroll your first device to continue.",
      userId: user.userId,
      email,
      signupToken, // expires in 10 min — use it for /enroll-device
    });
  } catch (err) {
    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already registered." });
    }
    throw err;
  }
});

export default router;
