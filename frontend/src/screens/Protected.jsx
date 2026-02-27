/**
 * screens/Protected.jsx
 * Displays protected demo data after successful passkey login.
 */

import { useState } from "react";
import * as api from "../lib/api.js";
import ResponsePanel from "../components/ResponsePanel.jsx";
import TrustBadge from "../components/TrustBadge.jsx";

const DEMO_DATA = [
  { label: "Account Balance",   value: "$12,480.00",       icon: "💰" },
  { label: "Recent Transaction", value: "Amazon −$34.99",    icon: "🛝" },
  { label: "Savings Goal",       value: "68% complete",     icon: "🎯" },
  { label: "Loyalty Points",     value: "4,210 pts",        icon: "⭐" },
];

export default function Protected({ token, trustState }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [fetched, setFetched] = useState(false);

  async function handleFetch() {
    setLoading(true);
    setResult(null);
    const res = await api.getProtected(token);
    setResult({ ...res, endpoint: "GET /protected" });
    setLoading(false);
    if (res.ok) setFetched(true);
  }

  return (
    <section className="screen">
      <h2>🛡 Protected Dashboard</h2>
      <p className="screen-desc">
        You are authenticated via passkey. The data below is only accessible
        with a valid JWT from a trusted device.
      </p>

      <div className="info-row">
        <span>Trust state:</span>
        <TrustBadge state={trustState ?? "none"} />
      </div>

      <div className="info-row">
        <span>Token:</span>
        <span className={token ? "ok-text" : "err-text"}>
          {token ? `${token.slice(0, 24)}…` : "No token"}
        </span>
      </div>

      <button
        className="btn primary"
        onClick={handleFetch}
        disabled={loading || !token}
      >
        {loading ? <span className="spinner" /> : "🔓 "}
        {loading ? "Fetching…" : "Fetch Protected Data"}
      </button>

      {fetched && (
        <div className="demo-grid">
          {DEMO_DATA.map((item) => (
            <div key={item.label} className="demo-card">
              <span className="demo-icon">{item.icon}</span>
              <span className="demo-label">{item.label}</span>
              <span className="demo-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {!token && (
        <p className="warn">⚠ Complete Login first to obtain a JWT.</p>
      )}

      <ResponsePanel result={result} loading={loading} />
    </section>
  );
}
