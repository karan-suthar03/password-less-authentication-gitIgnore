function bufToBase64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlToBuf(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}


async function registerCredential({ userId, email, rpName = "PassKey App" }) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,

      rp: {
        name: rpName,
        id: window.location.hostname,
      },

      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName: email,
      },

      pubKeyCredParams: [
        { alg: -7,   type: "public-key" },
        { alg: -257, type: "public-key" },
      ],

      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
      },

      hints: ["client-device"],

      timeout: 60_000,
      attestation: "none",
    },
  });

  const credentialId = bufToBase64url(credential.rawId);
  localStorage.setItem("credential_id", credentialId);
  return credentialId;
}

async function authenticateCredential(credentialId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,

      allowCredentials: [
        {
          id:         base64urlToBuf(credentialId),
          type:       "public-key",
          transports: ["internal"],
        },
      ],

      hints: ["client-device"],

      userVerification: "required",
      timeout: 60_000,
    },
  });

  return bufToBase64url(assertion.rawId);
}

function getDeviceContext() {
  return {
    userAgent:    navigator.userAgent,
    platform:     navigator.userAgentData?.platform ?? navigator.platform,
    language:     navigator.language,
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchSupport: navigator.maxTouchPoints > 0,
  };
}

function downloadRecoveryKey(content, fileName = "recovery-key.json") {
  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);

  const blob = new Blob([text], { type: "application/json" });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

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

class PasskeyBrowser {
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

export { BrowserSdkError, PasskeyBrowser, authenticateCredential, downloadRecoveryKey, getDeviceContext, registerCredential };
