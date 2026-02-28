import { createHash } from "crypto";
import { v4 as uuid } from "uuid";


const users = new Map();       
const emailIndex = new Map();  

export function createUser({ email, govIdNumber, emailVerified, kycVerified }) {
  if (emailIndex.has(email)) {
    throw Object.assign(new Error("Email already registered"), { code: "EMAIL_TAKEN" });
  }

  const govIdHash = createHash("sha256").update(govIdNumber).digest("hex");
  const userId = uuid();

  const user = {
    userId,
    email,
    govIdHash,                       
    emailVerified: !!emailVerified,  
    kycVerified: !!kycVerified,      
    createdAt: Date.now(),
  };

  users.set(userId, user);
  emailIndex.set(email, userId);

  return user;
}

export function isEmailTaken(email) {
  return emailIndex.has(email);
}

export function createUserFromVerified({ email, govIdHash }) {
  if (emailIndex.has(email)) {
    throw Object.assign(new Error("Email already registered"), { code: "EMAIL_TAKEN" });
  }

  const userId = uuid();

  const user = {
    userId,
    email,
    govIdHash,
    emailVerified: true,
    kycVerified: true,
    createdAt: Date.now(),
  };

  users.set(userId, user);
  emailIndex.set(email, userId);

  return user;
}


export function getUserByEmail(email) {
  const userId = emailIndex.get(email);
  return userId ? users.get(userId) ?? null : null;
}


export function getUserById(userId) {
  return users.get(userId) ?? null;
}


