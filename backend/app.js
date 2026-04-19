import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/job.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import externalJobsRoutes from "./routes/external-jobs.routes.js";
import locationRoutes from "./routes/location.routes.js";

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:5174"],
      credentials: true,
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

  return app;
};
