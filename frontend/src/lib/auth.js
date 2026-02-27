import api from "./api";

/**
 * Register a new user identity.
 * @param {{ email: string, govIdNumber: string }} form
 * @returns {Promise<{ userId: string, signupToken: string }>}
 */
export async function signup(form) {
  const { data } = await api.post("/signup", form);
  return data; // { userId, signupToken }
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
    deviceContext: {
      userAgent: navigator.userAgent,
      platform: navigator.userAgentData?.platform,
    },
  });
  return data;
}

/**
 * Log in with a verified passkey credential.
 * @param {string} credentialId  base64url credential ID
 * @param {object} [deviceContextOverride]  optional override for deviceContext
 * @returns {Promise<{ token: string }>}
 */
export async function login(credentialId, deviceContextOverride) {
  const { data } = await api.post("/login", {
    credentialId,
    deviceContext: deviceContextOverride ?? {
      userAgent: navigator.userAgent,
      platform: navigator.userAgentData?.platform,
    },
  });
  return data; // { token }
}
