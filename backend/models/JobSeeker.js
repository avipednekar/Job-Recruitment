import mongoose from "mongoose";

const jobSeekerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    title: { type: String, default: "" },
    bio: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("JobSeeker", jobSeekerSchema);
