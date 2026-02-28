import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import pb from "../passkey.js";

export default function Login() {
  const navigate = useNavigate();
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep]     = useState("idle");

  const email = localStorage.getItem("user_email") ?? "";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setStep("webauthn");
    setLoading(true);

    try {
      await pb.login();
      navigate("/home");
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Windows Hello prompt was dismissed. Please try again."
          : err.name === "NotSupportedError"
          ? "Platform authenticator not available on this device."
          : err.message,
      );
    } finally {
      setStep("idle");
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>Welcome back</h1>
      <p className="subtitle">
        {email ? `Signing in as ${email}` : "Passwordless · Windows Hello / Touch ID"}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {step === "webauthn" && (
        <div className="alert alert-info">
          <span className="spinner" />
          Windows Hello is opening — verify with your PIN, fingerprint, or face…
        </div>
      )}

      <form onSubmit={handleLogin}>
        {email && (
          <div className="form-group">
            <label>Account</label>
            <input value={email} readOnly />
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Waiting for Windows Hello…" : "Log in with Windows Hello"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: ".85rem", fontSize: ".75rem", color: "var(--muted)" }}>
        Your biometric data never leaves this device.
      </p>

      <div className="link-row">New here? <Link to="/signup">Create an account</Link></div>
      <div className="link-row" style={{ marginTop: ".4rem" }}>
        New device? <Link to="/enroll-new-device">Enroll this device</Link>
      </div>
    </div>
  );
}
