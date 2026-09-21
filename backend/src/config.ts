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
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: process.env.DATABASE_SSL !== "false",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
  serperApiKey: process.env.SERPER_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
  vercelToken: process.env.VERCEL_TOKEN || "",
  evolutionUrl: process.env.EVOLUTION_URL || "",
  evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
  evolutionInstance: process.env.EVOLUTION_INSTANCE || "",
  whatsappTestMode: process.env.WHATSAPP_TEST_MODE === "true",
  whatsappTestNumber: process.env.WHATSAPP_TEST_NUMBER || "",
};

export function assertPersistenceConfig() {
  const missing = [
    ["DATABASE_URL", config.databaseUrl],
    ["SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_PUBLISHABLE_KEY", config.supabasePublishableKey],
    ["SUPABASE_SECRET_KEY", config.supabaseSecretKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length)
    throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
}

export const sitesDir = path.join(config.dataDir, "sites");
