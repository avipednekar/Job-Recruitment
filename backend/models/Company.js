import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    website: { type: String, default: "" },
    location: { type: String, default: "" },
    logo: { type: String, default: "" },
    logoAsset: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      assetId: { type: String, default: "" },
      resourceType: { type: String, default: "image" },
      format: { type: String, default: "" },
      bytes: { type: Number, default: 0 },
      originalName: { type: String, default: "" },
      uploadedAt: { type: Date },
    },
    industry: { type: String, default: "" },
    size: {
      type: String,
      enum: ["", "small", "medium", "large", "enterprise"],
      default: "",
    },
    founded: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Company", companySchema);
