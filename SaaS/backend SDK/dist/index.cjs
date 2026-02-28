'use strict';

var axios = require('axios');

class PasskeyError extends Error {
  constructor(message, status, body = {}) {
    super(message);
    this.name = "PasskeyError";
    this.status = status;
    this.body = body;
  }
}

class PasskeyClient {
  constructor({ baseUrl, apiKey, timeout = 8000 }) {
    if (!baseUrl) throw new Error("PasskeyClient: baseUrl is required");
    if (!apiKey)  throw new Error("PasskeyClient: apiKey is required");

    this._http = axios.create({
      baseURL: baseUrl.replace(/\/$/, "") + "/sdk",
      timeout,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
  }


  _handleAxiosError(err) {
    if (err.response) {
      const status  = err.response.status;
      const body    = err.response.data ?? {};
      const message = body.error || `Request failed with status ${status}`;
      throw new PasskeyError(message, status, body);
    }
    if (err.request) {
      throw new PasskeyError(`No response from server: ${err.message}`, 0, {});
    }
    throw new PasskeyError(`SDK error: ${err.message}`, 0, {});
  }


  async status() {
    try {
      const { data } = await this._http.get("/auth/status");
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async register(email, displayName) {
    if (!email) throw new Error("register: email is required");
    const payload = { email };
    if (displayName) payload.displayName = displayName;
    try {
      const { data } = await this._http.post("/auth/register", payload);
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async login(email, callbackUrl) {
    if (!email) throw new Error("login: email is required");
    const payload = { email };
    if (callbackUrl) payload.callbackUrl = callbackUrl;
    try {
      const { data } = await this._http.post("/auth/login", payload);
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async verify(token) {
    if (!token) throw new Error("verify: token is required");
    try {
      const { data } = await this._http.post("/auth/verify", { token });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async listUsers() {
    try {
      const { data } = await this._http.get("/auth/users");
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }


  async enrollDevice({ userId, contextSnapshot, credentialId }) {
    if (!userId) throw new Error("enrollDevice: userId is required");
    try {
      const { data } = await this._http.post("/device/enroll", { userId, contextSnapshot, credentialId });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async createPendingDevice({ userId, contextSnapshot, credentialId }) {
    if (!userId) throw new Error("createPendingDevice: userId is required");
    try {
      const { data } = await this._http.post("/device/create-pending", { userId, contextSnapshot, credentialId });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async getDevice(deviceId) {
    if (!deviceId) throw new Error("getDevice: deviceId is required");
    try {
      const { data } = await this._http.get(`/device/${deviceId}`);
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async getDevicesByUser(userId) {
    if (!userId) throw new Error("getDevicesByUser: userId is required");
    try {
      const { data } = await this._http.get(`/device/user/${userId}`);
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async touchDevice(deviceId) {
    if (!deviceId) throw new Error("touchDevice: deviceId is required");
    try {
      const { data } = await this._http.post("/device/touch", { deviceId });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async revokeDevice(deviceId) {
    if (!deviceId) throw new Error("revokeDevice: deviceId is required");
    try {
      const { data } = await this._http.post("/device/revoke", { deviceId });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async createApproval({ userId, newDeviceId, newDeviceContext }) {
    if (!userId || !newDeviceId) throw new Error("createApproval: userId and newDeviceId are required");
    try {
      const { data } = await this._http.post("/device/create-approval", { userId, newDeviceId, newDeviceContext });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async getPendingApprovals(userId) {
    if (!userId) throw new Error("getPendingApprovals: userId is required");
    try {
      const { data } = await this._http.get(`/device/pending-approvals/${userId}`);
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async approveDevice(requestId, userId) {
    if (!requestId) throw new Error("approveDevice: requestId is required");
    try {
      const { data } = await this._http.post("/device/approve", { requestId, userId });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async denyDevice(requestId, userId) {
    if (!requestId) throw new Error("denyDevice: requestId is required");
    try {
      const { data } = await this._http.post("/device/deny", { requestId, userId });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }


  async assessRisk({ deviceId, context } = {}) {
    try {
      const { data } = await this._http.post("/risk/assess", { deviceId: deviceId ?? null, context });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }


  async generateRecoveryKey({ userId, email }) {
    if (!userId || !email) throw new Error("generateRecoveryKey: userId and email are required");
    try {
      const { data } = await this._http.post("/recovery/generate", { userId, email });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }

  async verifyRecoveryKey(token) {
    if (!token) throw new Error("verifyRecoveryKey: token is required");
    try {
      const { data } = await this._http.post("/recovery/verify", { token });
      return data;
    } catch (err) { this._handleAxiosError(err); }
  }
}

exports.PasskeyClient = PasskeyClient;
exports.PasskeyError = PasskeyError;
