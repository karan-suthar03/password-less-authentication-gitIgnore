/**
 * risk.engine.js
 * Framework module — rule-based risk assessment.
 * Returns a risk level: "low" | "medium" | "high" | "critical"
 * and a list of triggered rule names for transparency.
 *
 * Compares current login context against the baseline snapshot
 * captured during device enrollment.
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
  {
    name: "screen_resolution_change",
    description: "Screen resolution differs from enrolled snapshot",
    test: ({ device, context }) =>
      device?.contextSnapshot?.screenWidth &&
      context?.screenWidth &&
      (device.contextSnapshot.screenWidth !== context.screenWidth ||
       device.contextSnapshot.screenHeight !== context.screenHeight),
    level: "low",
  },
  {
    name: "hardware_concurrency_change",
    description: "CPU core count differs from enrolled snapshot",
    test: ({ device, context }) =>
      device?.contextSnapshot?.hardwareConcurrency != null &&
      context?.hardwareConcurrency != null &&
      device.contextSnapshot.hardwareConcurrency !== context.hardwareConcurrency,
    level: "medium",
  },
  {
    name: "device_memory_change",
    description: "Reported device memory differs from enrolled snapshot",
    test: ({ device, context }) =>
      device?.contextSnapshot?.deviceMemory != null &&
      context?.deviceMemory != null &&
      device.contextSnapshot.deviceMemory !== context.deviceMemory,
    level: "medium",
  },
  {
    name: "touch_support_change",
    description: "Touch capability changed since enrollment",
    test: ({ device, context }) =>
      device?.contextSnapshot?.touchSupport != null &&
      context?.touchSupport != null &&
      device.contextSnapshot.touchSupport !== context.touchSupport,
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


