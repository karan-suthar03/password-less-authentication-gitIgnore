/**
 * components/ResponsePanel.jsx
 * Displays backend API responses in a readable panel.
 */

export default function ResponsePanel({ result, loading }) {
  if (loading) {
    return (
      <div className="response-panel loading">
        <div className="panel-header">
          <span>Response</span>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="response-panel">
      <div className="panel-header">
        <span>{result.endpoint}</span>
        <span className={`status-badge ${result.ok ? "ok" : "err"}`}>
          {result.status} {result.ok ? "OK" : "Error"}
        </span>
      </div>
      <pre>{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
}
