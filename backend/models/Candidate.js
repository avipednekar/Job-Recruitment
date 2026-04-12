import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    // ── Contact / identity (single source of truth) ──
    name: { type: String, default: "Unknown" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    github: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    summary: { type: String, default: "" },
    title: { type: String, default: "" },

    // ── Matching data ──
    skills: { type: [String], default: [] },
    education: { type: mongoose.Schema.Types.Mixed, default: [] },
    experience: { type: mongoose.Schema.Types.Mixed, default: [] },
    projects: { type: Array, default: [] },
    embedding: { type: [Number], required: true },

    // ── Owner ──
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Candidate", candidateSchema);
