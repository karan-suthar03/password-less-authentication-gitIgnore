import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [keys, setKeys] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, keysRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/keys"),
      ]);
      setStats(statsRes.data);
      setKeys(keysRes.data.keys);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createKey = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    try {
      const { data } = await api.post("/keys", { projectName });
      setNewKey(data.apiKey);
      setProjectName("");
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create key");
    }
  };

  const revokeKey = async (id) => {
    await api.patch(`/keys/${id}/revoke`);
    fetchData();
  };

  const activateKey = async (id) => {
    await api.patch(`/keys/${id}/activate`);
    fetchData();
  };

  const deleteKey = async (id) => {
    if (!confirm("Permanently delete this API key?")) return;
    await api.delete(`/keys/${id}`);
    setNewKey(null);
    fetchData();
  };

  if (loading)
    return (
      <div className="container text-center mt-4">Loading dashboard…</div>
    );

  const maxCount = stats
    ? Math.max(...stats.requestsPerDay.map((d) => d.count), 1)
    : 1;

  return (
    <div className="container">
      {error && <div className="error-msg">{error}</div>}

      {newKey && (
        <div className="success-msg mb-2">
          <strong>New API Key Created!</strong> Copy it now — you won't see it
          again in full.
          <br />
          <span className="key-value" style={{ marginTop: 4, display: "inline-block" }}>
            {newKey.key}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 8 }}
            onClick={() => {
              navigator.clipboard.writeText(newKey.key);
            }}
          >
            Copy
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 4 }}
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New API Key
        </button>
      </div>

      {stats && (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <div className="stat-value">{stats.totalKeys}</div>
              <div className="stat-label">Total Keys</div>
            </div>
            <div className="card stat-card">
              <div className="stat-value">{stats.activeKeys}</div>
              <div className="stat-label">Active Keys</div>
            </div>
            <div className="card stat-card">
              <div className="stat-value">{stats.totalRequests}</div>
              <div className="stat-label">Total Requests</div>
            </div>
          </div>

          <div className="card mb-2">
            <h3 style={{ marginBottom: "0.5rem" }}>Requests (Last 7 Days)</h3>
            <div className="chart-bar-container">
              {stats.requestsPerDay.map((d) => (
                <div
                  key={d.date}
                  className="chart-bar"
                  style={{
                    height: `${(d.count / maxCount) * 100}%`,
                  }}
                  title={`${d.date}: ${d.count} requests`}
                >
                  <span className="chart-label">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="keys-section">
        <h2>API Keys</h2>
        <div className="card">
          {keys.length === 0 ? (
            <p style={{ color: "#71717a", padding: "1rem", textAlign: "center" }}>
              No API keys yet. Create one to get started.
            </p>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="key-row">
                <div className="key-info">
                  <h4>
                    {k.projectName}{" "}
                    <span
                      className={`badge ${
                        k.active ? "badge-active" : "badge-revoked"
                      }`}
                    >
                      {k.active ? "Active" : "Revoked"}
                    </span>
                  </h4>
                  <div className="key-value">
                    {k.key.slice(0, 16)}••••••••••••
                  </div>
                  <div className="key-meta">
                    <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    <span>{k.requestCount} requests</span>
                    {k.lastUsedAt && (
                      <span>
                        Last used {new Date(k.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="key-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigator.clipboard.writeText(k.key)}
                  >
                    Copy
                  </button>
                  {k.active ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => revokeKey(k.id)}
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => activateKey(k.id)}
                    >
                      Activate
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => deleteKey(k.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New API Key</h3>
            <form onSubmit={createKey}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  placeholder="My Awesome App"
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-primary" type="submit">
                  Generate Key
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
