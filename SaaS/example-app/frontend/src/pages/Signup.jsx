import { useState } from "react";
import { Link } from "react-router-dom";
import pb from "../passkey.js";

export default function Signup() {
  const [form, setForm]     = useState({ email: "", govIdNumber: "" });
  const [step, setStep]     = useState("form");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await pb.signup(form);
      setStep("check-email");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>Create account</h1>
      <p className="subtitle">Passwordless · Windows Hello / Touch ID / Face ID</p>

      {error && <div className="alert alert-error">{error}</div>}

      {step === "form" && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              placeholder="you@example.com"
              value={form.email} onChange={handleChange}
              required autoFocus disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="govIdNumber">Government ID Number</label>
            <input
              id="govIdNumber" name="govIdNumber" type="text"
              placeholder="e.g. 1234-5678-9012"
              value={form.govIdNumber} onChange={handleChange}
              required disabled={loading}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" />Verifying identity…</> : "Sign up"}
          </button>
        </form>
      )}

      {step === "check-email" && (
        <div style={{ textAlign: "center" }}>
          <div className="alert alert-success">
            A magic link has been sent to <strong>{form.email}</strong>.<br />
            Click the link in your email to continue.
          </div>
          <p style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: "1rem" }}>
            The link expires in 10 minutes. Check your spam folder if you don't see it.
          </p>
        </div>
      )}

      <div className="link-row">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}
