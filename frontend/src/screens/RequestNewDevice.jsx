/**
 * screens/RequestNewDevice.jsx
 * Step 4: Request access for a new device.
 * Called from the NEW device — creates a pending approval request.
 * Returns a requestId that must be approved by an existing trusted device.
 */

import { useState } from "react";
import * as api from "../lib/api.js";
import { createPasskey } from "../lib/webauthn.js";
import { collectDeviceSignals } from "../lib/deviceSignals.js";
import ResponsePanel from "../components/ResponsePanel.jsx";

export default function RequestNewDevice({ onSuccess }) {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);

  async function handleRequest(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Create a new passkey for this new device
      const { credentialId } = await createPasskey();
      const deviceContext    = collectDeviceSignals();

      const res = await api.requestNewDevice(email.trim(), deviceContext, credentialId);
      setResult({ ...res, endpoint: "POST /request-new-device" });

      if (res.ok && res.data?.requestId) {
        onSuccess({ requestId: res.data.requestId });
      }
    } catch (err) {
      setResult({ ok: false, status: 0, data: { error: err.message }, endpoint: "POST /request-new-device" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="screen">
      <h2>Request New Device Access</h2>
      <p className="screen-desc">
        You're on a new device. Enter your registered email — a request will be
        sent to your trusted devices for approval. <strong>No one can approve their
        own new device</strong> — it must come from an existing trusted device.
      </p>

      <form onSubmit={handleRequest} className="form">
        <label>
          Registered email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </label>

        <p className="hint">
          A passkey will be created on this device and a pending approval will be
          registered. The trusted device must approve the request before you can log in.
        </p>

        <button type="submit" className="btn primary" disabled={loading || !email}>
          {loading ? <span className="spinner" /> : "📲 "}
          {loading ? "Creating request…" : "Request Device Access"}
        </button>
      </form>

      <ResponsePanel result={result} loading={false} />
    </section>
  );
}
