/**
 * lib/api.js
 * Typed fetch wrappers for the passwordless auth backend.
 * All requests use credentials: "include" for HTTP-only cookie handling.
 */

const BASE = ""; // Vite dev proxy forwards /api-paths to localhost:3000

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

// ── Identity ────────────────────────────────────────────────────

/** POST /signup */
export const signup = (email, govIdNumber) =>
  request("POST", "/signup", { email, govIdNumber });

// ── Device Enrollment ──────────────────────────────────────────

/** POST /enroll-device */
export const enrollDevice = (signupToken, deviceContext, credentialId) =>
  request("POST", "/enroll-device", { signupToken, deviceContext, credentialId });

// ── Authentication ──────────────────────────────────────────────

/** POST /login */
export const login = (credentialId, deviceContext) =>
  request("POST", "/login", { credentialId, deviceContext });

// ── New Device Flow ────────────────────────────────────────────

/** POST /request-new-device */
export const requestNewDevice = (email, deviceContext, credentialId) =>
  request("POST", "/request-new-device", { email, deviceContext, credentialId });

/** POST /approve-device  (requires trusted JWT) */
export const approveDevice = (requestId, token) =>
  request("POST", "/approve-device", { requestId }, token);

// ── Device Management ──────────────────────────────────────────

/** POST /revoke-device  (requires trusted JWT) */
export const revokeDevice = (deviceId, token) =>
  request("POST", "/revoke-device", { deviceId }, token);

// ── Protected Resource ─────────────────────────────────────────

/** GET /protected  (requires trusted JWT) */
export const getProtected = (token) =>
  request("GET", "/protected", undefined, token);
