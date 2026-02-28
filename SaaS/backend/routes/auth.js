import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { tenants, tenantsByEmail } from "../store/db.js";
import { generateToken, verifyToken } from "../middleware/auth.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (tenantsByEmail.has(email)) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 10);

  const tenant = {
    id,
    email,
    name: name || email.split("@")[0],
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  tenants.set(id, tenant);
  tenantsByEmail.set(email, id);

  const token = generateToken({ id, email });

  res.cookie("saas_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message: "Account created",
    tenant: { id, email, name: tenant.name },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const tenantId = tenantsByEmail.get(email);
  if (!tenantId) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const tenant = tenants.get(tenantId);
  const valid = await bcrypt.compare(password, tenant.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken({ id: tenant.id, email });

  res.cookie("saas_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: "Logged in",
    tenant: { id: tenant.id, email, name: tenant.name },
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("saas_token");
  res.json({ message: "Logged out" });
});

router.get("/me", verifyToken, (req, res) => {
  const tenant = tenants.get(req.tenant.id);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  res.json({
    id: tenant.id,
    email: tenant.email,
    name: tenant.name,
    createdAt: tenant.createdAt,
  });
});

export default router;
