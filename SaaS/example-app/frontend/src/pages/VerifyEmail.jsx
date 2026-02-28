import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import pb from "../passkey.js";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [step, setStep]       = useState("verifying");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryDownloaded, setRecoveryDownloaded] = useState(false);

  const enrollDataRef = useRef(null);
  const startedRef    = useRef(false);

  useEffect(() => {
    if (!token) {
      setError("No token found in the URL. Please use the magic link from your email.");
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
          ? "Windows Hello was cancelled. Please click the button and try again."
          : err.name === "NotSupportedError"
          ? "Platform authenticator (Windows Hello) is not available on this device."
          : err.message,
      );
      return;
    }

    setLoading(false);
    setStep("recovery");
    pb.downloadRecoveryKey(data.recoveryKey, data.recoveryFileName);
    setRecoveryDownloaded(true);
  };

  const handleContinue = () => navigate("/home");

  return (
    <div className="card">
      <h1>Email Verification</h1>

      {step === "verifying" && (
        <p className="subtitle">Confirming your email…</p>
      )}

      {step === "ready" && (
        <>
          <div className="alert alert-success">
            Email confirmed for <strong>{enrollDataRef.current?.email}</strong>.
          </div>
          <p className="subtitle" style={{ marginTop: "1rem" }}>
            Click the button below to set up Windows Hello. The prompt will open immediately.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <button
            className="btn-primary"
            onClick={handleSetupPasskey}
            disabled={loading}
            style={{ marginTop: "1rem" }}
          >
            {loading ? "Opening Windows Hello\u2026" : "Set up Windows Hello"}
          </button>
        </>
      )}

      {step === "recovery" && (
        <>
          <div className="alert-warn">
            <strong>Recovery key downloaded!</strong> Store this file safely — it is the ONLY way to
            manage your devices if they are all compromised.
          </div>
          <button
            className="btn-primary"
            onClick={handleContinue}
            style={{ marginTop: "1rem" }}
          >
            Continue to Home
          </button>
        </>
      )}

      {step === "error" && (
        <>
          <div className="alert alert-error">{error}</div>
          <div className="link-row" style={{ marginTop: "1rem" }}>
            <Link to="/signup">Back to sign up</Link>
          </div>
        </>
      )}
    </div>
  );
}
