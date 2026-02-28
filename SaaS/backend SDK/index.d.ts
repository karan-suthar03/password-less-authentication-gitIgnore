// TypeScript declarations for passkey-saas-sdk

export declare class PasskeyError extends Error {
  name: "PasskeyError";
  status: number;
  body: Record<string, unknown>;
  constructor(message: string, status: number, body?: Record<string, unknown>);
}

export interface PasskeyClientOptions {
  /** Base URL of your PassKey SaaS instance, e.g. "https://api.passkey.example.com" */
  baseUrl: string;
  /** Your pl_live_... API key from the dashboard */
  apiKey: string;
  /** Request timeout in milliseconds. Default: 8000 */
  timeout?: number;
}

export interface DeviceEnrollOptions {
  userId: string;
  contextSnapshot?: unknown;
  credentialId?: string;
}

export interface ApprovalOptions {
  userId: string;
  newDeviceId: string;
  newDeviceContext?: unknown;
}

export declare class PasskeyClient {
  constructor(options: PasskeyClientOptions);

  // ── Auth ──────────────────────────────────────────────────────────────────
  status(): Promise<{ ok: boolean }>;
  register(email: string, displayName?: string): Promise<unknown>;
  login(email: string, callbackUrl?: string): Promise<unknown>;
  verify(token: string): Promise<{ authenticated: boolean; user: { email: string } }>;
  listUsers(): Promise<unknown>;

  // ── Device ────────────────────────────────────────────────────────────────
  enrollDevice(options: DeviceEnrollOptions): Promise<unknown>;
  createPendingDevice(options: DeviceEnrollOptions): Promise<unknown>;
  getDevice(deviceId: string): Promise<unknown>;
  getDevicesByUser(userId: string): Promise<unknown[]>;
  touchDevice(deviceId: string): Promise<unknown>;
  revokeDevice(deviceId: string): Promise<unknown>;

  // ── Approvals ─────────────────────────────────────────────────────────────
  createApproval(options: ApprovalOptions): Promise<unknown>;
  getPendingApprovals(userId: string): Promise<{ pendingApprovals: unknown[] }>;
  approveDevice(requestId: string, userId?: string): Promise<unknown>;
  denyDevice(requestId: string, userId?: string): Promise<unknown>;

  // ── Risk ──────────────────────────────────────────────────────────────────
  assessRisk(options?: { deviceId?: string; context?: unknown }): Promise<unknown>;

  // ── Recovery ──────────────────────────────────────────────────────────────
  generateRecoveryKey(options: { userId: string; email: string }): Promise<unknown>;
  verifyRecoveryKey(token: string): Promise<unknown>;
}

export default PasskeyClient;
