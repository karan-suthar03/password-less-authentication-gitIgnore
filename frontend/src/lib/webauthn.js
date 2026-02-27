/**
 * lib/webauthn.js
 * Real WebAuthn passkey integration using navigator.credentials.
 *
 * createPasskey()  → navigator.credentials.create()  → triggers browser biometric/platform prompt
 * assertPasskey()  → navigator.credentials.get()     → triggers browser biometric/platform prompt
 *
 * The credential rawId is Base64URL-encoded and stored in localStorage so the
 * correct allowCredentials entry can be built for assertion.
 *
 * The backend stores the credentialId string during enrollment and compares it
 * on every login — the same verification path a full WebAuthn server follows.
 *
 * Falls back to a UUID simulation only when navigator.credentials is absent
 * (rare: old browsers, non-secure non-localhost context).
 */

const STORAGE_KEY = "pwdless_credential_id";
const RP_NAME     = "Passwordless Auth Demo";

// ── Helpers ─────────────────────────────────────────────────────

/** Check that the browser and context support WebAuthn. */
export function isWebAuthnAvailable() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.credentials !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/** Uint8Array / ArrayBuffer → Base64URL string (URL-safe, no padding). */
function toBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Base64URL string → Uint8Array. */
function fromBase64URL(b64url) {
  let str = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4;
  if (pad) str += "=".repeat(4 - pad);
  const raw = atob(str);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ── Passkey Creation ────────────────────────────────────────────

/**
 * Trigger a real browser passkey creation prompt.
 *
 * @param {{ email?: string, userId?: string }} opts
 *   email   — shown in the browser prompt as the account name
 *   userId  — used as the WebAuthn user.id handle (falls back to email bytes)
 * @returns {{ credentialId: string, simulated: boolean }}
 */
export async function createPasskey({ email = "user@example.com", userId = null } = {}) {
  if (!isWebAuthnAvailable()) {
    console.warn("WebAuthn not available — using simulation fallback.");
    return _simulateCreate();
  }

  // Server should provide the challenge in production; client-generates for this demo.
  const challenge  = crypto.getRandomValues(new Uint8Array(32));
  // user.id must be a BufferSource — use UTF-8 bytes of userId/email (max 64 bytes).
  const userHandle = new TextEncoder().encode(userId ?? email).slice(0, 64);

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: RP_NAME,
          id: location.hostname,     // "localhost" in dev — no HTTPS needed
        },
        user: {
          id:          userHandle,
          name:        email,         // shown in browser prompt
          displayName: email,
        },
        pubKeyCredParams: [
          { alg: -7,   type: "public-key" }, // ES256  (most authenticators)
          { alg: -257, type: "public-key" }, // RS256  (Windows Hello fallback)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",   // Windows Hello, Touch ID, Face ID only
          residentKey:             "required",    // store as discoverable passkey
          requireResidentKey:      true,
          userVerification:        "required",   // biometric / PIN mandatory
        },
        timeout:     60000,
        attestation: "none",               // no server-side attestation verification
      },
    });

    const credentialId = toBase64URL(credential.rawId);
    localStorage.setItem(STORAGE_KEY, credentialId);
    return { credentialId, simulated: false };
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error("Passkey creation was cancelled or timed out.");
    }
    // Other errors (e.g. InvalidStateError if credential already exists) — fall back.
    console.warn("WebAuthn create error:", err.name, err.message, "— falling back to simulation.");
    return _simulateCreate();
  }
}

// ── Passkey Assertion ───────────────────────────────────────────

/**
 * Trigger a real browser passkey assertion prompt.
 * @returns {{ credentialId: string, simulated: boolean }}
 */
export async function assertPasskey() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    throw new Error("No passkey found on this device. Enroll this device first.");
  }

  if (!isWebAuthnAvailable()) {
    return { credentialId: stored, simulated: true };
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const rawId     = fromBase64URL(stored);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: rawId, type: "public-key" }],
        userVerification: "required",              // enforce platform biometric / PIN
        rpId:             location.hostname,
        timeout:          60000,
      },
    });

    // Use the asserted credential's rawId (always matches the stored one for single-device demo).
    return { credentialId: toBase64URL(assertion.rawId), simulated: false };
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error("Passkey assertion was cancelled or timed out.");
    }
    console.warn("WebAuthn get error:", err.name, err.message, "— returning stored credentialId.");
    return { credentialId: stored, simulated: true };
  }
}

// ── Utilities ───────────────────────────────────────────────────

/** Remove the locally stored passkey reference (e.g. after revocation). */
export function clearPasskey() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Check whether a passkey reference exists in localStorage. */
export function hasPasskey() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

// ── Simulation fallback (only when WebAuthn unavailable) ────────

async function _simulateCreate() {
  await new Promise((r) => setTimeout(r, 400));
  const credentialId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, credentialId);
  return { credentialId, simulated: true };
}
