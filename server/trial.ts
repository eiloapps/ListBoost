import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./supabase-server";

const FREE_TRIAL_TABLE = "user_free_trials";

type TrialRow = {
  user_id: string;
  email: string;
  has_used_free_trial: boolean;
};

const isMissingTrialTableError = (message: string) =>
  message.includes(`relation "${FREE_TRIAL_TABLE}" does not exist`) ||
  message.includes(`relation "public.${FREE_TRIAL_TABLE}" does not exist`);

export const getAuthenticatedUser = async (accessToken: string) => {
  const supabase = createServerSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Authentication required.");
  }

  return { supabase, user: data.user };
};

const ensureTrialTableAccessible = async (accessToken: string) => {
  const { supabase } = await getAuthenticatedUser(accessToken);
  const { error } = await supabase
    .from(FREE_TRIAL_TABLE)
    .select("user_id", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    if (isMissingTrialTableError(error.message)) {
      throw new Error(`Missing required table: public.${FREE_TRIAL_TABLE}`);
    }

    throw new Error(`Unable to verify free trial table: ${error.message}`);
  }
};

export const getOrCreateTrialRow = async (accessToken: string) => {
  await ensureTrialTableAccessible(accessToken);
  const { supabase, user } = await getAuthenticatedUser(accessToken);
  const email = user.email ?? "";

  const { data: existingRow, error: selectError } = await supabase
    .from(FREE_TRIAL_TABLE)
    .select("user_id,email,has_used_free_trial")
    .eq("user_id", user.id)
    .maybeSingle<TrialRow>();

  if (selectError) {
    throw new Error(`Unable to read free trial status: ${selectError.message}`);
  }

  if (existingRow) {
    return existingRow;
  }

  const { error: upsertError } = await supabase
    .from(FREE_TRIAL_TABLE)
    .upsert(
      {
        user_id: user.id,
        email,
        has_used_free_trial: false,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: true,
      },
    );

  if (upsertError) {
    throw new Error(`Unable to initialize free trial: ${upsertError.message}`);
  }

  const { data: createdOrExistingRow, error: finalSelectError } = await supabase
    .from(FREE_TRIAL_TABLE)
    .select("user_id,email,has_used_free_trial")
    .eq("user_id", user.id)
    .single<TrialRow>();

  if (finalSelectError) {
    throw new Error(`Unable to read free trial after initialization: ${finalSelectError.message}`);
  }

  return createdOrExistingRow;
};

export const ensureFreeTrialAvailable = async (accessToken: string) => {
  const trialRow = await getOrCreateTrialRow(accessToken);

  if (trialRow.has_used_free_trial) {
    throw new Error("You've used your free listing. Upgrade to continue.");
  }

  return trialRow;
};

export const markFreeTrialUsed = async (accessToken: string, user: User) => {
  const supabase = createServerSupabaseClient(accessToken);
  const { data: existingRow, error: selectError } = await supabase
    .from(FREE_TRIAL_TABLE)
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Unable to read free trial before update: ${selectError.message}`);
  }

  if (!existingRow) {
    const { error: insertError } = await supabase
      .from(FREE_TRIAL_TABLE)
      .upsert(
        {
          user_id: user.id,
          email: user.email ?? "",
          has_used_free_trial: true,
        },
        {
          onConflict: "user_id",
        },
      );

    if (insertError) {
      throw new Error(`Unable to create free trial usage row: ${insertError.message}`);
    }

    return;
  }

  const { error } = await supabase
    .from(FREE_TRIAL_TABLE)
    .update({
      email: user.email ?? "",
      has_used_free_trial: true,
    })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Unable to update free trial status: ${error.message}`);
  }
};
