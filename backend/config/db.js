import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "ai_recruitment",
    });
    console.log(`✅ MongoDB Connected (Mongoose): ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
