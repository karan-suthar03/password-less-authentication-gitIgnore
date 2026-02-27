/**
 * screens/ApproveDevice.jsx
 * Step 5: Approve a pending device from THIS trusted device.
 * Requires an active session (JWT). The approval is for another device.
 */

import { useState } from "react";
import * as api from "../lib/api.js";
import ResponsePanel from "../components/ResponsePanel.jsx";
import TrustBadge from "../components/TrustBadge.jsx";

export default function ApproveDevice({ token, pendingRequestId }) {
  const [requestId, setRequestId] = useState(pendingRequestId ?? "");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [approved, setApproved]   = useState(false);

  async function handleApprove(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await api.approveDevice(requestId.trim(), token);
    setResult({ ...res, endpoint: "POST /approve-device" });
    setLoading(false);

    if (res.ok) setApproved(true);
  }

  return (
    <section className="screen">
      <h2>Approve Pending Device</h2>
      <p className="screen-desc">
        You are on a <strong>trusted device</strong>. Paste the request ID from the
        new device to grant it access. Once approved, the new device can complete login.
      </p>

      {!token && (
        <p className="warn">⚠ You must be logged in (trusted device) to approve requests.</p>
      )}

      <form onSubmit={handleApprove} className="form">
        <label>
          Request ID <span className="dimmed">(from the new device's response)</span>
          <input
            type="text"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
        </label>

        {approved && (
          <div className="status-row">
            New device status: <TrustBadge state="trusted" />
          </div>
        )}

        <button type="submit" className="btn primary" disabled={loading || !token || !requestId}>
          {loading ? <span className="spinner" /> : "✅ "}
          {loading ? "Approving…" : "Approve Device"}
        </button>
      </form>

      <ResponsePanel result={result} loading={false} />
    </section>
  );
}
