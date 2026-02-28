import api from "./api";

function gatherDeviceContext() {
  return {
    userAgent:           navigator.userAgent,
    platform:            navigator.userAgentData?.platform ?? navigator.platform,
    language:            navigator.language,
    timezone:            Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchSupport:        navigator.maxTouchPoints > 0,
  };
}

export async function signupPhase1(form) {
  const { data } = await api.post("/signup", form);
  return data;
}

export async function signupConfirmEmail(token) {
  const { data } = await api.post("/signup/confirm-email", { token });
  return data;
}

export async function enrollDevice({ signupToken, credentialId }) {
  const { data } = await api.post("/enroll-device", {
    signupToken,
    credentialId,
    deviceContext: gatherDeviceContext(),
  });
  return data;
}

export async function login(credentialId) {
  const { data } = await api.post("/login", {
    credentialId,
    deviceContext: gatherDeviceContext(),
  });
  return data;
}
