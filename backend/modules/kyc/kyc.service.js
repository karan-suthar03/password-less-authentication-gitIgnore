/**
 * kyc.service.js
 * Framework module — simulated Know-Your-Customer verification.
 *
 * In production this would call an external identity-verification provider
 * (e.g. Jumio, Onfido, Socure). Here we simulate the outcome deterministically:
 *   - If the govIdNumber matches a known-bad pattern → reject
 *   - Otherwise → approve
 *
 * The raw govIdNumber is NEVER stored. Only the result is returned.
 */

const BLOCKED_PATTERNS = [
  /^0{4,}/,            // obviously fake: all zeros
  /invalid/i,          // test sentinel
  /^test-fail/i,       // integration-test sentinel
];

/**
 * Simulate a KYC/identity-document verification.
 *
 * @param {{ govIdNumber: string, email: string }} params
 * @returns {{ passed: boolean, reason?: string, verifiedAt: number }}
 */
export function verifyIdentityDocument({ govIdNumber, email }) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(govIdNumber)) {
      return {
        passed: false,
        reason: "Government ID verification failed. Document could not be validated.",
        verifiedAt: Date.now(),
      };
    }
  }

  // Simulate successful verification
  return {
    passed: true,
    verifiedAt: Date.now(),
  };
}
