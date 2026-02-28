import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerCredential } from "../lib/webauthn";
import { login } from "../lib/auth";
import api from "../lib/api";

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

  const [step, setStep]     = useState("register");
  const [email, setEmail]   = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [credentialId, setCredentialId] = useState(null);

  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

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

  const startPolling = (cred) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get("/new-device/status");

        if (data.trustState === "trusted") {
          clearInterval(pollRef.current);
          setStep("approved");

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
      } catch {}
    }, POLL_INTERVAL_MS);
  };

  return (
    <div className="card">
      <h1>New Device Login</h1>

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

      {step === "approved" && (
        <>
          <div className="alert alert-success">
            Device approved! Logging you in…
          </div>
        </>
      )}

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
