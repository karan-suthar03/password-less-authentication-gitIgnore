/**
 * webauthn.js
 * Real WebAuthn (FIDO2) helpers using the browser Credentials API.
 * Authenticator is locked to "platform" (Windows Hello, Touch ID, etc.)
 * with userVerification: "required" — no passwords, no roaming keys.
 */

/** ArrayBuffer → base64url */
function bufToBase64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** base64url → ArrayBuffer */
function base64urlToBuf(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}

/**
 * Register a new passkey using the platform authenticator.
 * Triggers Windows Hello / Face ID / fingerprint during sign-up.
 *
 * @param {{ userId: string, email: string }} opts
 * @returns {Promise<string>} base64url-encoded credential ID (store & send to backend)
 */
export async function registerCredential({ userId, email }) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,

      rp: {
        name: "Secure Auth",
        id: window.location.hostname,
      },

      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName: email,
      },

      pubKeyCredParams: [
        { alg: -7,   type: "public-key" }, // ES256  (preferred)
        { alg: -257, type: "public-key" }, // RS256  (fallback for TPM)
      ],

      authenticatorSelection: {
        authenticatorAttachment: "platform",  // Windows Hello / Touch ID only
        userVerification: "required",          // biometric / PIN mandatory
        residentKey: "required",               // must be a discoverable (resident) key
      },

      // WebAuthn L3 hint: show ONLY the built-in platform UI (no BT/USB/phone)
      hints: ["client-device"],

      timeout: 60_000,
      attestation: "none",
    },
  });

  const credentialId = bufToBase64url(credential.rawId);
  localStorage.setItem("credential_id", credentialId);
  return credentialId;
}

/**
 * Authenticate with an existing passkey (triggers Windows Hello prompt).
 *
 * @param {string} credentialId  base64url credential ID stored at registration
 * @returns {Promise<string>}    base64url credential ID confirmed by the authenticator
 */
export async function authenticateCredential(credentialId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,

      allowCredentials: [
        {
          id:   base64urlToBuf(credentialId),
          type: "public-key",
          transports: ["internal"],   // restrict to platform authenticator only
        },
      ],

      // WebAuthn L3 hint: show ONLY the built-in platform UI (no BT/USB/phone)
      hints: ["client-device"],

      userVerification: "required", // biometric / PIN mandatory
      timeout: 60_000,
    },
  });

  return bufToBase64url(assertion.rawId);
}
