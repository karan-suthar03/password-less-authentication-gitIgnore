"use strict";

const axios = require("axios");

class PasskeyError extends Error {
  constructor(message, status, body = {}) {
    super(message);
    this.name   = "PasskeyError";
    this.status = status;
    this.body   = body;
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
        "x-api-key":    apiKey,
        "Content-Type": "application/json",
        "Accept":       "application/json",
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
    try { const { data } = await this._http.get("/auth/status"); return data; }
    catch (err) { this._handleAxiosError(err); }
  }

  async register(email, displayName) {
    if (!email) throw new Error("register: email is required");
    const payload = { email };
    if (displayName) payload.displayName = displayName;
    try { const { data } = await this._http.post("/auth/register", payload); return data; }
    catch (err) { this._handleAxiosError(err); }
  }

  async login(email) {
    if (!email) throw new Error("login: email is required");
    try { const { data } = await this._http.post("/auth/login", { email }); return data; }
    catch (err) { this._handleAxiosError(err); }
  }

  async verify(challengeId, code) {
    if (!challengeId) throw new Error("verify: challengeId is required");
    if (!code)        throw new Error("verify: code is required");
    try { const { data } = await this._http.post("/auth/verify", { challengeId, code }); return data; }
    catch (err) { this._handleAxiosError(err); }
  }

  async listUsers() {
    try { const { data } = await this._http.get("/auth/users"); return data; }
    catch (err) { this._handleAxiosError(err); }
  }
}

module.exports = { PasskeyClient, PasskeyError };
module.exports.default = PasskeyClient;
