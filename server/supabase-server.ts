import { createClient } from "@supabase/supabase-js";

const getServerSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY for backend auth checks. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are also accepted as fallbacks.");
  }

  return { supabaseUrl, supabaseAnonKey };
};

export const createServerSupabaseClient = (accessToken: string) => {
  const { supabaseUrl: url, supabaseAnonKey: anonKey } = getServerSupabaseConfig();

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
