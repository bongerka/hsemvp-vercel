"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv, publicEnv } from "@/lib/env";

let browserClient:
  | ReturnType<typeof createBrowserClient>
  | undefined;

export function createClient() {
  assertSupabaseEnv();

  browserClient ??= createBrowserClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );

  return browserClient;
}
