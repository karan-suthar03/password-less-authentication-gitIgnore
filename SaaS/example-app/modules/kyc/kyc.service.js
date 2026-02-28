const BLOCKED_PATTERNS = [
  /^0{4,}/,
  /invalid/i,
  /^test-fail/i,
];

export function verifyIdentityDocument({ govIdNumber }) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(govIdNumber)) {
      return {
        passed: false,
        reason: "Government ID verification failed. Document could not be validated.",
        verifiedAt: Date.now(),
      };
    }
  }
  return { passed: true, verifiedAt: Date.now() };
}
