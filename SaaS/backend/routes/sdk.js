import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { validateApiKey } from "../middleware/apiKey.js";

const router = Router();

router.use(validateApiKey);

const projectUsers            = new Map();
const tokens                  = new Map();
const projectDevices          = new Map();
const projectPendingApprovals = new Map();
const projectRecoveryKeys     = new Map();

const RECOVERY_SECRET = process.env.RECOVERY_SECRET ?? "saas-recovery-secret-change-in-production";
const RECOVERY_TTL    = "365d";


function getUserStore(keyId) {
  if (!projectUsers.has(keyId)) projectUsers.set(keyId, new Map());
  return projectUsers.get(keyId);
}

function getDeviceStore(keyId) {
  if (!projectDevices.has(keyId)) projectDevices.set(keyId, new Map());
  return projectDevices.get(keyId);
}

function getApprovalStore(keyId) {
  if (!projectPendingApprovals.has(keyId)) projectPendingApprovals.set(keyId, new Map());
  return projectPendingApprovals.get(keyId);
}

function getRecoveryStore(keyId) {
  if (!projectRecoveryKeys.has(keyId)) projectRecoveryKeys.set(keyId, new Map());
  return projectRecoveryKeys.get(keyId);
}


router.get("/auth/status", (req, res) => {
  res.json({
    valid: true,
    project: req.apiKey.projectName,
    message: "API key is active",
  });
});


