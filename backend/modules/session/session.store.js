/**
 * session.store.js
 * In-memory session store that tracks the IP subnet bound to each active session.
 *
 * Key:  "userId:deviceId"  (matches the JWT claims)
 * Value: { subnet, ip, createdAt }
 *
 * When a user logs in, their /24 subnet (first 3 octets) is recorded.
 * On every authenticated request the middleware compares the current subnet
 * against the stored one.  A mismatch invalidates the session.
 *
 * Why /24 instead of the exact IP?
 *   CDNs (Railway/Fastly), ISP NAT pools, and mobile carriers often rotate
 *   the last octet between requests while keeping the same /24 block.
 *   Matching on the subnet avoids false positives while still catching
 *   genuinely different network origins.
 */

const sessions = new Map(); // "userId:deviceId" → { subnet, ip, createdAt }

/**
 * Extract the /24 subnet from an IPv4 address.
 * e.g. "167.82.160.49" → "167.82.160"
 * For IPv6 or unrecognised formats, returns the full address (strict match).
 */
function toSubnet(ip) {
  const parts = ip.split(".");
  if (parts.length === 4) return parts.slice(0, 3).join(".");
  return ip; // IPv6 or unknown — fall back to exact match
}

/**
 * Build a deterministic session key from the JWT claims.
 */
function sessionKey(userId, deviceId) {
  return `${userId}:${deviceId}`;
}

/**
 * Record (or replace) the IP subnet for this session.
 * Called at login time.
 */
export function bindSessionIp({ userId, deviceId, ip }) {
  const key = sessionKey(userId, deviceId);
  sessions.set(key, { subnet: toSubnet(ip), ip, createdAt: Date.now() });
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
 * Check whether the request IP's /24 subnet matches the session's bound subnet.
 * Returns { match: true } or { match: false, expected, actual }.
 */
export function verifySessionIp({ userId, deviceId, currentIp }) {
  const key = sessionKey(userId, deviceId);
  const entry = sessions.get(key);

  // No session recorded → treat as invalid (force re-login)
  if (!entry) {
    return { match: false, expected: null, actual: currentIp };
  }

  const currentSubnet = toSubnet(currentIp);

  return entry.subnet === currentSubnet
    ? { match: true }
    : { match: false, expected: entry.subnet, actual: currentSubnet };
}
