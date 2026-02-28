export function getDeviceContext() {
  return {
    userAgent:    navigator.userAgent,
    platform:     navigator.userAgentData?.platform ?? navigator.platform,
    language:     navigator.language,
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchSupport: navigator.maxTouchPoints > 0,
  };
}
