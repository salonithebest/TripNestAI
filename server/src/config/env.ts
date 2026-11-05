import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: required("MONGODB_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  NODE_ENV: process.env.NODE_ENV || "development",
  DNS_SERVER: process.env.DNS_SERVER,
};

export function hasConfiguredGeminiKey(): boolean {
  return env.GEMINI_API_KEY.length > 0;
}

export function getGeminiConfigurationError(): string | null {
  if (!env.GEMINI_API_KEY) return "Gemini key missing in server/.env";
  return null;
}
