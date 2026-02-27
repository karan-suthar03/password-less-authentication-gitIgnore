/**
 * components/TrustBadge.jsx
 * Visual indicator for device trust state.
 */

const CONFIG = {
  trusted: { label: "Trusted",  color: "var(--success)", icon: "✓" },
  pending: { label: "Pending",  color: "var(--warn)",    icon: "⏳" },
  revoked: { label: "Revoked",  color: "var(--error)",   icon: "✕" },
  none:    { label: "No Device", color: "var(--text-dim)", icon: "○" },
};

export default function TrustBadge({ state = "none" }) {
  const { label, color, icon } = CONFIG[state] ?? CONFIG.none;
  return (
    <span className="trust-badge" style={{ "--badge-color": color }}>
      {icon} {label}
    </span>
  );
}
