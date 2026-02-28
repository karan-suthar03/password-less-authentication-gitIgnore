function bufToBase64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlToBuf(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}

export async function registerCredential({ userId, email }) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,

      rp: {
        name: "Secure Auth",
        id: window.location.hostname,
      },

      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName: email,
      },

      pubKeyCredParams: [
        { alg: -7,   type: "public-key" },
        { alg: -257, type: "public-key" },
      ],

      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
      },

      hints: ["client-device"],

      timeout: 60_000,
      attestation: "none",
    },
  });

  const credentialId = bufToBase64url(credential.rawId);
  localStorage.setItem("credential_id", credentialId);
  return credentialId;
}

export async function authenticateCredential(credentialId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,

      allowCredentials: [
        {
          id:   base64urlToBuf(credentialId),
          type: "public-key",
          transports: ["internal"],
        },
      ],

      hints: ["client-device"],

      userVerification: "required",
      timeout: 60_000,
    },
  });

  return bufToBase64url(assertion.rawId);
}
