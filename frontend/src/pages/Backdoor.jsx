import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

/**
 * /backdoor
 *
 * Emergency-only page for device management via a recovery key file.
 * The user uploads their recovery-key JSON file (downloaded during signup).
 * On successful verification they get a restricted session to list and
 * blocklist enrolled devices.  No other access is granted.
 */
export default function Backdoor() {
  const [phase, setPhase]       = useState("upload");   // "upload" | "devices"
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState("");
  const [devices, setDevices]   = useState([]);
  const [revoking, setRevoking] = useState(null);       // deviceId being revoked

  // ── File upload handler ──────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    e.preventDefault();
    setError("");

    const fileInput = e.target.querySelector('input[type="file"]');
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("Please select your recovery key file.");
      return;
    }

    if (!file.name.endsWith(".json")) {
      setError("Recovery key must be a .json file.");
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("File is not valid JSON.");
      }

      if (!parsed.token || parsed.version !== 1) {
        throw new Error("This file does not appear to be a valid recovery key.");
      }

      // Send the token to the backdoor login endpoint
      const { data } = await api.post("/backdoor/login", { token: parsed.token });
      setEmail(data.email);

      // Immediately fetch the device list
      await refreshDevices();
      setPhase("devices");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch device list ────────────────────────────────────────
  const refreshDevices = async () => {
    const { data } = await api.get("/backdoor/devices");
    setDevices(data.devices);
  };

  // ── Revoke a device ──────────────────────────────────────────
  const handleRevoke = async (deviceId) => {
    setError("");
    setRevoking(deviceId);

    try {
      await api.post("/backdoor/revoke", { deviceId });
      await refreshDevices();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRevoking(null);
    }
  };

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await api.post("/backdoor/logout"); } catch { /* ignore */ }
    setPhase("upload");
    setDevices([]);
    setEmail("");
    setError("");
  };

  // ── Upload phase ─────────────────────────────────────────────
  if (phase === "upload") {
    return (
      <div className="card">
        <h1>Emergency Device Manager</h1>
        <p className="subtitle">
          Upload the recovery key file you downloaded during sign-up to manage your devices.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleFileUpload}>
          <div className="form-group">
            <label>Recovery Key File</label>
            <input
              type="file"
              accept=".json"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: ".7rem .9rem",
                color: "var(--text)",
                fontSize: ".95rem",
              }}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Verifying…" : "Unlock Device Manager"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: ".85rem", fontSize: ".78rem", color: "var(--muted)" }}>
          This restricted session can only manage devices — no other account access is granted.
        </p>

        <div className="link-row">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    );
  }

  // ── Device management phase ──────────────────────────────────
  return (
    <div className="home-wrapper">
      {/* Header */}
      <div className="home-header">
        <div>
          <h1>Device Manager</h1>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: ".2rem" }}>
            {email}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <span className="badge badge-warn">Restricted Session</span>
          <button className="btn-logout" onClick={handleLogout}>End Session</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className="alert alert-warn" style={{ marginBottom: "1.25rem" }}>
        This session can ONLY manage devices. Revoke any compromised device below.
      </div>

      {/* Device Table */}
      <div className="table-card">
        <div className="table-header">Enrolled Devices</div>
        <table>
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Platform</th>
              <th>Status</th>
              <th>Enrolled</th>
              <th>Last Seen</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
                  No devices found.
                </td>
              </tr>
            )}
            {devices.map((d) => (
              <tr key={d.deviceId}>
                <td style={{ fontFamily: "monospace", fontSize: ".8rem", color: "var(--muted)" }}>
                  {d.deviceId.slice(0, 8)}…
                </td>
                <td>{d.platform}</td>
                <td>
                  <span className={`tag ${
                    d.trustState === "trusted" ? "green" :
                    d.trustState === "revoked" ? "red" : "blue"
                  }`}>
                    {d.trustState === "revoked" ? "blocklisted" : d.trustState}
                  </span>
                </td>
                <td style={{ fontSize: ".82rem" }}>{new Date(d.enrolledAt).toLocaleDateString()}</td>
                <td style={{ fontSize: ".82rem" }}>{new Date(d.lastSeen).toLocaleDateString()}</td>
                <td>
                  {d.trustState !== "revoked" ? (
                    <button
                      className="btn-revoke"
                      onClick={() => handleRevoke(d.deviceId)}
                      disabled={revoking === d.deviceId}
                    >
                      {revoking === d.deviceId ? "Revoking…" : "Blocklist"}
                    </button>
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "1.25rem", fontSize: ".82rem", color: "var(--muted)", textAlign: "center" }}>
        Blocklisted devices are permanently revoked and cannot authenticate again.
      </div>
    </div>
  );
}
