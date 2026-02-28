import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { apiKeys, usageLogs } from "../store/db.js";

const router = Router();
router.use(verifyToken);

router.get("/stats", (req, res) => {
  const tenantId = req.tenant.id;

  let totalKeys = 0;
  let activeKeys = 0;
  let totalRequests = 0;
  const last7Days = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last7Days[key] = 0;
  }

  for (const [, record] of apiKeys) {
    if (record.tenantId !== tenantId) continue;
    totalKeys++;
    if (record.active) activeKeys++;

    const logs = usageLogs.get(record.id) || [];
    totalRequests += logs.length;

    for (const log of logs) {
      const day = log.timestamp.slice(0, 10);
      if (day in last7Days) {
        last7Days[day]++;
      }
    }
  }

  res.json({
    totalKeys,
    activeKeys,
    totalRequests,
    requestsPerDay: Object.entries(last7Days).map(([date, count]) => ({
      date,
      count,
    })),
  });
});

router.get("/usage/:keyId", (req, res) => {
  const record = apiKeys.get(req.params.keyId);

  if (!record || record.tenantId !== req.tenant.id) {
    return res.status(404).json({ error: "API key not found" });
  }

  const logs = usageLogs.get(record.id) || [];

  res.json({
    keyId: record.id,
    projectName: record.projectName,
    total: logs.length,
    recent: logs.slice(-100).reverse(),
  });
});

export default router;
