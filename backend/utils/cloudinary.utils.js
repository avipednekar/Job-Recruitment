import crypto from "crypto";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

const getCloudinaryConfig = () => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_URL in backend/.env.");
  }

  try {
    const parsedUrl = new URL(cloudinaryUrl);
    return {
      cloudName: parsedUrl.hostname,
      apiKey: decodeURIComponent(parsedUrl.username),
      apiSecret: decodeURIComponent(parsedUrl.password),
    };
  } catch {
    throw new Error("Invalid CLOUDINARY_URL. Expected cloudinary://api_key:api_secret@cloud_name");
  }
};

const signParams = (params, apiSecret) => {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${signatureBase}${apiSecret}`)
    .digest("hex");
};

export const uploadFileToCloudinary = async ({
  filePath,
  folder,
  resourceType = "auto",
  originalName,
}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Upload file not found");
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParams = { folder, timestamp };
  const form = new FormData();

  form.append("file", fs.createReadStream(filePath), originalName || path.basename(filePath));
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signParams(uploadParams, apiSecret));

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const response = await axios.post(uploadUrl, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000,
  });

  const data = response.data;

  return {
    url: data.secure_url || data.url,
    publicId: data.public_id,
    assetId: data.asset_id,
    resourceType: data.resource_type,
    format: data.format || path.extname(originalName || filePath).replace(".", ""),
    bytes: data.bytes,
    originalName: originalName || path.basename(filePath),
    uploadedAt: data.created_at ? new Date(data.created_at) : new Date(),
  };
};
