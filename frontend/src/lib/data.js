import api from "./api";

/**
 * Fetch the protected dashboard data (auth-info).
 * The Authorization header is attached automatically by the axios interceptor.
 * @returns {Promise<{ userId: string, deviceId: string, trustState: string, timestamp: string }>}
 */
export async function fetchProtectedData() {
  const { data } = await api.get("/protected");
  return data;
}
