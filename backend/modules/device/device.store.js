/**
 * device.store.js
 * Framework module — raw in-memory storage for Device records.
 * No business logic here; only CRUD primitives.
 */

// devices: deviceId → Device
const devices = new Map();

// pendingApprovals: requestId → PendingDeviceApproval
const pendingApprovals = new Map();

// ── Device CRUD ────────────────────────────────────────────────

export function saveDevice(device) {
  devices.set(device.deviceId, device);
  return device;
}

export function getDevice(deviceId) {
  return devices.get(deviceId) ?? null;
}

/** All devices belonging to a specific user */
export function getDevicesByUser(userId) {
  return [...devices.values()].filter((d) => d.userId === userId);
}

// ── Pending Approval CRUD ─────────────────────────────────────

export function savePendingApproval(approval) {
  pendingApprovals.set(approval.requestId, approval);
  return approval;
}

export function getPendingApproval(requestId) {
  return pendingApprovals.get(requestId) ?? null;
}

export function deletePendingApproval(requestId) {
  pendingApprovals.delete(requestId);
}

export function getPendingApprovalsByUser(userId) {
  return [...pendingApprovals.values()].filter((a) => a.userId === userId);
}
