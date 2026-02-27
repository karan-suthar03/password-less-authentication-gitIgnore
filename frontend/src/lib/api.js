import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,              // sends httpOnly cookies automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Global response interceptor: detect IP-change invalidation ─────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error.response?.data?.code;
    if (code === "IP_CHANGED") {
      // Store a flag so the Login page can show a contextual message
      sessionStorage.setItem("ip_changed", "1");
      window.location.href = "/login";
      // Return a never-resolving promise so downstream .catch() handlers
      // don't fire after the redirect has been initiated.
      return new Promise(() => {});
    }
    return Promise.reject(error);
  },
);

export default api;
