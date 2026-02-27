import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { registerCredential } from "../lib/webauthn";
import { signupConfirmEmail, enrollDevice, login } from "../lib/auth";

/**
 * /verify-email?token=xxx
 *
 * Opened when the user clicks the magic link from their email.
 * Automatically confirms the token, then walks through WebAuthn
 * enrollment and auto-login — no manual input required.
 */
export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [step, setStep]       = useState("verifying"); // "verifying" | "webauthn" | "enrolling" | "done" | "error"
  const [error, setError]     = useState("");
  const [email, setEmail]     = useState("");

  // Guard against React StrictMode double-invoking the effect.
  // The magic-link token is single-use, so we must only call the API once.
  const startedRef = useRef(false);

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
        // ── Step 1: confirm the magic-link token ──────────────────────
        const { signupToken, email: confirmedEmail } = await signupConfirmEmail(token);
        setEmail(confirmedEmail);

        // ── Step 2: WebAuthn passkey registration (Windows Hello) ─────
        setStep("webauthn");

        let credentialId;
        try {
          credentialId = await registerCredential({ userId: "pending", email: confirmedEmail });
        } catch (err) {
          throw new Error(
            err.name === "NotAllowedError"
              ? "Windows Hello prompt was dismissed. Please try again."
              : err.name === "NotSupportedError"
              ? "Platform authenticator (Windows Hello) is not available on this device."
              : err.message
          );
        }

        // ── Step 3: enroll the device ─────────────────────────────────
        setStep("enrolling");
        await enrollDevice({ signupToken, credentialId });

        // ── Step 4: auto-login to get the JWT cookie ──────────────────
        await login(credentialId);

        localStorage.setItem("user_email", confirmedEmail);
        setStep("done");
        navigate("/home");
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        setStep("error");
      }
    })();
  }, [token, navigate]);

  return (
    <div className="card">
      <h1>Email Verification</h1>

      {step === "verifying" && (
        <p className="subtitle">Confirming your email…</p>
      )}

      {step === "webauthn" && (
        <>
          <p className="subtitle">Email confirmed for <strong>{email}</strong></p>
          <div className="alert alert-success">
            Windows Hello is opening — verify with your PIN, fingerprint, or face.
          </div>
        </>
      )}

      {step === "enrolling" && (
        <p className="subtitle">Registering your device…</p>
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
