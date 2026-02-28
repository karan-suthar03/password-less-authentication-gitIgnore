
import { v4 as uuid } from "uuid";
import * as store from "./device.store.js";

export function enrollTrustedDevice({ userId, contextSnapshot, credentialId }) {
  const device = {
    deviceId: uuid(),
    userId,
    trustState: "trusted",
    enrolledAt: Date.now(),
    lastSeen: Date.now(),
    contextSnapshot,
    credentialId: credentialId ?? null,
  };
  return store.saveDevice(device);
}

export function createPendingDevice({ userId, contextSnapshot, credentialId }) {
  const device = {
    deviceId: uuid(),
    userId,
    trustState: "pending",
    enrolledAt: Date.now(),
    lastSeen: Date.now(),
    contextSnapshot,
    credentialId: credentialId ?? null,
  };
  return store.saveDevice(device);
}

export function createPendingApproval({ userId, newDeviceId, newDeviceContext }) {
  const approval = {
    requestId: uuid(),
    userId,
    newDeviceId,
    newDeviceContext,
    createdAt: Date.now(),
  };
  return store.savePendingApproval(approval);
}

export function approveDevice(requestId) {
  const approval = store.getPendingApproval(requestId);
  if (!approval) {
    throw Object.assign(new Error("Approval request not found"), { code: "APPROVAL_NOT_FOUND" });
  }

  const device = store.getDevice(approval.newDeviceId);
  if (!device) {
    throw Object.assign(new Error("Device in approval not found"), { code: "DEVICE_NOT_FOUND" });
  }
  if (device.trustState === "revoked") {
    throw Object.assign(new Error("Device has been revoked"), { code: "DEVICE_REVOKED" });
  }

  device.trustState = "trusted";
  store.saveDevice(device);
  store.deletePendingApproval(requestId);

  return device;
}



export function revokeDevice(deviceId) {
  const device = store.getDevice(deviceId);
  if (!device) {
    throw Object.assign(new Error("Device not found"), { code: "DEVICE_NOT_FOUND" });
  }
  device.trustState = "revoked";
  store.saveDevice(device);
  return device;
}



export function getDevice(deviceId) {
  return store.getDevice(deviceId);
}

export function getDevicesByUser(userId) {
  return store.getDevicesByUser(userId);
}

export function getPendingApproval(requestId) {
  return store.getPendingApproval(requestId);
}

export function getPendingApprovalsByUser(userId) {
  return store.getPendingApprovalsByUser(userId);
}

export function touchDevice(deviceId) {
  const device = store.getDevice(deviceId);
  if (device) {
    device.lastSeen = Date.now();
    store.saveDevice(device);
  }
}
