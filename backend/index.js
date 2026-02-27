/**
 * index.js — Passwordless Auth Framework
 * Modular Express server. No app-specific logic here.
 */

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes
import signupRoute        from "./routes/signup.js";
import enrollDeviceRoute  from "./routes/enrollDevice.js";
import loginRoute         from "./routes/login.js";
import requestNewDevice   from "./routes/requestNewDevice.js";
import approveDeviceRoute from "./routes/approveDevice.js";
import revokeDeviceRoute  from "./routes/revokeDevice.js";
import protectedRoute     from "./routes/protected.js";

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────
app.use("/signup",            signupRoute);
app.use("/enroll-device",     enrollDeviceRoute);
app.use("/login",             loginRoute);
app.use("/request-new-device", requestNewDevice);
app.use("/approve-device",    approveDeviceRoute);
app.use("/revoke-device",     revokeDeviceRoute);
app.use("/protected",         protectedRoute);

// ── Global error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Passwordless auth backend → http://localhost:${PORT}`);
});