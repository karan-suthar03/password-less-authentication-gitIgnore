import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { fetchProtectedData } from "../lib/data";

const APPROVAL_POLL_MS = 8000;

const DUMMY_TRANSACTIONS = [
  { id: "TXN-001", date: "2026-02-26", description: "Wire Transfer – Contractor", amount: "-$14,500.00", status: "completed" },
  { id: "TXN-002", date: "2026-02-24", description: "Quarterly Dividend", amount: "+$8,320.00", status: "completed" },
  { id: "TXN-003", date: "2026-02-20", description: "Cloud Infrastructure", amount: "-$3,210.00", status: "pending" },
  { id: "TXN-004", date: "2026-02-18", description: "Inbound – Client X", amount: "+$62,000.00", status: "completed" },
  { id: "TXN-005", date: "2026-02-14", description: "Payroll Run", amount: "-$38,750.00", status: "completed" },
];

export default function Home() {
  const navigate = useNavigate();
  const [authInfo, setAuthInfo] = useState(null);
  const [error, setError] = useState("");
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [actioning, setActioning] = useState(null); // requestId being acted on
  const email = localStorage.getItem("user_email") ?? "User";
  const pollRef = useRef(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const { data } = await api.get("/new-device/pending-approvals");
      setPendingApprovals(data.pendingApprovals ?? []);
    } catch {
      // silently ignore — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    fetchProtectedData()
      .then((data) => setAuthInfo(data))
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate("/login");
          return;
        }
        setError(err.response?.data?.error || err.message);
      });

    // Start polling for pending device approvals
    fetchApprovals();
    pollRef.current = setInterval(fetchApprovals, APPROVAL_POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [navigate, fetchApprovals]);

  const handleApprove = async (requestId) => {
    setActioning(requestId);
    try {
      await api.post("/new-device/approve", { requestId });
      await fetchApprovals();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActioning(null);
    }
  };

  const handleDeny = async (requestId) => {
    setActioning(requestId);
    try {
      await api.post("/new-device/deny", { requestId });
      await fetchApprovals();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActioning(null);
    }
  };

  const logout = async () => {
    try { await api.post("/logout"); } catch { /* ignore */ }
    navigate("/login");
  };

  return (
    <div className="home-wrapper">
      {/* Header */}
      <div className="home-header">
        <div>
          <h1>Secure Dashboard</h1>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: ".2rem" }}>
            {email}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <span className="badge">Trusted Device</span>
          <button className="btn-logout" onClick={logout}>Log out</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* KPI Cards */}
      <div className="grid">
        <div className="data-card">
          <div className="label">Account Balance</div>
          <div className="value green">$247,830.50</div>
        </div>
        <div className="data-card">
          <div className="label">Portfolio Value</div>
          <div className="value accent">$1,048,200.00</div>
        </div>
        <div className="data-card">
          <div className="label">Clearance Level</div>
          <div className="value">TOP SECRET</div>
        </div>
        <div className="data-card">
          <div className="label">Active Sessions</div>
          <div className="value">1</div>
        </div>
      </div>

      {/* Confidential Data */}
      <div className="table-card">
        <div className="table-header">Confidential Transaction Log</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_TRANSACTIONS.map((tx) => (
              <tr key={tx.id}>
                <td style={{ color: "var(--muted)", fontFamily: "monospace" }}>{tx.id}</td>
                <td>{tx.date}</td>
                <td>{tx.description}</td>
                <td
                  style={{
                    fontWeight: 600,
                    color: tx.amount.startsWith("+") ? "var(--success)" : "var(--text)",
                  }}
                >
                  {tx.amount}
                </td>
                <td>
                  <span className={`tag ${tx.status === "completed" ? "green" : tx.status === "pending" ? "blue" : "red"}`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Auth Info */}
      {authInfo && (
        <div className="device-info">
          <div>User ID: <span>{authInfo.userId}</span></div>
          <div>Device ID: <span>{authInfo.deviceId}</span></div>
          <div>Trust State: <span>{authInfo.trustState}</span></div>
          <div>Server Time: <span>{authInfo.timestamp}</span></div>
        </div>
      )}

      {/* Pending Device Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="table-card" style={{ marginTop: "1.5rem", borderColor: "rgba(255,183,77,.4)" }}>
          <div className="table-header" style={{ color: "#ffb74d", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <span>⚠</span> New Device Approval Requests ({pendingApprovals.length})
          </div>
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Timezone</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.map((a) => (
                <tr key={a.requestId}>
                  <td>{a.platform}</td>
                  <td>{a.timezone}</td>
                  <td style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td style={{ display: "flex", gap: ".5rem" }}>
                    <button
                      className="btn-approve"
                      disabled={actioning === a.requestId}
                      onClick={() => handleApprove(a.requestId)}
                    >
                      {actioning === a.requestId ? "…" : "Approve"}
                    </button>
                    <button
                      className="btn-revoke"
                      disabled={actioning === a.requestId}
                      onClick={() => handleDeny(a.requestId)}
                    >
                      {actioning === a.requestId ? "…" : "Deny"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
