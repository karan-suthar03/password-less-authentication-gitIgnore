/**
 * lib/deviceSignals.js
 * Collect browser-safe, hardware-free device context signals.
 * No raw hardware identifiers. No biometrics.
 */

export function collectDeviceSignals() {
  return {
    userAgent: navigator.userAgent,
    platform:  navigator.platform,
    language:  navigator.language,
    timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth:   screen.colorDepth,
    screenWidth:  screen.width,
    screenHeight: screen.height,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack:    navigator.doNotTrack ?? null,
    collectedAt:   new Date().toISOString(),
  };
}
