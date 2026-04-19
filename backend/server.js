import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { createApp } from "./app.js";

// Load env vars
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = createApp();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
