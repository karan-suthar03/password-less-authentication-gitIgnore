import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import pb from "../passkey.js";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [step, setStep]     = useState("verifying");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryDownloaded, setRecoveryDownloaded] = useState(false);

  const enrollDataRef = useRef(null);

  const startedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setError("No token in URL. Use the magic link from your email.");
      setStep("error");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const { signupToken, userId, email } = await pb.confirmEmail(token);
        enrollDataRef.current = { signupToken, userId, email };
        localStorage.setItem("user_email", email);
        setStep("ready");
      } catch (err) {
        setError(err.message);
        setStep("error");
      }
    })();
  }, [token]);


  const handleSetupPasskey = async () => {
    setLoading(true);
    setError("");

    const { signupToken, userId, email } = enrollDataRef.current;

    let data;
    try {
      data = await pb.enrollDevice({ signupToken, userId, email });
    } catch (err) {
      setLoading(false);
      setError(
        err.name === "NotAllowedError"
          ? "Windows Hello was cancelled. Click the button again to retry."
          : err.name === "NotSupportedError"
          ? "Platform authenticator (Windows Hello / Touch ID) is not available on this device."
          : err.message,
      );
      return;
    }

    setLoading(false);
    setStep("recovery");

    pb.downloadRecoveryKey(data.recoveryKey, data.recoveryFileName);
  };

  const handleContinue = () => navigate("/home");

  return (
    <div className="card">
      <h1>Verify Email</h1>


      {step === "verifying" && (
        <div className="alert alert-info">
          <span className="spinner" />Verifying your magic link…
        </div>
      )}


      {step === "error" && (
        <>
          <div className="alert alert-error">{error}</div>
          <div className="link-row"><Link to="/signup">Start over</Link></div>
        </>
      )}

      {step === "ready" && (
        <>
          <p className="subtitle">
            Email confirmed. Now set up your passkey — the OS biometric prompt will open.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn-primary" onClick={handleSetupPasskey} disabled={loading}>
            {loading
              ? <><span className="spinner" />Waiting for Windows Hello…</>
              : "Set up Windows Hello / Touch ID"}
          </button>
          <p style={{ fontSize: ".75rem", color: "var(--muted)", marginTop: ".75rem", textAlign: "center" }}>
            Your biometric data never leaves this device.
          </p>
        </>
      )}


      {step === "recovery" && (
        <>
          <div className="alert alert-warning">
            <strong>Save your recovery key!</strong><br />
            A JSON file is downloading now. Store it safely — it's your only way to
            recover access if you lose all enrolled devices.
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".85rem", cursor: "pointer", margin: ".75rem 0" }}>
            <input
              type="checkbox"
              checked={recoveryDownloaded}
              onChange={(e) => setRecoveryDownloaded(e.target.checked)}
              style={{ width: "auto" }}
            />
            I have saved my recovery key file
          </label>
          <button className="btn-primary" onClick={handleContinue} disabled={!recoveryDownloaded}>
            Continue to Home
          </button>
        </>
      )}
    </div>
  );
}
