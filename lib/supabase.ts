import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Strip BOM (U+FEFF) và whitespace — tránh lỗi khi copy-paste credentials có BOM
function cleanEnv(key: string): string {
  return (process.env[key] ?? "").replace(/^﻿/, "").trim();
}

// Lazy singleton — không gọi createClient lúc module load để tránh crash khi build
let _browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(
      cleanEnv("NEXT_PUBLIC_SUPABASE_URL"),
      cleanEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }
  return _browserClient;
}

// Alias để các page hiện tại không cần đổi tên
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export function createServerClient(): SupabaseClient {
  return createClient(
    cleanEnv("NEXT_PUBLIC_SUPABASE_URL"),
    cleanEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
