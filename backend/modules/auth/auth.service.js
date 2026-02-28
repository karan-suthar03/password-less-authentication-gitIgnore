import jwt from "jsonwebtoken";
import { baseCookieOptions } from "../cookie.config.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_TTL = "15m";


const SIGNUP_TOKEN_SECRET = process.env.SIGNUP_TOKEN_SECRET ?? "signup-secret-change-in-production";
const SIGNUP_TOKEN_TTL = "10m";


const BACKDOOR_SECRET = process.env.BACKDOOR_SECRET ?? "backdoor-secret-change-in-production";
const BACKDOOR_TTL = "15m";


export function issueAccessToken({ userId, deviceId, trustState }) {
  return jwt.sign({ userId, deviceId, trustState }, JWT_SECRET, { expiresIn: JWT_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function issueSignupToken({ email, govIdHash }) {
  return jwt.sign(
    { email, govIdHash, purpose: "first-device-enrollment" },
    SIGNUP_TOKEN_SECRET,
    { expiresIn: SIGNUP_TOKEN_TTL },
  );
}

export function verifySignupToken(token) {
  const payload = jwt.verify(token, SIGNUP_TOKEN_SECRET);
  if (payload.purpose !== "first-device-enrollment") {
    throw new Error("Invalid token purpose");
  }
  return payload;
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireTrustedDevice(req, res, next) {
  if (req.auth?.trustState !== "trusted") {
    return res.status(403).json({ error: "Action requires a trusted device" });
  }
  next();
}

export function issueBackdoorToken({ userId, email, keyId }) {
  return jwt.sign(
    { userId, email, keyId, scope: "backdoor" },
    BACKDOOR_SECRET,
    { expiresIn: BACKDOOR_TTL },
  );
}

export function verifyBackdoorToken(token) {
  const payload = jwt.verify(token, BACKDOOR_SECRET);
  if (payload.scope !== "backdoor") {
    throw new Error("Invalid token scope");
  }
  return payload;
}

export function requireBackdoorAuth(req, res, next) {
  const token = req.cookies?.backdoor_token;
  if (!token) return res.status(401).json({ error: "No backdoor session. Upload your recovery key file to log in." });

  try {
    req.backdoorAuth = verifyBackdoorToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired backdoor session." });
  }
}
