import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import apiKeyRoutes from "./routes/apiKeys.js";
import dashboardRoutes from "./routes/dashboard.js";
import sdkRoutes from "./routes/sdk.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5174",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/sdk", sdkRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SaaS server running on port ${PORT}`);
});
