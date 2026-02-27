import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerCredential } from "../lib/webauthn";
import { login } from "../lib/auth";
import api from "../lib/api";

/**
 * /enroll-new-device
 *
 * Lets an existing user log in from a brand-new device.
 *
 * Step 1 — "register":  User enters email → Windows Hello registers passkey
 *                        → POST /new-device/request → device is now "pending"
 * Step 2 — "waiting":   Poll GET /new-device/status every 3 s.
 *                        The trusted device must approve from its Home page.
 * Step 3 — "approved":  TrustState flipped to "trusted" → auto-login →
 *                        navigate to /home.
 */

function gatherDeviceContext() {
  return {
    userAgent:    navigator.userAgent,
    platform:     navigator.userAgentData?.platform ?? navigator.platform,
    language:     navigator.language,
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchSupport: navigator.maxTouchPoints > 0,
  };
}

const POLL_INTERVAL_MS = 3000;

export default function EnrollNewDevice() {
  const navigate = useNavigate();

  const [step, setStep]     = useState("register"); // "register" | "webauthn" | "waiting" | "approved" | "denied" | "error"
  const [email, setEmail]   = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [credentialId, setCredentialId] = useState(null);

  const pollRef = useRef(null);

  // ── Clean up polling on unmount ──────────────────────────────
  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── Step 1 → 2: Register passkey + request enrollment ────────
  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    // Register a new passkey for this device via Windows Hello
    setStep("webauthn");
    let cred;
    try {
      cred = await registerCredential({ userId: "pending", email: email.trim() });
      setCredentialId(cred);
    } catch (err) {
      setStep("register");
      setLoading(false);
      setError(
        err.name === "NotAllowedError"
          ? "Windows Hello was dismissed. Please try again."
          : err.name === "NotSupportedError"
          ? "Platform authenticator not available on this device."
          : err.message,
      );
      return;
    }

    // Send the request to the backend
    try {
      await api.post("/new-device/request", {
        email: email.trim(),
        credentialId: cred,
        deviceContext: gatherDeviceContext(),
      });
      setStep("waiting");
      startPolling(cred);
    } catch (err) {
      setStep("register");
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Polling: check trust state every 3 s ─────────────────────
  const startPolling = (cred) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get("/new-device/status");

        if (data.trustState === "trusted") {
          clearInterval(pollRef.current);
          setStep("approved");

          // Auto-login: get JWT cookie then navigate home
          try {
            await login(cred ?? credentialId);
            navigate("/home");
          } catch (err) {
            setError(err.response?.data?.error || err.message);
            setStep("error");
          }
        } else if (data.trustState === "revoked") {
          clearInterval(pollRef.current);
          setStep("denied");
        }
      } catch {
        // Ignore transient network errors during polling
      }
    }, POLL_INTERVAL_MS);
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="card">
      <h1>New Device Login</h1>

      {/* ── Step : register ── */}
      {(step === "register" || step === "webauthn") && (
        <>
          <p className="subtitle">
            Register this device with your account. A trusted device will need to approve it.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          {step === "webauthn" && (
            <div className="alert alert-success">
              Windows Hello is opening — verify with your PIN, fingerprint, or face.
            </div>
          )}

          <form onSubmit={handleRequest}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={step === "webauthn"}
                autoFocus
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading || step === "webauthn"}>
              {step === "webauthn" ? "Waiting for Windows Hello…" : "Register this device"}
            </button>
          </form>
        </>
      )}

      {/* ── Step : waiting ── */}
      {step === "waiting" && (
        <>
          <p className="subtitle">Almost there, <strong>{email}</strong></p>

          <div className="alert alert-warn" style={{ marginBottom: "1.25rem" }}>
            <strong>Approval required.</strong> Open your trusted device and approve this
            request from the dashboard.
          </div>

          <div className="pending-pulse">
            <div className="pulse-ring" />
            <div className="pulse-dot" />
          </div>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: ".85rem", marginTop: "1rem" }}>
            Waiting for approval…
          </p>

          {error && <div className="alert alert-error" style={{ marginTop: "1rem" }}>{error}</div>}
        </>
      )}

      {/* ── Step : approved ── */}
      {step === "approved" && (
        <>
          <div className="alert alert-success">
            Device approved! Logging you in…
          </div>
        </>
      )}

      {/* ── Step : denied ── */}
      {step === "denied" && (
        <>
          <div className="alert alert-error">
            Your request was denied by the trusted device.
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={() => { setStep("register"); setError(""); }}
          >
            Try again
          </button>
        </>
      )}

      {/* ── Step : error ── */}
      {step === "error" && error && (
        <>
          <div className="alert alert-error">{error}</div>
          <button
            className="btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={() => { setStep("register"); setError(""); }}
          >
            Try again
          </button>
        </>
      )}

      <div className="link-row" style={{ marginTop: "1.25rem" }}>
        <Link to="/login">← Back to login</Link>
      </div>
    </div>
  );
}
