import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["applied", "screening", "interview", "offer", "rejected"],
      default: "applied",
    },
    ai_match_score: { type: Number, default: null },
    ai_breakdown: { type: Object, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Application", applicationSchema);
