import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import api from "./lib/api";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Docs from "./pages/Docs";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const handleAuth = (tenant) => setUser(tenant);

  const handleLogout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  if (checking) return null;

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={<Login onAuth={handleAuth} />}
        />
        <Route
          path="/signup"
          element={<Signup onAuth={handleAuth} />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </>
  );
}
