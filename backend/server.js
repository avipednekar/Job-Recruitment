import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

const { default: connectDB } = await import("./config/db.js");
const { createApp } = await import("./app.js");
const { getEmailConfigStatus } = await import("./utils/email.utils.js");

// Connect to MongoDB Atlas
connectDB();

const emailConfig = getEmailConfigStatus();
console.log(
  `[Email] SMTP host=${emailConfig.host} user=${emailConfig.hasUser ? "set" : "missing"} pass=${emailConfig.hasPass ? "set" : "missing"}`,
);

const app = createApp();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
