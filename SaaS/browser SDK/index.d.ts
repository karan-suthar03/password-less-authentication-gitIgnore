// TypeScript declarations for passkey-browser-sdk

export declare class BrowserSdkError extends Error {
  name: "BrowserSdkError";
  status: number;
  body: Record<string, unknown>;
  constructor(message: string, status: number, body?: Record<string, unknown>);
}

export interface DeviceContext {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  touchSupport: boolean;
}

export interface PasskeyBrowserOptions {
  /** Base URL of YOUR customer backend (not the PassKey SaaS API) */
  backendUrl: string;
  /** Relying Party name shown in the OS biometric prompt. Default: "PassKey App" */
  rpName?: string;
}

export declare class PasskeyBrowser {
  constructor(options: PasskeyBrowserOptions);

  /** Returns browser/device fingerprint data for risk assessment */
  getDeviceContext(): DeviceContext;

  /** Triggers a file download of the recovery key JSON */
  downloadRecoveryKey(content: string | object, fileName?: string): void;

  // ── Signup ────────────────────────────────────────────────────────────────
  /** Step 1 of signup: submit email + gov ID, triggers a magic-link email */
  signup(options: { email: string; govIdNumber: string }): Promise<unknown>;

  /** Step 2 of signup: exchange the magic-link token from the URL */
  confirmEmail(token: string): Promise<{ signupToken: string; userId: string; email: string }>;

  /** Step 3 of signup: trigger OS biometric prompt and enroll this device */
  enrollDevice(options: {
    signupToken: string;
    userId: string;
    email: string;
  }): Promise<{ recoveryKey: string; recoveryFileName: string }>;

  // ── Login ─────────────────────────────────────────────────────────────────
  /** Reads credential_id from localStorage and triggers OS biometric prompt */
  login(): Promise<unknown>;

  /** Clears the server-side session */
  logout(): Promise<unknown>;

  /** Returns auth info for the current session (userId, deviceId, trustState) */
  checkAuth(): Promise<{
    userId: string;
    deviceId: string;
    trustState: string;
    timestamp: string;
  }>;

  // ── New device enrollment ─────────────────────────────────────────────────
  /** Registers a new credential + sends an approval request to trusted devices */
  requestNewDevice(options: { email: string }): Promise<unknown>;

  /** Poll until the new device is approved or denied */
  pollDeviceStatus(): Promise<{ trustState: "pending" | "trusted" | "revoked" }>;

  // ── Approvals ─────────────────────────────────────────────────────────────
  getPendingApprovals(): Promise<{
    pendingApprovals: Array<{
      requestId: string;
      platform: string;
      timezone: string;
      userAgent: string;
      createdAt: string;
    }>;
  }>;
  approveDevice(requestId: string): Promise<unknown>;
  denyDevice(requestId: string): Promise<unknown>;

  // ── Protected resource ────────────────────────────────────────────────────
  getProtected(path?: string): Promise<unknown>;
}

// ── Low-level WebAuthn helpers (re-exported for advanced use) ──────────────

export declare function registerCredential(options: {
  userId: string;
  email: string;
  rpName?: string;
}): Promise<string>;

export declare function authenticateCredential(credentialId: string): Promise<string>;

export declare function getDeviceContext(): DeviceContext;

export declare function downloadRecoveryKey(
  content: string | object,
  fileName?: string,
): void;

export default PasskeyBrowser;
