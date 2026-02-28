import express from "express";
import { createHash } from "crypto";
import { isEmailTaken } from "../modules/identity/identity.service.js";
import { issueSignupToken } from "../modules/auth/auth.service.js";
import { verifyIdentityDocument } from "../modules/kyc/kyc.service.js";
import { PasskeyError } from "../../backend SDK/index.js";
import passkey from "../passkey.js";

const router = express.Router();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";


router.post("/", async (req, res) => {
  const { email, govIdNumber } = req.body ?? {};

  if (!email || !govIdNumber) {
    return res.status(400).json({ error: "email and govIdNumber are required." });
  }

  if (isEmailTaken(email)) {
    return res.status(409).json({ error: "Email already registered." });
  }

  const kyc = verifyIdentityDocument({ govIdNumber });
  if (!kyc.passed) {
    return res.status(422).json({ error: kyc.reason });
  }

  try {
    await passkey.register(email);
  } catch (err) {
    if (err instanceof PasskeyError && err.status !== 409) {
      return res.status(err.status || 502).json({ error: err.message });
    }
  }

  try {
    const { token } = await passkey.login(email);

    const magicLink = `${FRONTEND_ORIGIN}/verify-email?token=${token}`;

    console.log(`\n────────────────────────────────────────────────`);
    console.log(`[EMAIL SIM] Magic link for ${email}:`);
    console.log(magicLink);
    console.log(`────────────────────────────────────────────────\n`);

    pendingKyc.set(token, {
      govIdHash: createHash("sha256").update(govIdNumber).digest("hex"),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    setTimeout(() => pendingKyc.delete(token), 10 * 60 * 1000 + 1000);

    return res.status(200).json({
      message: "KYC passed. A magic link has been sent to your email.",
      email,
    });

  } catch (err) {
    if (err instanceof PasskeyError) {
      return res.status(err.status || 502).json({ error: err.message });
    }
    throw err;
  }
});

const pendingKyc = new Map();


router.post("/confirm-email", async (req, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: "token is required." });

  try {
    const result = await passkey.verify(token);

    if (!result.authenticated) {
      return res.status(401).json({ error: "Invalid magic link." });
    }

    const { email } = result.user;
    const userId    = result.user.id;

    if (isEmailTaken(email)) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const kyc = pendingKyc.get(token);
    const govIdHash = kyc?.govIdHash ?? "";
    pendingKyc.delete(token);

    const signupToken = issueSignupToken({ email, govIdHash, userId });

    return res.status(200).json({
      message:     "Identity verified and email confirmed. Enroll your first device to continue.",
      email,
      signupToken,
    });

  } catch (err) {
    if (err instanceof PasskeyError) {
      return res.status(err.status || 401).json({ error: err.message });
    }
    throw err;
  }
});

export default router;
