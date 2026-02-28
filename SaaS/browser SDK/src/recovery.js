export function downloadRecoveryKey(content, fileName = "recovery-key.json") {
  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);

  const blob = new Blob([text], { type: "application/json" });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
