import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured. Add the project URL and publishable key to .env.local.");
  return createBrowserClient(config.url, config.key);
}
