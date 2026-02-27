/**
 * risk.engine.js
 * Framework module — rule-based risk assessment.
 * Returns a risk level: "low" | "medium" | "high"
 * and a list of triggered rule names for transparency.
 *
 * No ML required. Pure deterministic rules.
 */

// ── Rule definitions ───────────────────────────────────────────

const RULES = [
  {
    name: "new_device",
    description: "Device has never been seen before",
    test: ({ device }) => device == null || device.trustState === "pending",
    level: "high",
  },
  {
    name: "revoked_device",
    description: "Device has been explicitly revoked",
    test: ({ device }) => device?.trustState === "revoked",
    level: "critical",
  },
  {
    name: "timezone_shift",
    description: "Timezone differs from the device's enrolled snapshot",
    test: ({ device, context }) =>
      device?.contextSnapshot?.timezone &&
      context?.timezone &&
      device.contextSnapshot.timezone !== context.timezone,
    level: "medium",
  },
  {
    name: "platform_change",
    description: "Platform string differs from enrolled snapshot",
    test: ({ device, context }) =>
      device?.contextSnapshot?.platform &&
      context?.platform &&
      device.contextSnapshot.platform !== context.platform,
    level: "medium",
  },
  {
    name: "language_change",
    description: "Browser language differs from enrolled snapshot",
    test: ({ device, context }) =>
      device?.contextSnapshot?.language &&
      context?.language &&
      device.contextSnapshot.language !== context.language,
    level: "low",
  },
];

// ── Level ordering ─────────────────────────────────────────────

const LEVEL_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Assess the risk of an authentication attempt.
 *
 * @param {{ device: object|null, context: object }} param0
 * @returns {{ level: string, score: number, triggered: string[] }}
 */
export function assess({ device, context = {} }) {
  const triggered = [];
  let maxRank = 0;

  for (const rule of RULES) {
    if (rule.test({ device, context })) {
      triggered.push(rule.name);
      const rank = LEVEL_RANK[rule.level] ?? 0;
      if (rank > maxRank) maxRank = rank;
    }
  }

  const level =
    maxRank === 4 ? "critical" :
    maxRank === 3 ? "high" :
    maxRank === 2 ? "medium" :
    maxRank === 1 ? "low" : "none";

  return { level, score: maxRank, triggered };
}

/**
 * Quick helper: is this attempt blocked?
 * Critical risk or revoked device → deny.
 */
export function isBlocked(assessment) {
  return assessment.level === "critical";
}

/**
 * Quick helper: does this attempt require trusted-device confirmation?
 * high risk → must go through approval flow.
 */
export function requiresApproval(assessment) {
  return assessment.level === "high" || assessment.level === "critical";
}
