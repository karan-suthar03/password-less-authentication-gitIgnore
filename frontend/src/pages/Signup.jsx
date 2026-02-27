import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerCredential } from "../lib/webauthn";
import { signup, enrollDevice, login } from "../lib/auth";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", govIdNumber: "" });
  const [step, setStep]       = useState("form"); // "form" | "webauthn" | "enrolling"
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Register identity
      const { userId, signupToken } = await signup(form);

      // ── Step 2: Windows Hello biometric registration ──────────────────
      setStep("webauthn");
      setLoading(false);

      let credentialId;
      try {
        credentialId = await registerCredential({ userId, email: form.email });
      } catch (err) {
        throw new Error(
          err.name === "NotAllowedError"
            ? "Windows Hello prompt was dismissed. Please try again."
            : err.name === "NotSupportedError"
            ? "Platform authenticator (Windows Hello) is not available on this device."
            : err.message
        );
      }

      // ── Step 3: Enroll the device with the real passkey credential ────
      setStep("enrolling");
      setLoading(true);

      await enrollDevice({ signupToken, credentialId });

      // ── Step 4: Auto-login to get the JWT ─────────────────────────────
      const loginData = await login(credentialId);


      localStorage.setItem("user_email", form.email);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const stepLabel =
    step === "webauthn"  ? "Waiting for Windows Hello\u2026" :
    step === "enrolling" ? "Registering your device\u2026"   :
    loading              ? "Setting up your account\u2026"   :
                           "Sign up";

  return (
    <div className="card">
      <h1>Create account</h1>
      <p className="subtitle">
        Your identity is secured with Windows Hello — no password needed.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {step === "webauthn" && (
        <div className="alert alert-success">
          Windows Hello is opening — verify with your PIN, fingerprint, or face.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
            disabled={loading || step === "webauthn"}
          />
        </div>

        <div className="form-group">
          <label htmlFor="govIdNumber">Government ID Number</label>
          <input
            id="govIdNumber"
            name="govIdNumber"
            type="text"
            placeholder="e.g. 1234-5678-9012"
            value={form.govIdNumber}
            onChange={handleChange}
            required
            disabled={loading || step === "webauthn"}
          />
        </div>

        <button
          className="btn-primary"
          type="submit"
          disabled={loading || step === "webauthn"}
        >
          {stepLabel}
        </button>
      </form>

      <div className="link-row">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}
