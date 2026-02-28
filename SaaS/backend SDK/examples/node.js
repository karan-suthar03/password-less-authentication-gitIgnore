import { PasskeyClient, PasskeyError } from "../index.js";

const passkey = new PasskeyClient({
  baseUrl: process.env.PASSKEY_BASE_URL ?? "http://localhost:4000",
  apiKey:  process.env.PASSKEY_API_KEY  ?? "pl_live_REPLACE_WITH_YOUR_KEY",
  timeout: 10000,
});

async function main() {
  const testEmail = `demo_${Date.now()}@example.com`;


  console.log("─── 1. Checking API key status ───");
  try {
    const info = await passkey.status();
    console.log("  ✓ Valid key for project:", info.project);
  } catch (err) {
    handleError(err);
    return;
  }


  console.log(`\n─── 2. Registering user: ${testEmail} ───`);
  try {
    const reg = await passkey.register(testEmail, "Demo User");
    console.log("  ✓ Registered:", reg.user);
  } catch (err) {
    handleError(err);
    return;
  }


  console.log("\n─── 3. Starting login challenge ───");
  let challengeId, code;
  try {
    const challenge = await passkey.login(testEmail);
    challengeId = challenge.challengeId;
    code        = challenge.code;
    console.log("  ✓ Challenge ID:", challengeId);
    console.log("  → OTP code (demo only, email in prod):", code);
    console.log(`  → Expires in ${challenge.expiresInSeconds}s`);
  } catch (err) {
    handleError(err);
    return;
  }


  console.log("\n─── 4. Verifying OTP ───");
  try {
    const result = await passkey.verify(challengeId, code);
    console.log("  ✓ Authenticated:", result.authenticated);
    console.log("  → User:", result.user);
  } catch (err) {
    handleError(err);
    return;
  }


  console.log("\n─── 5. Testing wrong code (expect 401/404) ───");
  try {
    const challenge2 = await passkey.login(testEmail);
    await passkey.verify(challenge2.challengeId, "000000");
  } catch (err) {
    if (err instanceof PasskeyError) {
      console.log(`  ✓ Correctly rejected — ${err.status}: ${err.message}`);
    } else {
      handleError(err);
    }
  }


  console.log("\n─── 6. Listing project users ───");
  try {
    const { users } = await passkey.listUsers();
    console.log(`  ✓ Total users: ${users.length}`);
    users.forEach((u) => console.log("    -", u.email, `(${u.displayName})`));
  } catch (err) {
    handleError(err);
  }

  console.log("\n✅ All done!");
}

function handleError(err) {
  if (err instanceof PasskeyError) {
    console.error(`  ✗ PasskeyError [${err.status}]: ${err.message}`);
    if (err.status === 401 && err.message.includes("Invalid API key")) {
      console.error("    → Did you set PASSKEY_API_KEY or replace the placeholder key?");
    }
  } else {
    console.error("  ✗ Unexpected error:", err.message);
  }
}

main();
