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
    name: "touch_support_change",
    description: "Touch capability changed since enrollment",
    test: ({ device, context }) =>
      device?.contextSnapshot?.touchSupport != null &&
      context?.touchSupport != null &&
      device.contextSnapshot.touchSupport !== context.touchSupport,
    level: "low",
  },
];



const LEVEL_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

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

export function isBlocked(assessment) {
  return assessment.level === "critical";
}


