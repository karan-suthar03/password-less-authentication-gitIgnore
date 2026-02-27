/**
 * App.jsx
 * Root component: Signup → Login → Protected.
 */

import { useState } from "react";
import "./App.css";

import NavBar    from "./components/NavBar.jsx";
import Signup    from "./screens/Signup.jsx";
import Login     from "./screens/Login.jsx";
import Protected from "./screens/Protected.jsx";

export default function App() {
  const [screen, setScreen]             = useState("signup");
  const [token, setToken]               = useState(null);
  const [trustState, setTrustState]     = useState(null);
  const [userId, setUserId]             = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);

  function markDone(stepId) {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev : [...prev, stepId]
    );
  }

  function onSignupSuccess() {
    markDone("signup");
    setScreen("login");
  }

  function onLoginSuccess({ token: t, trustState: ts, userId: uid }) {
    setToken(t);
    setTrustState(ts);
    setUserId(uid);
    markDone("login");
    setScreen("protected");
  }

  function handleLogout() {
    setToken(null);
    setTrustState(null);
    setUserId(null);
    setCompletedSteps([]);
    setScreen("login");
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔑 Passwordless Auth</h1>
        <p>Passkey-based sign-up &amp; login · No passwords · No OTPs</p>

        <div className="session-bar">
          <span className={`pill ${token ? "trusted" : "none"}`}>
            {token ? `Signed in as ${userId ?? "user"} · ${trustState}` : "Not signed in"}
          </span>
          {token && (
            <button className="btn ghost" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </header>

      <NavBar
        current={screen}
        onNavigate={setScreen}
        completedSteps={completedSteps}
      />

      <main className="main">
        {screen === "signup" && (
          <Signup onSuccess={onSignupSuccess} />
        )}
        {screen === "login" && (
          <Login onSuccess={onLoginSuccess} />
        )}
        {screen === "protected" && (
          <Protected token={token} trustState={trustState} />
        )}
      </main>
    </div>
  );
}
