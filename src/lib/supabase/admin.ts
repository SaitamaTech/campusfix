import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

/**
 * Server-only Supabase admin client using SUPABASE_SERVICE_ROLE_KEY.
 * Strictly for trusted server operations where RLS bypass is audited and required.
 */
export function createAdminClient() {
  const publicEnv = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!publicEnv || !serviceRoleKey) {
    return null;
  }

  return createClient(publicEnv.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
