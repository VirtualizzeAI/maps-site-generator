import { createClient } from "@supabase/supabase-js";
import { assertPersistenceConfig, config } from "./config.js";

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

export function authClient() {
  assertPersistenceConfig();
  return createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    options,
  );
}

let admin: ReturnType<typeof createClient> | undefined;
export function adminClient() {
  assertPersistenceConfig();
  admin ||= createClient(config.supabaseUrl, config.supabaseSecretKey, options);
  return admin;
}
