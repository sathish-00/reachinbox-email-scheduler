import "dotenv/config";

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  DATABASE_URL: requiredEnv("DATABASE_URL"),

  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT || 6379),

  ELASTICSEARCH_URL:
    process.env.ELASTICSEARCH_URL || "http://localhost:9200",

  PORT: Number(process.env.PORT || 5000),

  NODE_ENV: process.env.NODE_ENV || "development",

  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID || "",

  GOOGLE_CLIENT_SECRET:
    process.env.GOOGLE_CLIENT_SECRET || "",

  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/api/auth/google/callback",

  SESSION_SECRET:
    process.env.SESSION_SECRET ||
    "reachinbox-development-secret",

  SLACK_CLIENT_ID:
    process.env.SLACK_CLIENT_ID || "",

  SLACK_CLIENT_SECRET:
    process.env.SLACK_CLIENT_SECRET || "",

  SLACK_REDIRECT_URI:
    process.env.SLACK_REDIRECT_URI ||
    "http://localhost:5000/api/slack/callback",
};