import express from "express";
import { createHash } from "crypto";
import { isEmailTaken } from "../modules/identity/identity.service.js";
import { issueSignupToken } from "../modules/auth/auth.service.js";
import { verifyIdentityDocument } from "../modules/kyc/kyc.service.js";
import {
  createEmailVerification,
  confirmEmailVerification,
} from "../modules/email/email.service.js";

const router = express.Router();


router.post("/", (req, res) => {
  const { email, govIdNumber } = req.body ?? {};

  if (!email || !govIdNumber) {
    return res.status(400).json({ error: "email and govIdNumber are required." });
  }

  if (isEmailTaken(email)) {
    return res.status(409).json({ error: "Email already registered." });
  }

  const kyc = verifyIdentityDocument({ govIdNumber, email });
  if (!kyc.passed) {
    return res.status(422).json({ error: kyc.reason });
  }

  createEmailVerification(email, { govIdNumber });

  res.status(200).json({
    message: "KYC passed. A magic link has been sent to your email.",
    email,
  });
});

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

  if (isEmailTaken(email)) {
    return res.status(409).json({ error: "Email already registered." });
  }

  const govIdHash = createHash("sha256").update(govIdNumber).digest("hex");

  const signupToken = issueSignupToken({ email, govIdHash });

  res.status(200).json({
    message:
      "Identity verified and email confirmed. Enroll your first device to continue.",
    email,
    signupToken,
  });
});

export default router;