router.post("/auth/register", (req, res) => {
  const { email, displayName } = req.body;
  const keyId = req.apiKey.id;

  if (!email) return res.status(400).json({ error: "email is required" });

  const users = getUserStore(keyId);

  if (users.has(email)) {
    return res.status(409).json({ error: "User already registered" });
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    displayName: displayName || email.split("@")[0],
    createdAt: new Date().toISOString(),
  };

  users.set(email, user);

  res.status(201).json({
    message: "User registered",
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

router.post("/auth/login", (req, res) => {
  const { email } = req.body;
  const keyId = req.apiKey.id;

  if (!email) return res.status(400).json({ error: "email is required" });

  const users = getUserStore(keyId);
  if (!users.has(email)) {
    return res.status(404).json({ error: "User not found. Register first." });
  }

  const token = crypto.randomBytes(32).toString("hex");

  tokens.set(token, {
    keyId,
    email,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  res.json({
    message: "Magic-link token created. Embed it in a link and send it to the user.",
    token,
    expiresInSeconds: 600,
  });
});

router.post("/auth/verify", (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: "token is required" });

  const record = tokens.get(token);
  if (!record) return res.status(404).json({ error: "Token not found or already consumed" });

  if (record.keyId !== req.apiKey.id) {
    return res.status(403).json({ error: "Token does not belong to this project" });
  }

  if (Date.now() > record.expiresAt) {
    tokens.delete(token);
    return res.status(410).json({ error: "Token expired" });
  }

  tokens.delete(token);

  const users = getUserStore(record.keyId);
  const user  = users?.get(record.email);

  res.json({
    message: "Authentication successful",
    authenticated: true,
    user: {
      id:          user?.id,
      email:       record.email,
      displayName: user?.displayName,
    },
  });
});


router.get("/auth/users", (req, res) => {
  const users = getUserStore(req.apiKey.id);
  const list = [...users.values()];
  res.json({ users: list });
});

router.post("/device/enroll", (req, res) => {
  const { userId, contextSnapshot, credentialId } = req.body;
  const keyId = req.apiKey.id;

  if (!userId) return res.status(400).json({ error: "userId is required" });

  const devices = getDeviceStore(keyId);
  const device = {
    deviceId:        crypto.randomUUID(),
    userId,
    trustState:      "trusted",
    enrolledAt:      Date.now(),
    lastSeen:        Date.now(),
    contextSnapshot: contextSnapshot ?? {},
    credentialId:    credentialId ?? null,
  };
  devices.set(device.deviceId, device);

  res.status(201).json({ device });
});

router.post("/device/create-pending", (req, res) => {
  const { userId, contextSnapshot, credentialId } = req.body;
  const keyId = req.apiKey.id;

  if (!userId) return res.status(400).json({ error: "userId is required" });

  const devices = getDeviceStore(keyId);
  const device = {
    deviceId:        crypto.randomUUID(),
    userId,
    trustState:      "pending",
    enrolledAt:      Date.now(),
    lastSeen:        Date.now(),
    contextSnapshot: contextSnapshot ?? {},
    credentialId:    credentialId ?? null,
  };
  devices.set(device.deviceId, device);

  res.status(201).json({ device });
});

router.post("/device/create-approval", (req, res) => {
  const { userId, newDeviceId, newDeviceContext } = req.body;
  const keyId = req.apiKey.id;

  if (!userId || !newDeviceId) {
    return res.status(400).json({ error: "userId and newDeviceId are required" });
  }

  const approvals = getApprovalStore(keyId);
  const approval = {
    requestId:        crypto.randomUUID(),
    userId,
    newDeviceId,
    newDeviceContext: newDeviceContext ?? {},
    createdAt:        Date.now(),
  };
  approvals.set(approval.requestId, approval);

  res.status(201).json({ approval });
});

router.post("/device/touch", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId is required" });

  const devices = getDeviceStore(req.apiKey.id);
  const device  = devices.get(deviceId);
  if (!device)  return res.status(404).json({ error: "Device not found" });

  device.lastSeen = Date.now();
  devices.set(deviceId, device);
  res.json({ device });
});


router.post("/device/revoke", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId is required" });

  const devices = getDeviceStore(req.apiKey.id);
  const device  = devices.get(deviceId);
  if (!device)  return res.status(404).json({ error: "Device not found" });

  device.trustState = "revoked";
  devices.set(deviceId, device);
  res.json({ device });
});

router.post("/device/approve", (req, res) => {
  const { requestId, userId } = req.body;
  const keyId = req.apiKey.id;
  if (!requestId) return res.status(400).json({ error: "requestId is required" });

  const approvals = getApprovalStore(keyId);
  const approval  = approvals.get(requestId);
  if (!approval) return res.status(404).json({ error: "Approval request not found" });

  if (userId && approval.userId !== userId) {
    return res.status(404).json({ error: "Approval request not found" });
  }

  const devices = getDeviceStore(keyId);
  const device  = devices.get(approval.newDeviceId);
  if (!device) return res.status(404).json({ error: "Device not found" });
  if (device.trustState === "revoked") {
    return res.status(400).json({ error: "Device has been revoked" });
  }

  device.trustState = "trusted";
  devices.set(device.deviceId, device);
  approvals.delete(requestId);

  res.json({ device });
});

router.post("/device/deny", (req, res) => {
  const { requestId, userId } = req.body;
  const keyId = req.apiKey.id;
  if (!requestId) return res.status(400).json({ error: "requestId is required" });

  const approvals = getApprovalStore(keyId);
  const approval  = approvals.get(requestId);
  if (!approval) return res.status(404).json({ error: "Approval request not found" });

  if (userId && approval.userId !== userId) {
    return res.status(404).json({ error: "Approval request not found" });
  }

  const devices = getDeviceStore(keyId);
  const device  = devices.get(approval.newDeviceId);
  if (device) {
    device.trustState = "revoked";
    devices.set(device.deviceId, device);
  }

  approvals.delete(requestId);
  res.json({ message: "Device request denied and revoked." });
});

router.get("/device/user/:userId", (req, res) => {
  const devices     = getDeviceStore(req.apiKey.id);
  const userDevices = [...devices.values()].filter(d => d.userId === req.params.userId);
  res.json({ devices: userDevices });
});

router.get("/device/pending-approvals/:userId", (req, res) => {
  const approvals     = getApprovalStore(req.apiKey.id);
  const devices       = getDeviceStore(req.apiKey.id);
  const userApprovals = [...approvals.values()].filter(a => a.userId === req.params.userId);

  const enriched = userApprovals.map(a => {
    const device = devices.get(a.newDeviceId);
    return { ...a, trustState: device?.trustState ?? "unknown" };
  });

  res.json({ approvals: enriched });
});

router.get("/device/:deviceId", (req, res) => {
  const devices = getDeviceStore(req.apiKey.id);
  const device  = devices.get(req.params.deviceId);
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json({ device });
});

const RISK_RULES = [
  {
    name: "new_device",
    test: ({ device }) => device == null || device.trustState === "pending",
    level: "high",
  },
  {
    name: "revoked_device",
    test: ({ device }) => device?.trustState === "revoked",
    level: "critical",
  },
  {
    name: "timezone_shift",
    test: ({ device, context }) =>
      device?.contextSnapshot?.timezone && context?.timezone &&
      device.contextSnapshot.timezone !== context.timezone,
    level: "medium",
  },
  {
    name: "platform_change",
    test: ({ device, context }) =>
      device?.contextSnapshot?.platform && context?.platform &&
      device.contextSnapshot.platform !== context.platform,
    level: "medium",
  },
  {
    name: "language_change",
    test: ({ device, context }) =>
      device?.contextSnapshot?.language && context?.language &&
      device.contextSnapshot.language !== context.language,
    level: "low",
  },
  {
    name: "touch_support_change",
    test: ({ device, context }) =>
      device?.contextSnapshot?.touchSupport != null && context?.touchSupport != null &&
      device.contextSnapshot.touchSupport !== context.touchSupport,
    level: "low",
  },
];

const LEVEL_RANK = { low: 1, medium: 2, high: 3, critical: 4 };


router.post("/risk/assess", (req, res) => {
  const { deviceId, context } = req.body;
  const keyId = req.apiKey.id;

  let device = null;
  if (deviceId) {
    const devices = getDeviceStore(keyId);
    device = devices.get(deviceId) ?? null;
    if (!device) return res.status(404).json({ error: "Device not found" });
  }

  const triggered = [];
  let maxRank = 0;

  for (const rule of RISK_RULES) {
    if (rule.test({ device, context: context ?? {} })) {
      triggered.push(rule.name);
      maxRank = Math.max(maxRank, LEVEL_RANK[rule.level]);
    }
  }

  const level   = Object.keys(LEVEL_RANK).find(k => LEVEL_RANK[k] === maxRank) ?? "low";
  const blocked = level === "critical";

  res.json({ level, score: maxRank, triggered, blocked });
});


router.post("/recovery/generate", (req, res) => {
  const { userId, email } = req.body;
  const keyId = req.apiKey.id;

  if (!userId || !email) {
    return res.status(400).json({ error: "userId and email are required" });
  }

  const recordKeyId = crypto.randomBytes(16).toString("hex");

  const token = jwt.sign(
    { userId, email, keyId: recordKeyId, projectKeyId: keyId, scope: "backdoor" },
    RECOVERY_SECRET,
    { expiresIn: RECOVERY_TTL },
  );

  const recoveryKeys = getRecoveryStore(keyId);
  recoveryKeys.set(recordKeyId, { userId, issuedAt: Date.now(), revoked: false });

  const content = {
    _warning:
      "KEEP THIS FILE SAFE. It is the ONLY way to manage your devices if all of them are compromised. Do NOT share it.",
    version:  1,
    email,
    keyId:    recordKeyId,
    token,
    issuedAt: new Date().toISOString(),
  };

  const fileName = `recovery-key-${email.replace(/[^a-zA-Z0-9]/g, "_")}.json`;

  res.status(201).json({ fileName, content });
});


router.post("/recovery/verify", (req, res) => {
  const { token } = req.body;
  const keyId = req.apiKey.id;

  if (!token) return res.status(400).json({ error: "token is required" });

  let payload;
  try {
    payload = jwt.verify(token, RECOVERY_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired recovery key." });
  }

  if (payload.scope !== "backdoor") {
    return res.status(401).json({ error: "Invalid recovery key scope" });
  }

  if (payload.projectKeyId !== keyId) {
    return res.status(403).json({ error: "Recovery key does not belong to this project" });
  }

  const recoveryKeys = getRecoveryStore(keyId);
  const record = recoveryKeys.get(payload.keyId);
  if (!record)        return res.status(404).json({ error: "Recovery key not recognised" });
  if (record.revoked) return res.status(401).json({ error: "Recovery key has been revoked" });

  res.json({
    valid:  true,
    userId: payload.userId,
    email:  payload.email,
    keyId:  payload.keyId,
  });
});

export default router;
