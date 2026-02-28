import { apiKeys, apiKeysByKey, usageLogs } from "../store/db.js";

export function validateApiKey(req, res, next) {
  const key = req.headers["x-api-key"];

  if (!key) {
    return res.status(401).json({ error: "Missing x-api-key header" });
  }

  const keyId = apiKeysByKey.get(key);
  if (!keyId) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const keyRecord = apiKeys.get(keyId);
  if (!keyRecord || !keyRecord.active) {
    return res.status(403).json({ error: "API key is revoked or inactive" });
  }

  keyRecord.lastUsedAt = new Date().toISOString();

  if (!usageLogs.has(keyId)) usageLogs.set(keyId, []);
  usageLogs.get(keyId).push({
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    ip: req.ip,
  });

  req.apiKey = keyRecord;
  next();
}
