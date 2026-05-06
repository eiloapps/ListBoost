import { createClient } from "@supabase/supabase-js";

const getServerSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for backend subscription sync.");
  }

  return { supabaseUrl, supabaseServiceRoleKey };
};

export const createAdminSupabaseClient = () => {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerSupabaseConfig();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
