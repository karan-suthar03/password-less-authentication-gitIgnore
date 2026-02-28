# passkey-saas-sdk

Official **backend (Node.js)** SDK for the PassKey SaaS passwordless authentication API.

Add passwordless (OTP-based) login to any Node.js app. Uses **axios** for all HTTP requests.

> **Browser apps** should call their *own* backend, which then uses this SDK.  
> Never embed your `pl_live_` API key in frontend code.

---

## Requirements

- Node.js **16+**
- `axios` (installed automatically via `npm install`)

---

## Installation

```bash
npm install
```

Then import into your Node.js project:

```js
// ESM (recommended)
import { PasskeyClient } from "./path/to/backend SDK/index.js";

// CommonJS
const { PasskeyClient } = require("./path/to/backend SDK/index.cjs");
```

---

## Quick Start

### 1. Get an API key

Sign up on the SaaS dashboard (`http://localhost:5174`), create a project, and copy your `pl_live_...` key.

### 2. Create a client

```js
import { PasskeyClient } from "./index.js";

const passkey = new PasskeyClient({
  baseUrl: process.env.PASSKEY_BASE_URL, // e.g. "http://localhost:4000"
  apiKey:  process.env.PASSKEY_API_KEY,  // "pl_live_..."
  timeout: 8000,                          // optional, default 8000ms
});
```

### 3. Full auth flow

```js
// ── Step 1: Register a user once (on sign-up in your app) ──
await passkey.register("user@example.com", "Jane Doe");

// ── Step 2: Start login — generates a 6-digit OTP ──
const { challengeId, code } = await passkey.login("user@example.com");
// ⚠️  In production: email/SMS `code` to the user. Do NOT send it to the browser.

// ── Step 3: User enters the code — verify it ──
const result = await passkey.verify(challengeId, code);

if (result.authenticated) {
  // ✅ Issue your own JWT/session for result.user.email
  console.log("Authenticated:", result.user.email);
}
```

---

## API Reference

### `new PasskeyClient(options)`

Creates a pre-configured axios instance internally.

| Option    | Type     | Required | Default | Description |
|-----------|----------|----------|---------|-------------|
| `baseUrl` | `string` | ✅       | —      | Root URL of the PassKey SaaS backend |
| `apiKey`  | `string` | ✅       | —      | Your `pl_live_...` API key |
| `timeout` | `number` | ❌       | `8000`  | Axios request timeout (ms) |

---

### `passkey.status()`

Ping the server and confirm the API key is valid.

```js
const info = await passkey.status();
// { valid: true, project: "My App", message: "API key is active" }
```

---

### `passkey.register(email, displayName?)`

Enroll a new end-user under your project. Call once per user.

```js
const { user } = await passkey.register("jane@example.com", "Jane Doe");
// user: { email, displayName }
```

| Throws | When |
|--------|------|
| `PasskeyError` 409 | User already registered |
| `PasskeyError` 400 | Missing email |

---

### `passkey.login(email)`

Generate an OTP challenge for a registered user. Returns `challengeId` + `code`.

```js
const { challengeId, code, expiresInSeconds } = await passkey.login("jane@example.com");
// expiresInSeconds: 300 (5 minutes)
// ⚠️ Send `code` via email/SMS — do NOT include it in the API response to your frontend
```

| Throws | When |
|--------|------|
| `PasskeyError` 404 | User not registered |

---

### `passkey.verify(challengeId, code)`

Validate the OTP. The challenge is deleted after one successful use.

```js
const result = await passkey.verify(challengeId, req.body.code);
// { authenticated: true, user: { email, displayName } }
```

| Throws | When |
|--------|------|
| `PasskeyError` 401 | Wrong code |
| `PasskeyError` 404 | Challenge not found or consumed |
| `PasskeyError` 410 | Challenge expired |
| `PasskeyError` 403 | Challenge belongs to different project |

---

### `passkey.listUsers()`

List all end-users registered under this API key.

```js
const { users } = await passkey.listUsers();
// [{ email, displayName, createdAt }, ...]
```

---

## Error Handling

All methods throw `PasskeyError` on failure. It includes the HTTP status code and the full response body.

```js
import { PasskeyClient, PasskeyError } from "./index.js";

try {
  const result = await passkey.verify(challengeId, userCode);
} catch (err) {
  if (err instanceof PasskeyError) {
    console.error(err.status);  // 401
    console.error(err.message); // "Invalid code"
    console.error(err.body);    // { error: "Invalid code" }
  }
}
```

**Error types:**

| `err.status` | Meaning |
|--------------|---------|
| `0`          | Network error / timeout / no response |
| `400`        | Bad request (missing field) |
| `401`        | Invalid API key or wrong OTP code |
| `403`        | Revoked key or wrong project |
| `404`        | User or challenge not found |
| `409`        | User already registered |
| `410`        | Challenge expired |

---

## Example

Run the full flow locally:

```bash
# 1. Start the SaaS backend
cd SaaS/backend && npm start

# 2. Create an API key from the dashboard at http://localhost:5174

# 3. Run the example
PASSKEY_BASE_URL=http://localhost:4000 PASSKEY_API_KEY=pl_live_... node "SaaS/backend SDK/examples/node.js"
```

---

## Architecture

```
Browser / Mobile App
        │
        │  POST /your-app/login  { email }
        ▼
Your App’s Backend  ←── (uses this SDK)
        │
        │  passkey.login(email)
        ▼
PassKey SaaS Backend
        │
        │  returns { challengeId, code }
        ▼
passkey.login() returns to your backend
        │
        ├── emails `code` to user (SendGrid, Resend, etc.)
        └── returns only `challengeId` to browser

Browser submits code → your backend → passkey.verify(challengeId, code)
                                              │
                                              └─ issues your own JWT/session
```

