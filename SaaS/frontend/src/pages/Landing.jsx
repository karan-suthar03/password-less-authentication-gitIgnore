import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <>
      <section className="landing">
        <h1>
          Passwordless Auth.
          <br />
          <span className="accent">One API Key.</span>
        </h1>
        <p className="subtitle">
          Add secure, passwordless authentication to any application in minutes.
          Generate an API key, integrate our SDK, and let your users log in
          without passwords.
        </p>
        <div className="cta-group">
          <Link to="/signup">
            <button className="btn btn-primary">Get Your API Key →</button>
          </Link>
          <Link to="/docs">
            <button className="btn btn-ghost">Read the Docs</button>
          </Link>
        </div>
      </section>

      <section className="features container">
        <div className="card">
          <h3>🔐 Passwordless by Default</h3>
          <p>
            OTP-based login out of the box. No passwords to store, no breaches
            to worry about.
          </p>
        </div>
        <div className="card">
          <h3>⚡ 5-Minute Integration</h3>
          <p>
            Generate an API key, add the header to your requests, and
            you're live. That simple.
          </p>
        </div>
        <div className="card">
          <h3>📊 Usage Dashboard</h3>
          <p>
            Monitor API calls, manage multiple projects, and revoke keys
            instantly from one dashboard.
          </p>
        </div>
      </section>
    </>
  );
}
