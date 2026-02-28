import { PasskeyClient } from "passkey-saas-sdk";

const passkey = new PasskeyClient({
  baseUrl: process.env.PASSKEY_BASE_URL ?? "https://logless.being-karan.in",
  apiKey:  process.env.PASSKEY_API_KEY  ?? "pl_live_1ac2e3a05e2e40a195e9009d71e51604",
  timeout: 10000,
});

export default passkey;
