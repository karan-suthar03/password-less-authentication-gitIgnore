/**
 * index.js — Passwordless Auth Framework
 * Modular Express server. No app-specific logic here.
 */

import express from "express";
import https from "https";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes
import signupRoute        from "./routes/signup.js";
import enrollDeviceRoute  from "./routes/enrollDevice.js";
import loginRoute         from "./routes/login.js";
import logoutRoute        from "./routes/logout.js";
import authCheckRoute     from "./routes/authCheck.js";
import protectedRoute     from "./routes/protected.js";
import backdoorRoute      from "./routes/backdoor.js";
import newDeviceRoute     from "./routes/newDevice.js";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? "https://patch-alarm-sherman-edges.trycloudflare.com",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/signup",            signupRoute);
app.use("/enroll-device",     enrollDeviceRoute);
app.use("/login",             loginRoute);
app.use("/logout",            logoutRoute);
app.use("/auth/check",        authCheckRoute);
app.use("/protected",         protectedRoute);
app.use("/backdoor",          backdoorRoute);
app.use("/new-device",        newDeviceRoute);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ?? 3000;

// Generate a self-signed TLS certificate for local HTTPS dev.
// In production this is replaced by the platform's TLS termination.



app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});