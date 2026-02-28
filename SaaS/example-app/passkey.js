import { PasskeyClient } from "../backend SDK/index.js";

const passkey = new PasskeyClient({
  baseUrl: process.env.PASSKEY_BASE_URL ?? "http://localhost:4000",
  apiKey:  process.env.PASSKEY_API_KEY  ?? "pl_live_0914202e7ab7dce7be4cf2421fe25dfa",
  timeout: 10000,
});

export default passkey;
