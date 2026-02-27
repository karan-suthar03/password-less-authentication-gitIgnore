/**
 * screens/RevokeDevice.jsx
 * Step 6: Revoke a device by its ID.
 * Requires active session (JWT). Can revoke any of the user's devices.
 */

import { useState } from "react";
import * as api from "../lib/api.js";
import { clearPasskey } from "../lib/webauthn.js";
import ResponsePanel from "../components/ResponsePanel.jsx";
import TrustBadge from "../components/TrustBadge.jsx";

export default function RevokeDevice({ token, currentDeviceId, onRevoked }) {
  const [deviceId, setDeviceId] = useState(currentDeviceId ?? "");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);

  async function handleRevoke(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await api.revokeDevice(deviceId.trim(), token);
    setResult({ ...res, endpoint: "POST /revoke-device" });
    setLoading(false);

    if (res.ok) {
      // If the user revoked THEIR OWN device, clear the local passkey too
      if (deviceId.trim() === currentDeviceId) {
        clearPasskey();
      }
      onRevoked?.({ deviceId: deviceId.trim() });
    }
  }

  return (
    <section className="screen">
      <h2>Revoke a Device</h2>
      <p className="screen-desc">
        Permanently revoke a device's access. This simulates a lost or compromised device
        scenario. The device will be blocked from all future logins, even with a valid JWT.
      </p>

      {!token && (
        <p className="warn">⚠ You must be logged in on a trusted device to revoke.</p>
      )}

      <form onSubmit={handleRevoke} className="form">
        <label>
          Device ID to revoke
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
        </label>

        {currentDeviceId && (
          <p className="hint">
            Your current device ID: <code>{currentDeviceId}</code>
          </p>
        )}

        <div className="status-row">
          After revocation: <TrustBadge state="revoked" />
        </div>

        <button
          type="submit"
          className="btn danger"
          disabled={loading || !token || !deviceId}
        >
          {loading ? <span className="spinner" /> : "🔒 "}
          {loading ? "Revoking…" : "Revoke Device"}
        </button>
      </form>

      <ResponsePanel result={result} loading={false} />
    </section>
  );
}
