import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import pb from "../passkey.js";

export default function Login() {
  const navigate  = useNavigate();
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState("idle");

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
          ? "Windows Hello prompt was dismissed or timed out. Please try again."
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
        {email ? `Signing in as ${email}` : "Passwordless \u00b7 Windows Hello"}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {step === "webauthn" && (
        <div className="alert alert-success">
          Windows Hello is opening — verify with your PIN, fingerprint, or face.
        </div>
      )}

      <form onSubmit={handleLogin}>
        {email && (
          <div className="form-group">
            <label>Account</label>
            <input value={email} readOnly style={{ opacity: 0.6, cursor: "default" }} />
          </div>
        )}

        <button
          className="btn-primary"
          type="submit"
          disabled={loading}
        >
          {step === "webauthn" ? "Waiting for Windows Hello\u2026" : "Log in with Windows Hello"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: ".85rem", fontSize: ".8rem", color: "var(--muted)" }}>
        Your biometric data never leaves this device.
      </p>

      <div className="link-row">
        New here? <Link to="/signup">Create an account</Link>
      </div>
      <div className="link-row" style={{ marginTop: ".5rem" }}>
        New device? <Link to="/enroll-new-device">Enroll this device</Link>
      </div>
      <div className="link-row" style={{ marginTop: ".5rem" }}>
        Lost all devices? <Link to="/backdoor">Use recovery key</Link>
      </div>
    </div>
  );
}
