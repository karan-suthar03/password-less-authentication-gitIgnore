import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup          from "./pages/Signup.jsx";
import VerifyEmail     from "./pages/VerifyEmail.jsx";
import Login           from "./pages/Login.jsx";
import EnrollNewDevice from "./pages/EnrollNewDevice.jsx";
import Home            from "./pages/Home.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Navigate to="/login" replace />} />
        <Route path="/signup"            element={<Signup />} />
        <Route path="/verify-email"      element={<VerifyEmail />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/enroll-new-device" element={<EnrollNewDevice />} />
        <Route path="/home"              element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
