import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/job.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import externalJobsRoutes from "./routes/external-jobs.routes.js";
import locationRoutes from "./routes/location.routes.js";

// Load env vars
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Vite React frontend
    credentials: true, // Allow cookies
  }),
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/external-jobs", externalJobsRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/locations", locationRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "backend-api",
    port: process.env.PORT || 4000,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
