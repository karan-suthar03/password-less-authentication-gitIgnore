# passkey-browser-sdk

Official **browser** SDK for PassKey SaaS — wraps the WebAuthn platform APIs (Windows Hello, Touch ID, Face ID) and communicates with your customer backend.

---

## Requirements

- Modern browser with WebAuthn / Platform Authenticator support (Chrome 67+, Edge 18+, Safari 14+, Firefox 60+)
- Your customer backend must serve the PassKey SaaS routes (sign up, login, device enroll, etc.)

---

## Installation

```bash
npm install passkey-browser-sdk
```

Or via CDN (no build step):

```html
<script src="https://unpkg.com/passkey-browser-sdk/dist/index.umd.js"></script>
<!-- exposes window.PasskeySDK.PasskeyBrowser -->
```

---

## Quick Start

```js
import { PasskeyBrowser } from "passkey-browser-sdk";

const pb = new PasskeyBrowser({
  backendUrl: "https://your-app.example.com", // your backend, NOT the SaaS API
  rpName: "My App",                            // shown in the OS biometric prompt
});

// ── Sign up ──────────────────────────────────────────────────────────────────
// Step 1: submit email + gov ID (triggers a magic-link email)
await pb.signup({ email: "user@example.com", govIdNumber: "1234-5678" });

// Step 2: user clicks the link → your /verify-email page extracts ?token=
const { signupToken, userId, email } = await pb.confirmEmail(token);

// Step 3: OS biometric prompt opens → device is enrolled
const { recoveryKey, recoveryFileName } = await pb.enrollDevice({ signupToken, userId, email });
pb.downloadRecoveryKey(recoveryKey, recoveryFileName); // prompt user to save

// ── Log in ────────────────────────────────────────────────────────────────────
await pb.login(); // reads credential_id from localStorage → OS prompt

// ── Check session ─────────────────────────────────────────────────────────────
const { userId, deviceId, trustState } = await pb.checkAuth();

// ── Log out ───────────────────────────────────────────────────────────────────
await pb.logout();

// ── Enroll a new device ───────────────────────────────────────────────────────
await pb.requestNewDevice({ email: "user@example.com" }); // OS prompt + creates approval request
const { trustState } = await pb.pollDeviceStatus();        // poll until approved/denied

// ── Approve / deny a new device (from a trusted device) ──────────────────────
const { pendingApprovals } = await pb.getPendingApprovals();
await pb.approveDevice(pendingApprovals[0].requestId);
// or
await pb.denyDevice(pendingApprovals[0].requestId);
```

---

## API Reference

### `new PasskeyBrowser(options)`

| Option | Type | Required | Description |
|---|---|---|---|
| `backendUrl` | `string` | ✅ | Base URL of **your** customer backend |
| `rpName` | `string` | | Label shown in the OS biometric prompt. Default: `"PassKey App"` |

### Methods

| Method | Description |
|---|---|
| `signup({ email, govIdNumber })` | Submit email + ID → triggers magic-link email |
| `confirmEmail(token)` | Exchange magic-link token → returns `signupToken`, `userId`, `email` |
| `enrollDevice({ signupToken, userId, email })` | Open OS prompt → enroll passkey → returns recovery key |
| `login()` | Open OS prompt using stored `credential_id` → create session |
| `logout()` | Destroy server-side session |
| `checkAuth()` | Verify current session → returns `userId`, `deviceId`, `trustState` |
| `requestNewDevice({ email })` | Register passkey on new device + submit approval request |
| `pollDeviceStatus()` | Poll for `pending` / `trusted` / `revoked` |
| `getPendingApprovals()` | List new-device approval requests for the current user |
| `approveDevice(requestId)` | Approve a pending device request |
| `denyDevice(requestId)` | Deny a pending device request |
| `getProtected(path?)` | Fetch a protected resource from your backend |
| `getDeviceContext()` | Returns browser fingerprint data |
| `downloadRecoveryKey(content, fileName?)` | Trigger browser file download of a recovery key |

---

## Low-level Exports

For advanced use cases the underlying helpers are also exported:

```js
import {
  registerCredential,    // creates a WebAuthn credential and returns a base64url credentialId
  authenticateCredential, // asserts a stored credential
  getDeviceContext,       // browser fingerprint snapshot
  downloadRecoveryKey,    // trigger JSON file download
} from "passkey-browser-sdk";
```

---

## License

MIT
