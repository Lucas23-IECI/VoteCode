import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.dirname(__filename);
const rootDir = path.resolve(backendDir, "..");

export const config = {
  backendDir,
  rootDir,
  frontendDir: path.join(rootDir, "frontend"),
  port: Number(process.env.PORT || 5177),
  sessionSecret: process.env.SESSION_SECRET || "votecode-local-secret",
  nodeEnv: process.env.NODE_ENV || "development",
};

config.baseUrl = (process.env.BASE_URL || `http://127.0.0.1:${config.port}`).replace(/\/$/, "");
config.googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
config.devLoginEnabled = process.env.ENABLE_DEV_LOGIN !== "false" && config.nodeEnv !== "production";
config.supabaseUrl = process.env.SUPABASE_URL || "";
config.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function validateConfig() {
  const missing = [];

  if (!config.supabaseUrl) missing.push("SUPABASE_URL");
  if (!config.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
}
