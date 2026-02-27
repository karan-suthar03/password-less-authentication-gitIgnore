import api from "./api";

/**
 * Collect a rich device-context snapshot from browser APIs.
 * Sent during enrollment (baseline) and login (comparison).
 */
function gatherDeviceContext() {
  return {
    userAgent:           navigator.userAgent,
    platform:            navigator.userAgentData?.platform ?? navigator.platform,
    language:            navigator.language,
    languages:           [...(navigator.languages ?? [])],
    timezone:            Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset:      new Date().getTimezoneOffset(),
    screenWidth:         screen.width,
    screenHeight:        screen.height,
    colorDepth:          screen.colorDepth,
    deviceMemory:        navigator.deviceMemory ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    touchSupport:        navigator.maxTouchPoints > 0,
  };
}

/**
 * Phase 1 — submit email + govIdNumber.
 * Server runs KYC and sends a magic link to the email.
 * @param {{ email: string, govIdNumber: string }} form
 * @returns {Promise<{ email: string, message: string }>}
 */
export async function signupPhase1(form) {
  const { data } = await api.post("/signup", form);
  return data;
}

/**
 * Phase 2 — confirm the magic-link token.
 * Server creates the user and returns a signupToken.
 * @param {string} token  the token from the magic link URL
 * @returns {Promise<{ userId: string, email: string, signupToken: string }>}
 */
export async function signupConfirmEmail(token) {
  const { data } = await api.post("/signup/confirm-email", { token });
  return data;
}

/**
 * Enroll a device (passkey) after sign-up.
 * @param {{ signupToken: string, credentialId: string }} params
 * @returns {Promise<object>}
 */
export async function enrollDevice({ signupToken, credentialId }) {
  const { data } = await api.post("/enroll-device", {
    signupToken,
    credentialId,
    deviceContext: gatherDeviceContext(),
  });
  return data;
}

/**
 * Log in with a verified passkey credential.
 * @param {string} credentialId  base64url credential ID
 * @returns {Promise<object>}
 */
export async function login(credentialId) {
  const { data } = await api.post("/login", {
    credentialId,
    deviceContext: gatherDeviceContext(),
  });
  return data;
}
