/**
 * cookie.config.js
 * Centralised cookie options for cross-origin (remote) deployments.
 *
 * When FRONTEND_ORIGIN starts with "https://" (i.e. the frontend is on a
 * different domain served over TLS) we must use:
 *   sameSite: "none"   — so the browser sends cookies on cross-origin requests
 *   secure:   true     — required by browsers when sameSite is "none"
 *
 * For local development (http://localhost) we keep sameSite: "lax".
 */

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const isSecure = frontendOrigin.startsWith("https://");

/** Base options shared by every cookie this server sets. */
export const baseCookieOptions = {
  httpOnly: true,
  sameSite: isSecure ? "none" : "lax",
  ...(isSecure && { secure: true }),
};
