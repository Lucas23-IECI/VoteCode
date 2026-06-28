import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.dirname(__filename);
const rootDir = path.resolve(backendDir, "..");
const dataDirFromEnv = process.env.DATA_DIR;

function resolveDataDir(value) {
  if (!value && process.env.VERCEL) return "/tmp/votecode-data";
  if (!value) return path.join(rootDir, "data");
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

export const config = {
  backendDir,
  rootDir,
  frontendDir: path.join(rootDir, "frontend"),
  dataDir: resolveDataDir(dataDirFromEnv),
  port: Number(process.env.PORT || 5177),
  sessionSecret: process.env.SESSION_SECRET || "votecode-local-secret",
  nodeEnv: process.env.NODE_ENV || "development",
};

config.baseUrl = (process.env.BASE_URL || `http://127.0.0.1:${config.port}`).replace(/\/$/, "");
config.databasePath = path.join(config.dataDir, "votecode.json");
config.googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
config.devLoginEnabled = process.env.ENABLE_DEV_LOGIN !== "false" && config.nodeEnv !== "production";
