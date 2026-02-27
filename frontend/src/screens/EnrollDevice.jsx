/**
 * screens/EnrollDevice.jsx
 * Step 2: Enroll this browser as the first trusted device.
 * Simulates a WebAuthn passkey creation flow.
 */

import { useState } from "react";
import * as api from "../lib/api.js";
import { createPasskey, isWebAuthnAvailable } from "../lib/webauthn.js";
import { collectDeviceSignals } from "../lib/deviceSignals.js";
import ResponsePanel from "../components/ResponsePanel.jsx";
import TrustBadge from "../components/TrustBadge.jsx";

export default function EnrollDevice({ signupToken, email, onSuccess }) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [trustState, setTrustState] = useState(null);

  async function handleEnroll() {
    setLoading(true);
    setResult(null);

    try {
      // Step 1: Trigger real WebAuthn passkey creation (browser prompt appears here)
      const { credentialId, simulated } = await createPasskey({ email });

      // Step 2: Collect browser-safe context signals
      const deviceContext = collectDeviceSignals();

      // Step 3: Register device with backend
      const res = await api.enrollDevice(signupToken, deviceContext, credentialId);
      setResult({ ...res, endpoint: "POST /enroll-device" });

      if (res.ok) {
        setTrustState(res.data?.trustState);
        onSuccess({ trustState: res.data?.trustState, deviceId: res.data?.deviceId, simulated });
      }
    } catch (err) {
      setResult({ ok: false, status: 0, data: { error: err.message }, endpoint: "POST /enroll-device" });
    } finally {
      setLoading(false);
    }
  }

  const signals = collectDeviceSignals();

  return (
    <section className="screen">
      <h2>Enroll This Device</h2>
      <p className="screen-desc">
        Clicking the button will open your browser's <strong>passkey prompt</strong>{" "}
        (Windows Hello, Touch ID, or your platform authenticator). Your passkey is stored
        on this device — your identity, not a password.
        {!isWebAuthnAvailable() && (
          <><br /><span className="warn">⚠ WebAuthn not available here — a simulated credential will be used.</span></>
        )}
      </p>

      <div className="signal-grid">
        <span className="sig-label">Platform</span>      <span>{signals.platform}</span>
        <span className="sig-label">Language</span>      <span>{signals.language}</span>
        <span className="sig-label">Timezone</span>      <span>{signals.timezone}</span>
        <span className="sig-label">Screen</span>        <span>{signals.screenWidth}×{signals.screenHeight}</span>
        <span className="sig-label">Passkey</span>       <span className="dimmed">Will be created on enroll</span>
      </div>

      {trustState && (
        <div className="status-row">
          Trust state: <TrustBadge state={trustState} />
        </div>
      )}

      <button className="btn primary" onClick={handleEnroll} disabled={loading || !signupToken}>
        {loading ? <span className="spinner" /> : "🔑 "}
        {loading ? "Waiting for passkey prompt…" : "Enroll Device (Create Passkey)"}
      </button>

      {!signupToken && (
        <p className="warn">Complete Sign Up first to get a signup token.</p>
      )}

      <ResponsePanel result={result} loading={false} />
    </section>
  );
}
