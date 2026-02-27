/**
 * screens/Signup.jsx
 * Register identity + create passkey in one step.
 * No passwords — a passkey is created via WebAuthn on this device.
 */

import { useState } from "react";
import * as api from "../lib/api.js";
import { createPasskey, isWebAuthnAvailable } from "../lib/webauthn.js";
import { collectDeviceSignals } from "../lib/deviceSignals.js";
import ResponsePanel from "../components/ResponsePanel.jsx";

export default function Signup({ onSuccess }) {
  const [email, setEmail]     = useState("");
  const [govId, setGovId]     = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState(""); // status text
  const [result, setResult]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // 1. Register identity with backend
      setStep("Registering identity…");
      const signupRes = await api.signup(email.trim(), govId.trim());
      if (!signupRes.ok || !signupRes.data?.signupToken) {
        setResult({ ...signupRes, endpoint: "POST /signup" });
        return;
      }
      const { signupToken } = signupRes.data;

      // 2. Create passkey on this device (browser prompt)
      setStep("Creating passkey — check your browser prompt…");
      const { credentialId } = await createPasskey({ email: email.trim() });

      // 3. Enroll the device with the passkey
      setStep("Enrolling device…");
      const deviceContext = collectDeviceSignals();
      const enrollRes = await api.enrollDevice(signupToken, deviceContext, credentialId);
      setResult({ ...enrollRes, endpoint: "POST /enroll-device" });

      if (enrollRes.ok) {
        setStep("Done! Redirecting to login…");
        onSuccess();
      }
    } catch (err) {
      setResult({ ok: false, status: 0, data: { error: err.message }, endpoint: "signup" });
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  return (
    <section className="screen">
      <h2>Create Account</h2>
      <p className="screen-desc">
        Enter your email and a government ID number (simulated). A{" "}
        <strong>passkey</strong> will be created on this device — no password needed.
        {!isWebAuthnAvailable() && (
          <><br /><span className="warn">⚠ WebAuthn not available — a simulated credential will be used.</span></>
        )}
      </p>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </label>

        <label>
          Government ID <span className="dimmed">(simulated)</span>
          <input
            type="text"
            value={govId}
            onChange={(e) => setGovId(e.target.value)}
            placeholder="ID-12345678"
            required
          />
        </label>

        <p className="hint">
          The ID number is SHA-256 hashed immediately — the raw value is never stored.
        </p>

        <button
          type="submit"
          className="btn primary"
          disabled={loading || !email || !govId}
        >
          {loading ? <span className="spinner" /> : "🔑 "}
          {loading ? step || "Working…" : "Sign Up with Passkey"}
        </button>
      </form>

      <ResponsePanel result={result} loading={loading} />
    </section>
  );
}
