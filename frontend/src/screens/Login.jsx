/**
 * screens/Login.jsx
 * Step 3: Passwordless login using device cookie + simulated WebAuthn assertion.
 */

import { useState } from "react";
import * as api from "../lib/api.js";
import { assertPasskey, hasPasskey } from "../lib/webauthn.js";
import { collectDeviceSignals } from "../lib/deviceSignals.js";
import ResponsePanel from "../components/ResponsePanel.jsx";
import TrustBadge from "../components/TrustBadge.jsx";

export default function Login({ onSuccess }) {
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [trustState, setTrustState] = useState(null);

  async function handleLogin() {
    setLoading(true);
    setResult(null);

    try {
      // Trigger real WebAuthn assertion prompt
      const { credentialId } = await assertPasskey();
      const deviceContext    = collectDeviceSignals();

      const res = await api.login(credentialId, deviceContext);
      setResult({ ...res, endpoint: "POST /login" });

      if (res.ok && res.data?.token) {
        setTrustState(res.data.trustState);
        onSuccess({ token: res.data.token, trustState: res.data.trustState, userId: res.data.userId });
      }
    } catch (err) {
      setResult({ ok: false, status: 0, data: { error: err.message }, endpoint: "POST /login" });
    } finally {
      setLoading(false);
    }
  }

  const passkeyPresent = hasPasskey();

  return (
    <section className="screen">
      <h2>Login</h2>
      <p className="screen-desc">
        No username. No password. Clicking Login will open your browser's
        <strong> passkey assertion prompt</strong> — the same authenticator used during enrollment.
      </p>

      <div className="info-row">
        <span>Local passkey:</span>
        <span className={passkeyPresent ? "ok-text" : "err-text"}>
          {passkeyPresent ? "✓ Present" : "✕ Not found"}
        </span>
      </div>

      {trustState && (
        <div className="status-row">
          Trust state after login: <TrustBadge state={trustState} />
        </div>
      )}

      <button
        className="btn primary"
        onClick={handleLogin}
        disabled={loading || !passkeyPresent}
      >
        {loading ? <span className="spinner" /> : "🔐 "}
        {loading ? "Authenticating…" : "Login (Assert Passkey)"}
      </button>

      {!passkeyPresent && (
        <p className="warn">No passkey on this device. Enroll first, or request access as a new device.</p>
      )}

      <ResponsePanel result={result} loading={false} />
    </section>
  );
}
