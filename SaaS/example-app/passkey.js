import { PasskeyClient } from "../backend SDK/index.js";

const passkey = new PasskeyClient({
  baseUrl: process.env.PASSKEY_BASE_URL ?? "https://logless.being-karan.in",
  apiKey:  process.env.PASSKEY_API_KEY  ?? "pl_live_69376f5ea7b5edf51253ddb9e72e1c62",
  timeout: 10000,
});

export default passkey;
