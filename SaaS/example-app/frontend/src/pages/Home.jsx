import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import pb from "../passkey.js";

export default function Home() {
  const navigate = useNavigate();

  const [auth, setAuth]         = useState(null);
  const [resource, setResource] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [error, setError]       = useState("");

  useEffect(() => {
    (async () => {
      try {
        const authData = await pb.checkAuth();
        setAuth(authData);
      } catch {
        navigate("/login");
        return;
      }

      try {
        const data = await pb.getProtected("/");
        setResource(data);
      } catch (err) {
        setError(`Protected resource error: ${err.message}`);
      }

      try {
        const { pendingApprovals } = await pb.getPendingApprovals();
        setApprovals(pendingApprovals ?? []);
      } catch {}
    })();
  }, [navigate]);

  const handleApprove = async (requestId) => {
    try {
      await pb.approveDevice(requestId);
      setApprovals((prev) => prev.filter((a) => a.requestId !== requestId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeny = async (requestId) => {
    try {
      await pb.denyDevice(requestId);
      setApprovals((prev) => prev.filter((a) => a.requestId !== requestId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await pb.logout();
    navigate("/login");
  };

  if (!auth) {
    return (
      <div className="card">
        <div className="alert alert-info">
          <span className="spinner" />Checking authentication…
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Home</h1>
      <p className="subtitle">Signed in · device trusted</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="device-card">
        <div><strong>User ID</strong></div>
        <code>{auth.userId}</code>
        <div style={{ marginTop: ".4rem" }}><strong>Device ID</strong></div>
        <code>{auth.deviceId}</code>
        <div style={{ marginTop: ".4rem" }}>
          Trust state: <strong style={{ color: "var(--success)" }}>{auth.trustState}</strong>
        </div>
      </div>


      {resource && (
        <>
          <hr className="divider" />
          <p style={{ fontSize: ".8rem", color: "var(--muted)", marginBottom: ".5rem" }}>Protected resource:</p>
          <pre style={{
            background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: "6px", padding: ".75rem", fontSize: ".75rem",
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {JSON.stringify(resource, null, 2)}
          </pre>
        </>
      )}


      {approvals.length > 0 && (
        <>
          <hr className="divider" />
          <p style={{ fontWeight: 600, marginBottom: ".6rem", fontSize: ".9rem" }}>
            Pending device approvals ({approvals.length})
          </p>
          {approvals.map((a) => (
            <div key={a.requestId} className="device-card">
              <div><strong>Platform:</strong> {a.platform} · <strong>Timezone:</strong> {a.timezone}</div>
              <div style={{ fontSize: ".75rem", color: "var(--muted)", marginTop: ".25rem" }}>
                {a.userAgent}
              </div>
              <div className="device-actions">
                <button className="btn-approve" onClick={() => handleApprove(a.requestId)}>Approve</button>
                <button className="btn-danger"  onClick={() => handleDeny(a.requestId)}>Deny</button>
              </div>
            </div>
          ))}
        </>
      )}

      <hr className="divider" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".85rem" }}>
        <Link to="/enroll-new-device" style={{ color: "var(--accent)", textDecoration: "none" }}>
          + Enroll new device
        </Link>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontSize: ".85rem" }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
