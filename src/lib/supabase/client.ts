"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(env.url, env.anonKey);
  }
  return browserClient;
}
