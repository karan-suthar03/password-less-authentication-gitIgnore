import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "saas-dev-secret-change-in-prod";

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(req, res, next) {
  const token =
    req.cookies?.saas_token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.tenant = decoded; // { id, email }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
