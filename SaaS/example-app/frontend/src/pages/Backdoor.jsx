import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

async function apiPost(path, body = {}) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function apiGet(path) {
  const res = await fetch(path, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function Backdoor() {
  const [phase, setPhase]       = useState("upload");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState("");
  const [devices, setDevices]   = useState([]);
  const [revoking, setRevoking] = useState(null);

  const refreshDevices = async () => {
    const data = await apiGet("/backdoor/devices");
    setDevices(data.devices);
  };

  const handleFileUpload = useCallback(async (e) => {
    e.preventDefault();
    setError("");

    const fileInput = e.target.querySelector('input[type="file"]');
    const file = fileInput?.files?.[0];

    if (!file) { setError("Please select your recovery key file."); return; }
    if (!file.name.endsWith(".json")) { setError("Recovery key must be a .json file."); return; }

    setLoading(true);
    try {
      const text = await file.text();
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { throw new Error("File is not valid JSON."); }

      if (!parsed.token || parsed.version !== 1) {
        throw new Error("This file does not appear to be a valid recovery key.");
      }

      const data = await apiPost("/backdoor/login", { token: parsed.token });
      setEmail(data.email);
      await refreshDevices();
      setPhase("devices");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRevoke = async (deviceId) => {
    setError("");
    setRevoking(deviceId);
    try {
      await apiPost("/backdoor/revoke", { deviceId });
      await refreshDevices();
    } catch (err) {
      setError(err.message);
    } finally {
      setRevoking(null);
    }
  };

  const handleLogout = async () => {
    try { await apiPost("/backdoor/logout"); } catch {}
    setPhase("upload");
    setDevices([]);
    setEmail("");
    setError("");
  };

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

  return (
    <div className="home-wrapper">
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