---

## Production Checklist

- [ ] Store `PASSKEY_API_KEY` in an env variable — never in source code
- [ ] Email/SMS the OTP to the user — never return `code` to the browser
- [ ] Use HTTPS (`baseUrl: "https://..."`) in production
- [ ] Add rate limiting on your `/login` endpoint
- [ ] Replace the PassKey backend’s in-memory store with a real DB (Postgres, Mongo)

---

## Installation

Copy the `index.js` / `index.cjs` files into your project, or reference the path directly.

> A registerable npm package is the next step. For now, use a local path import.

```js
// ESM
import { PasskeyClient } from "./path/to/backend SDK/index.js";

// CommonJS
const { PasskeyClient } = require("./path/to/backend SDK/index.cjs");
```

---

## Quick Start

### 1. Get an API key

Sign up on the SaaS dashboard (`http://localhost:5174`), create a project, and copy your `pl_live_...` API key.

### 2. Create a client

```js
import { PasskeyClient } from "./index.js";

const passkey = new PasskeyClient({
  baseUrl: "http://localhost:4000",  // your PassKey SaaS backend URL
  apiKey:  "pl_live_abc123...",      // your API key from the dashboard
});
```

### 3. Full auth flow

```js
// Register a user once (during sign-up in your app)
await passkey.register("user@example.com", "Jane Doe");

// Later: start login (generates a 6-digit OTP)
const { challengeId, code } = await passkey.login("user@example.com");
// → In production: email `code` to the user instead of using it directly

// Verify the code the user typed in
const result = await passkey.verify(challengeId, code);

if (result.authenticated) {
  // ✅ Create your own session for result.user.email
  console.log("Logged in as:", result.user.email);
}
```

---

## API Reference

### `new PasskeyClient(options)`

| Option    | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `baseUrl` | string | ✅       | Root URL of your PassKey SaaS backend |
| `apiKey`  | string | ✅       | Your `pl_live_...` key from the dashboard |

---

### `passkey.status()`

Check that the API key is valid and the server is reachable.

```js
const info = await passkey.status();
// { valid: true, project: "My App", message: "API key is active" }
```

---

### `passkey.register(email, displayName?)`

Register a new end-user under your project. Call this **once per user** during their sign-up.

```js
const { user } = await passkey.register("jane@example.com", "Jane Doe");
// user: { email: "jane@example.com", displayName: "Jane Doe" }
```

| Throws | When |
|--------|------|
| `PasskeyError` 409 | User already registered |
| `PasskeyError` 400 | Missing email |

---

### `passkey.login(email)`

Initiate a login for a registered user. Returns a **challengeId** and a **6-digit OTP code**.

```js
const { challengeId, code, expiresInSeconds } = await passkey.login("jane@example.com");
// expiresInSeconds: 300 (5 minutes)
// → In production: send `code` via email/SMS to the user
```

| Throws | When |
|--------|------|
| `PasskeyError` 404 | User not registered |

---

### `passkey.verify(challengeId, code)`

Verify the OTP code. The challenge is **deleted** after one use (or on expiry).

```js
const result = await passkey.verify(challengeId, "482917");
// { authenticated: true, user: { email: "jane@example.com", displayName: "Jane Doe" } }
```

| Throws | When |
|--------|------|
| `PasskeyError` 401 | Wrong code |
| `PasskeyError` 404 | Challenge not found (consumed or invalid) |
| `PasskeyError` 410 | Challenge expired (5-min window passed) |
| `PasskeyError` 403 | Challenge belongs to a different project |

---

### `passkey.listUsers()`

List all end-users registered under your API key (project).

```js
const { users } = await passkey.listUsers();
// [{ email, displayName, createdAt }, ...]
```

---

## Error Handling

All SDK methods throw `PasskeyError` on non-2xx responses.

```js
import { PasskeyClient, PasskeyError } from "./index.js";

try {
  const result = await passkey.verify(challengeId, userCode);
} catch (err) {
  if (err instanceof PasskeyError) {
    console.error(err.status);  // HTTP status code, e.g. 401
    console.error(err.message); // "Invalid code"
    console.error(err.body);    // full parsed response body
  }
}
```

---

## Examples

| File | Description |
|------|-------------|
| [examples/node.js](examples/node.js) | Full flow in Node.js — run with `node examples/node.js` |
| [examples/browser.html](examples/browser.html) | Interactive browser demo — open directly in a browser |

**Run the Node.js example:**
```bash
# Make sure the SaaS backend is running on port 4000 first
cd "SaaS/backend" && npm start

# In another terminal — set your API key
PASSKEY_API_KEY=pl_live_your_key_here node "SaaS/backend SDK/examples/node.js"
```

---

## How It Works

```
Your App                    PassKey SaaS Backend
    │                               │
    │── register(email) ──────────▶ │  Stores user under your API key
    │                               │
    │── login(email) ─────────────▶ │  Creates 6-digit OTP challenge (5 min TTL)
    │◀─ { challengeId, code } ───── │
    │                               │
    │   [send code to user via      │
    │    email or SMS in prod]       │
    │                               │
    │── verify(id, code) ─────────▶ │  Validates OTP, deletes challenge
    │◀─ { authenticated: true } ─── │
    │                               │
    [create your own session]
```

---

## Production Checklist

- [ ] Remove `code` from UI — only used in demo mode. Deliver it via email (SendGrid, Resend, etc.) or SMS
- [ ] Set `PASSKEY_API_KEY` via environment variable, never hardcode
- [ ] Use HTTPS for the backend (`baseUrl: "https://..."`)
- [ ] Add rate limiting to `/sdk/auth/login` on the backend
- [ ] Replace the in-memory store with a real database (PostgreSQL, MongoDB)
