import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Strip BOM (U+FEFF) — tránh lỗi khi paste credentials từ clipboard
function stripBOM(str: string): string {
  return (str ?? "").replace(/^﻿/, "").trim();
}

// QUAN TRỌNG: Next.js chỉ inline NEXT_PUBLIC_ vars khi dùng literal syntax.
// KHÔNG dùng process.env[variable] vì sẽ trả về undefined ở runtime.
const supabaseUrl  = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "");
const supabaseAnon = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
const serviceRole  = stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

// Browser client singleton — tạo lười để không crash khi build (url có thể rỗng lúc build)
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnon);
  }
  return _client;
}

// Re-export trực tiếp để các page dùng `supabase.from(...)` vẫn hoạt động
// Dùng getter thay Proxy — đơn giản, không mất this-context
export const supabase = {
  from:    (...args: any[]) => (getSupabase() as any).from(...args),
  rpc:     (...args: any[]) => (getSupabase() as any).rpc(...args),
  auth:    new Proxy({} as any, { get: (_, p) => (getSupabase().auth as any)[p]?.bind(getSupabase().auth) }),
  storage: new Proxy({} as any, { get: (_, p) => (getSupabase().storage as any)[p]?.bind(getSupabase().storage) }),
} as unknown as SupabaseClient;

// Server client (API routes) — service role key không cần public
export function createServerClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
