import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { registerCredential } from "../lib/webauthn";
import { signupConfirmEmail, enrollDevice, login } from "../lib/auth";
import { downloadRecoveryKey } from "../lib/recovery";

/**
 * /verify-email?token=xxx
 *
 * Opened when the user clicks the magic link from their email.
 *
 * Two-phase flow:
 *   Phase A (automatic): confirm the magic-link token with the server.
 *   Phase B (user-gesture): user clicks a button → Windows Hello fires
 *                           immediately inside that click handler so the
 *                           browser never sees a stale gesture token.
 *
 * navigator.credentials.create() requires a *live* user gesture.
 * Any async network call before it consumes the gesture window, causing
 * NotAllowedError.  Splitting the phases fixes this.
 */
export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  // "verifying" | "ready" | "enrolling" | "recovery" | "done" | "error"
  const [step, setStep]       = useState("verifying");
  const [error, setError]     = useState("");
  const [email, setEmail]     = useState("");
  const [recoveryDownloaded, setRecoveryDownloaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Holds the signupToken returned by phase A so phase B can use it.
  const signupTokenRef = useRef(null);

  // Guard against React StrictMode double-invoking the effect.
  // The magic-link token is single-use, so we must only call the API once.
  const startedRef = useRef(false);

  // ── Phase A: confirm the magic-link token (automatic) ────────────────
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
        const { signupToken, email: confirmedEmail } = await signupConfirmEmail(token);
        signupTokenRef.current = signupToken;
        setEmail(confirmedEmail);
        setStep("ready"); // show the "Set up Windows Hello" button
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        setStep("error");
      }
    })();
  }, [token]);

  // ── Phase B: WebAuthn + enroll (must be called directly from a click) ─
  async function handleSetupPasskey() {
    setLoading(true);
    setError("");

    // navigator.credentials.create must be called synchronously
    // (no awaits before it) within a user-gesture handler.
    let credentialId;
    try {
      credentialId = await registerCredential({ userId: "pending", email });
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Windows Hello was cancelled. Please click the button and try again."
          : err.name === "NotSupportedError"
          ? "Platform authenticator (Windows Hello) is not available on this device."
          : err.message
      );
      setLoading(false);
      return;
    }

    try {
      setStep("enrolling");
      const enrollResult = await enrollDevice({
        signupToken: signupTokenRef.current,
        credentialId,
      });

      if (enrollResult.recoveryKey) {
        setStep("recovery");
        downloadRecoveryKey(enrollResult.recoveryKey, enrollResult.recoveryFileName);
        setRecoveryDownloaded(true);
        await new Promise((r) => setTimeout(r, 2000));
      }

      await login(credentialId);
      localStorage.setItem("user_email", email);
      setStep("done");
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1>Email Verification</h1>

      {step === "verifying" && (
        <p className="subtitle">Confirming your email…</p>
      )}

      {step === "ready" && (
        <>
          <div className="alert alert-success">
            Email confirmed for <strong>{email}</strong>.
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
            {loading ? "Opening Windows Hello…" : "Set up Windows Hello"}
          </button>
        </>
      )}

      {step === "enrolling" && (
        <p className="subtitle">Registering your device…</p>
      )}

      {step === "recovery" && (
        <>
          <p className="subtitle">Email confirmed for <strong>{email}</strong></p>
          <div className="alert alert-warn">
            <strong>Recovery key downloaded!</strong> Store this file safely — it is the ONLY way to
            manage your devices if they are all compromised.
          </div>
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
