import { registerCredential, authenticateCredential } from "./webauthn.js";
import { getDeviceContext } from "./deviceContext.js";
import { downloadRecoveryKey } from "./recovery.js";

class BrowserSdkError extends Error {
  constructor(message, status, body = {}) {
    super(message);
    this.name   = "BrowserSdkError";
    this.status = status;
    this.body   = body;
  }
}

async function safeFetch(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (networkErr) {
    throw new BrowserSdkError(`Network error: ${networkErr.message}`, 0);
  }

  let body;
  const ct = res.headers.get("content-type") ?? "";
  body = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (typeof body === "object" && body?.error) || `Request failed with status ${res.status}`;
    throw new BrowserSdkError(message, res.status, typeof body === "object" ? body : {});
  }

  return body;
}

export class PasskeyBrowser {
  constructor({ backendUrl, rpName = "PassKey App" }) {
    if (!backendUrl) throw new Error("PasskeyBrowser: backendUrl is required");
    this._base   = backendUrl.replace(/\/$/, "");
    this._rpName = rpName;
  }


  getDeviceContext() {
    return getDeviceContext();
  }

  downloadRecoveryKey(content, fileName) {
    downloadRecoveryKey(content, fileName);
  }

  _url(path) {
    return `${this._base}${path}`;
  }

  _post(path, body) {
    return safeFetch(this._url(path), {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(body),
    });
  }

  _get(path) {
    return safeFetch(this._url(path), {
      method:      "GET",
      credentials: "include",
    });
  }


  async signup({ email, govIdNumber }) {
    return this._post("/signup", { email, govIdNumber });
  }

  async confirmEmail(token) {
    return this._post("/signup/confirm-email", { token });
  }

  async enrollDevice({ signupToken, userId, email }) {
    const credentialId = await registerCredential({ userId, email, rpName: this._rpName });

    const data = await this._post("/enroll-device", {
      signupToken,
      credentialId,
      deviceContext: getDeviceContext(),
    });

    return data;
  }

  async login() {
    const credentialId = localStorage.getItem("credential_id");
    if (!credentialId) {
      throw new BrowserSdkError(
        "No enrolled passkey found on this device. Enroll first.",
        401,
      );
    }

    const verifiedCredentialId = await authenticateCredential(credentialId);

    return this._post("/login", {
      credentialId:  verifiedCredentialId,
      deviceContext: getDeviceContext(),
    });
  }


  async logout() {
    return this._post("/logout", {});
  }


  async checkAuth() {
    return this._get("/auth/check");
  }

  async requestNewDevice({ email }) {
    const credentialId = await registerCredential({
      userId: "pending",
      email,
      rpName: this._rpName,
    });

    return this._post("/new-device/request", {
      email,
      credentialId,
      deviceContext: getDeviceContext(),
    });
  }

  async pollDeviceStatus() {
    return this._get("/new-device/status");
  }

  async getPendingApprovals() {
    return this._get("/new-device/pending-approvals");
  }

  async approveDevice(requestId) {
    return this._post("/new-device/approve", { requestId });
  }

  async denyDevice(requestId) {
    return this._post("/new-device/deny", { requestId });
  }


  async getProtected(path = "/") {
    return this._get(`/protected${path}`);
  }
}

export { BrowserSdkError };
export { registerCredential, authenticateCredential } from "./webauthn.js";
export { getDeviceContext } from "./deviceContext.js";
export { downloadRecoveryKey } from "./recovery.js";
