/**
 * recovery.js
 * Client-side helper for downloading the recovery key file.
 */

/**
 * Trigger a browser download of the recovery key JSON file.
 * @param {object} recoveryKey  The recovery key object from the server
 * @param {string} fileName     Suggested file name
 */
export function downloadRecoveryKey(recoveryKey, fileName) {
  const blob = new Blob([JSON.stringify(recoveryKey, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "recovery-key.json";
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
