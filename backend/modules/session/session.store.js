/**
 * session.store.js
 * In-memory session store that tracks the IP address bound to each active session.
 *
 * Key:  "userId:deviceId"  (matches the JWT claims)
 * Value: { ip, createdAt }
 *
 * When a user logs in, their IP is recorded.
 * On every authenticated request the middleware compares the current IP
 * against the stored one.  A mismatch invalidates the session.
 */

const sessions = new Map(); // "userId:deviceId" → { ip, createdAt }

/**
 * Build a deterministic session key from the JWT claims.
 */
function sessionKey(userId, deviceId) {
  return `${userId}:${deviceId}`;
}

/**
 * Record (or replace) the IP address for this session.
 * Called at login time.
 */
export function bindSessionIp({ userId, deviceId, ip }) {
  const key = sessionKey(userId, deviceId);
  sessions.set(key, { ip, createdAt: Date.now() });
}

/**
 * Return the IP address currently bound to a session, or null.
 */
export function getSessionIp({ userId, deviceId }) {
  const key = sessionKey(userId, deviceId);
  const entry = sessions.get(key);
  return entry ? entry.ip : null;
}

/**
 * Remove the session entry (logout / invalidation).
 */
export function clearSession({ userId, deviceId }) {
  const key = sessionKey(userId, deviceId);
  sessions.delete(key);
}

/**
 * Check whether the request IP matches the session's bound IP.
 * Returns { match: true } or { match: false, expected, actual }.
 */
export function verifySessionIp({ userId, deviceId, currentIp }) {
  const boundIp = getSessionIp({ userId, deviceId });

  // No session recorded → treat as invalid (force re-login)
  if (!boundIp) {
    return { match: false, expected: null, actual: currentIp };
  }

  return boundIp === currentIp
    ? { match: true }
    : { match: false, expected: boundIp, actual: currentIp };
}
