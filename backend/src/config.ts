import "dotenv/config";
import path from "node:path";

const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: number(process.env.PORT, 8000),
  host: process.env.HOST || "0.0.0.0",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  publicApiUrl: process.env.PUBLIC_API_URL || "http://localhost:8000",
  dataDir: path.resolve(process.env.DATA_DIR || "./data"),
  mode: (process.env.INTEGRATIONS_MODE || "mock") as "mock" | "real",
  workerPollMs: number(process.env.WORKER_POLL_MS, 2000),
  adminName: process.env.ADMIN_NAME || "Administrador",
  adminEmail: process.env.ADMIN_EMAIL || "admin@virtualizze.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  organizationName: process.env.ORGANIZATION_NAME || "Virtualizze",
  serperApiKey: process.env.SERPER_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
  vercelToken: process.env.VERCEL_TOKEN || "",
  evolutionUrl: process.env.EVOLUTION_URL || "",
  evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
  evolutionInstance: process.env.EVOLUTION_INSTANCE || "",
};

export const sitesDir = path.join(config.dataDir, "sites");
