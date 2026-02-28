import { Router } from "express";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { verifyToken } from "../middleware/auth.js";
import { apiKeys, apiKeysByKey, usageLogs } from "../store/db.js";

const router = Router();

router.use(verifyToken);

function generateApiKey() {
  return `pl_live_${crypto.randomBytes(16).toString("hex")}`;
}

router.get("/", (req, res) => {
  const tenantId = req.tenant.id;
  const keys = [];

  for (const [, record] of apiKeys) {
    if (record.tenantId === tenantId) {
      keys.push({
        id: record.id,
        projectName: record.projectName,
        key: record.key,
        active: record.active,
        createdAt: record.createdAt,
        lastUsedAt: record.lastUsedAt,
        requestCount: (usageLogs.get(record.id) || []).length,
      });
    }
  }

  keys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ keys });
});

router.post("/", (req, res) => {
  const { projectName } = req.body;

  if (!projectName) {
    return res.status(400).json({ error: "projectName is required" });
  }

  const id = uuid();
  const key = generateApiKey();

  const record = {
    id,
    tenantId: req.tenant.id,
    projectName,
    key,
    active: true,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };

  apiKeys.set(id, record);
  apiKeysByKey.set(key, id);

  res.status(201).json({
    message: "API key created",
    apiKey: {
      id,
      projectName,
      key,
      active: true,
      createdAt: record.createdAt,
    },
  });
});

router.patch("/:id/revoke", (req, res) => {
  const record = apiKeys.get(req.params.id);

  if (!record || record.tenantId !== req.tenant.id) {
    return res.status(404).json({ error: "API key not found" });
  }

  record.active = false;
  res.json({ message: "API key revoked", id: record.id });
});

router.patch("/:id/activate", (req, res) => {
  const record = apiKeys.get(req.params.id);

  if (!record || record.tenantId !== req.tenant.id) {
    return res.status(404).json({ error: "API key not found" });
  }

  record.active = true;
  res.json({ message: "API key activated", id: record.id });
});

router.delete("/:id", (req, res) => {
  const record = apiKeys.get(req.params.id);

  if (!record || record.tenantId !== req.tenant.id) {
    return res.status(404).json({ error: "API key not found" });
  }

  apiKeysByKey.delete(record.key);
  apiKeys.delete(record.id);
  usageLogs.delete(record.id);

  res.json({ message: "API key deleted" });
});

export default router;
