import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    experience_level: { type: String, default: "" },
    salary_range: { type: String, default: "" },
    description: { type: String, required: true },
    skills: { type: [String], default: [] },
    embedding: { type: [Number], required: true },
    source: { type: String, enum: ["manual", "external"], default: "manual" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Job", jobSchema);
