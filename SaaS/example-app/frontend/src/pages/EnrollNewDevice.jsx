import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import pb from "../passkey.js";

const POLL_INTERVAL_MS = 3000;

export default function EnrollNewDevice() {
  const navigate = useNavigate();

  const [step, setStep]     = useState("register");
  const [email, setEmail]   = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

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

    try {
      await pb.requestNewDevice({ email: email.trim() });
      setStep("waiting");
      startPolling();
    } catch (err) {
      setStep("register");
      setError(
        err.name === "NotAllowedError"
          ? "Windows Hello was dismissed. Please try again."
          : err.name === "NotSupportedError"
          ? "Platform authenticator not available on this device."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };


  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { trustState } = await pb.pollDeviceStatus();

        if (trustState === "trusted") {
          clearInterval(pollRef.current);
          setStep("approved");

          try {
            await pb.login();
            navigate("/home");
          } catch (err) {
            setError(err.message);
            setStep("error");
          }
        } else if (trustState === "revoked") {
          clearInterval(pollRef.current);
          setStep("denied");
        }
      } catch {}
    }, POLL_INTERVAL_MS);
  };

  return (
    <div className="card">
      <h1>Enroll New Device</h1>


      {step === "register" && (
        <>
          <p className="subtitle">
            Enroll this device for an existing account. A trusted device must approve the request.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleRequest}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus disabled={loading}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              Register this device
            </button>
          </form>
        </>
      )}


      {step === "webauthn" && (
        <div className="alert alert-info">
          <span className="spinner" />
          Windows Hello is registering this device…
        </div>
      )}


      {step === "waiting" && (
        <div style={{ textAlign: "center" }}>
          <div className="alert alert-warning">
            <span className="spinner" />
            Waiting for a trusted device to approve this request…
          </div>
          <p style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: ".75rem" }}>
            Open the Home page on one of your trusted devices and approve this request.
          </p>
        </div>
      )}


      {step === "denied" && (
        <>
          <div className="alert alert-error">
            This device request was denied. Please contact support if this was unexpected.
          </div>
          <div className="link-row"><Link to="/login">Back to Login</Link></div>
        </>
      )}


      {step === "error" && (
        <>
          <div className="alert alert-error">{error}</div>
          <div className="link-row"><Link to="/login">Back to Login</Link></div>
        </>
      )}

      <hr className="divider" />
      <div className="link-row"><Link to="/login">← Back to Login</Link></div>
    </div>
  );
}
