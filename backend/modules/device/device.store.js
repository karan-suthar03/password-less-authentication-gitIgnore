const devices = new Map();

const pendingApprovals = new Map();

export function saveDevice(device) {
  devices.set(device.deviceId, device);
  return device;
}

export function getDevice(deviceId) {
  return devices.get(deviceId) ?? null;
}

export function getDevicesByUser(userId) {
  return [...devices.values()].filter((d) => d.userId === userId);
}

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
