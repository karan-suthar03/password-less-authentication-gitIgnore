export default function Docs() {
  return (
    <div className="docs">
      <h1>API Documentation</h1>
      <p>
        Integrate passwordless authentication into your app using a single API
        key. All SDK endpoints are available at{" "}
        <code className="inline-code">/sdk/auth/*</code>.
      </p>

      <h2>Authentication</h2>
      <p>
        Every request to the SDK must include your API key in the{" "}
        <code className="inline-code">x-api-key</code> header.
      </p>
      <pre>
{`GET /sdk/auth/status
Headers:
  x-api-key: pl_live_abc123...`}
      </pre>

      <h2>Endpoints</h2>

      <h3>1. Check Key Status</h3>
      <p>Verify that your API key is valid and active.</p>
      <pre>
{`GET /sdk/auth/status

Response:
{
  "valid": true,
  "project": "My App",
  "message": "API key is active"
}`}
      </pre>

      <h3>2. Register a User</h3>
      <p>Register a new end-user within your project.</p>
      <pre>
{`POST /sdk/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "displayName": "Jane Doe"    // optional
}

Response (201):
{
  "message": "User registered",
  "user": { "email": "user@example.com", "displayName": "Jane Doe" }
}`}
      </pre>

      <h3>3. Start Login (Send OTP)</h3>
      <p>
        Initiate a passwordless login. Returns a challenge ID and (in demo mode)
        the OTP code. In production, the code is delivered via email or SMS.
      </p>
      <pre>
{`POST /sdk/auth/login
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "message": "Challenge created. Verify with the code.",
  "challengeId": "uuid-here",
  "code": "482917",
  "expiresInSeconds": 300
}`}
      </pre>

      <h3>4. Verify OTP</h3>
      <p>Verify the one-time code to complete authentication.</p>
      <pre>
{`POST /sdk/auth/verify
Content-Type: application/json

{
  "challengeId": "uuid-here",
  "code": "482917"
}

Response:
{
  "message": "Authentication successful",
  "authenticated": true,
  "user": { "email": "user@example.com", "displayName": "Jane Doe" }
}`}
      </pre>

      <h3>5. List Users</h3>
      <p>List all registered users for your project.</p>
      <pre>
{`GET /sdk/auth/users

Response:
{
  "users": [
    { "email": "user@example.com", "displayName": "Jane Doe", "createdAt": "..." }
  ]
}`}
      </pre>

      <h2>Quick Start (JavaScript)</h2>
      <pre>
{`const API_KEY = "pl_live_abc123...";
const BASE    = "http://localhost:4000/sdk";

// 1. Register a user
await fetch(BASE + "/auth/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  },
  body: JSON.stringify({ email: "user@example.com" }),
});

// 2. Start login
const { challengeId, code } = await fetch(BASE + "/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  },
  body: JSON.stringify({ email: "user@example.com" }),
}).then(r => r.json());

// 3. Verify OTP (user enters 'code' from their email)
const result = await fetch(BASE + "/auth/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  },
  body: JSON.stringify({ challengeId, code }),
}).then(r => r.json());

console.log(result.authenticated); // true`}
      </pre>

      <h2>Error Codes</h2>
      <pre>
{`401 — Missing or invalid API key
403 — API key revoked / inactive
404 — User or challenge not found
409 — User already registered
410 — Challenge expired
400 — Missing required fields`}
      </pre>
    </div>
  );
}
