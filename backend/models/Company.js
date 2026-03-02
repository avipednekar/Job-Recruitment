import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    website: { type: String, default: "" },
    location: { type: String, default: "" },
    logo: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Company", companySchema);
