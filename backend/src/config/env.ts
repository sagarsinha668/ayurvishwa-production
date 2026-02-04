import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  // Database
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/pms_local",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
};
