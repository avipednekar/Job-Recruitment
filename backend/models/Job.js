import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    experience_level: { type: String, default: "" },
    salary_range: { type: String, default: "" },
    salary_min: { type: Number, default: 0 },
    salary_max: { type: Number, default: 0 },
    description: { type: String, required: true },
    skills: { type: [String], default: [] },
    employment_type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },
    remote: { type: Boolean, default: false },
    urgent: { type: Boolean, default: false },
    logo: { type: String, default: "" },
    logoColor: { type: String, default: "#2176FF" },
    status: {
      type: String,
      enum: ["active", "closed", "draft"],
      default: "active",
    },
    embedding: { type: [Number], default: [] },
    source: { type: String, enum: ["manual", "external"], default: "manual" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Text index for search
jobSchema.index({ title: "text", company: "text", description: "text" });

export default mongoose.model("Job", jobSchema);
