import type { User } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "./supabase-admin";
import { createServerSupabaseClient } from "./supabase-server";

const USER_CREDITS_TABLE = "user_credits";
const WEBHOOK_EVENTS_TABLE = "webhook_events";

export type CreditPlan = "free" | "pro" | "unlimited";

export type UserCreditsRow = {
  user_id: string;
  email: string;
  plan: CreditPlan;
  credits_remaining: number | null;
  free_credits_remaining: number;
  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_subscription_id: string | null;
  lemonsqueezy_variant_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export class NoCreditsError extends Error {
  readonly code = "NO_CREDITS";
  readonly row: UserCreditsRow;

  constructor(row: UserCreditsRow) {
    super("NO_CREDITS");
    this.row = row;
  }
}

const baseSelect =
  "user_id,email,plan,credits_remaining,free_credits_remaining,lemonsqueezy_customer_id,lemonsqueezy_subscription_id,lemonsqueezy_variant_id,subscription_status,current_period_end,created_at,updated_at";

const createDefaultCreditsRow = (userId: string, email: string) => ({
  user_id: userId,
  email,
  plan: "free" as const,
  credits_remaining: 3,
  free_credits_remaining: 3,
});

export const getAuthenticatedUser = async (accessToken: string) => {
  const supabase = createServerSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Authentication required.");
  }

  return { supabase, user: data.user };
};

const updateEmailIfNeeded = async (accessToken: string, row: UserCreditsRow, email: string) => {
  if (!email || row.email === email) {
    return row;
  }

  const supabase = createServerSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from(USER_CREDITS_TABLE)
    .update({ email })
    .eq("user_id", row.user_id)
    .select(baseSelect)
    .single<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to update account email: ${error.message}`);
  }

  return data;
};

export const getOrCreateCreditsRow = async (accessToken: string) => {
  const { supabase, user } = await getAuthenticatedUser(accessToken);
  const email = user.email ?? "";

  const { data: existingRow, error: selectError } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .eq("user_id", user.id)
    .maybeSingle<UserCreditsRow>();

  if (selectError) {
    throw new Error(`Unable to read user credits: ${selectError.message}`);
  }

  if (existingRow) {
    return updateEmailIfNeeded(accessToken, existingRow, email);
  }

  const { error: insertError } = await supabase
    .from(USER_CREDITS_TABLE)
    .upsert(createDefaultCreditsRow(user.id, email), {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });

  if (insertError) {
    throw new Error(`Unable to initialize user credits: ${insertError.message}`);
  }

  const { data: createdRow, error: createdError } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .eq("user_id", user.id)
    .single<UserCreditsRow>();

  if (createdError) {
    throw new Error(`Unable to read user credits after initialization: ${createdError.message}`);
  }

  return createdRow;
};

export const ensureGenerationAllowed = async (accessToken: string) => {
  const creditsRow = await getOrCreateCreditsRow(accessToken);

  if (creditsRow.plan === "unlimited") {
    return creditsRow;
  }

  if ((creditsRow.credits_remaining ?? 0) <= 0) {
    throw new NoCreditsError(creditsRow);
  }

  return creditsRow;
};

export const decrementCreditsAfterGeneration = async (accessToken: string, user: User) => {
  const supabase = createServerSupabaseClient(accessToken);
  const creditsRow = await getOrCreateCreditsRow(accessToken);

  if (creditsRow.plan === "unlimited") {
    return creditsRow;
  }

  const nextCredits = Math.max((creditsRow.credits_remaining ?? 0) - 1, 0);
  const updates: Partial<UserCreditsRow> = {
    credits_remaining: nextCredits,
  };

  if (creditsRow.plan === "free") {
    updates.free_credits_remaining = nextCredits;
  }

  const { data, error } = await supabase
    .from(USER_CREDITS_TABLE)
    .update(updates)
    .eq("user_id", user.id)
    .select(baseSelect)
    .single<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to update user credits: ${error.message}`);
  }

  return data;
};

export const getAdminCreditsByUserId = async (userId: string) => {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .eq("user_id", userId)
    .maybeSingle<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to read user credits by user id: ${error.message}`);
  }

  return data;
};

export const getAdminCreditsByEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .ilike("email", normalizedEmail)
    .maybeSingle<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to read user credits by email: ${error.message}`);
  }

  return data;
};

export const getAdminCreditsBySubscriptionId = async (subscriptionId: string) => {
  if (!subscriptionId) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .eq("lemonsqueezy_subscription_id", subscriptionId)
    .maybeSingle<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to read user credits by subscription id: ${error.message}`);
  }

  return data;
};

export const getAdminCreditsByCustomerId = async (customerId: string) => {
  if (!customerId) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .eq("lemonsqueezy_customer_id", customerId)
    .maybeSingle<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to read user credits by customer id: ${error.message}`);
  }

  return data;
};

export const ensureAdminCreditsRow = async (userId: string, email: string) => {
  const existingRow = await getAdminCreditsByUserId(userId);

  if (existingRow) {
    if (email && existingRow.email !== email) {
      return updateAdminCreditsRow(userId, { email });
    }

    return existingRow;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(USER_CREDITS_TABLE)
    .upsert(createDefaultCreditsRow(userId, email), {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(`Unable to create credits row for webhook sync: ${error.message}`);
  }

  const createdRow = await getAdminCreditsByUserId(userId);

  if (!createdRow) {
    throw new Error("Unable to load credits row after webhook initialization.");
  }

  return createdRow;
};

export const updateAdminCreditsRow = async (userId: string, updates: Partial<UserCreditsRow>) => {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from(USER_CREDITS_TABLE)
    .update(updates)
    .eq("user_id", userId)
    .select(baseSelect)
    .single<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to update user credits: ${error.message}`);
  }

  return data;
};

export const hasProcessedWebhookEvent = async (eventId: string) => {
  const supabase = createAdminSupabaseClient();
  const { data: existingEvent, error: existingError } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle<{ event_id: string }>();

  if (existingError) {
    throw new Error(`Unable to read webhook event state: ${existingError.message}`);
  }

  return Boolean(existingEvent);
};

export const markWebhookEventProcessed = async (eventId: string, eventName: string, payload: unknown) => {
  const supabase = createAdminSupabaseClient();
  const { error: insertError } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .insert({
      event_id: eventId,
      event_name: eventName,
      payload,
    });

  if (insertError) {
    if (insertError.message.toLowerCase().includes("duplicate")) {
      return false;
    }

    throw new Error(`Unable to store webhook event: ${insertError.message}`);
  }

  return true;
};

export const USER_CREDITS_ERRORS = {
  NO_CREDITS: "NO_CREDITS",
} as const;
