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

export type CreditReservation = {
  row: UserCreditsRow;
  user: User;
  shouldRefund: boolean;
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

const normalizeCreditsErrorMessage = (errorMessage: string) => {
  const lowerMessage = errorMessage.toLowerCase();

  if (
    lowerMessage.includes("relation") &&
    lowerMessage.includes("user_credits") &&
    lowerMessage.includes("does not exist")
  ) {
    return "The public.user_credits table does not exist. Run the billing migration in Supabase before loading credit status.";
  }

  if (lowerMessage.includes("row-level security") || lowerMessage.includes("permission denied")) {
    return "The authenticated user cannot access public.user_credits. Check the RLS policies for that table.";
  }

  if (lowerMessage.includes("missing supabase_url") || lowerMessage.includes("missing supabase")) {
    return "Credit status is unavailable because the server-side Supabase environment variables are missing or incomplete.";
  }

  return errorMessage;
};

const getOrCreateCreditsRowByUser = async (userId: string, email: string) => {
  const supabase = createAdminSupabaseClient();

  const { data: existingRow, error: selectError } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .eq("user_id", userId)
    .maybeSingle<UserCreditsRow>();

  if (selectError) {
    throw new Error(normalizeCreditsErrorMessage(`Unable to read user credits: ${selectError.message}`));
  }

  if (existingRow) {
    if (!email || existingRow.email === email) {
      return existingRow;
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from(USER_CREDITS_TABLE)
      .update({ email })
      .eq("user_id", userId)
      .select(baseSelect)
      .single<UserCreditsRow>();

    if (updateError) {
      throw new Error(normalizeCreditsErrorMessage(`Unable to update account email: ${updateError.message}`));
    }

    return updatedRow;
  }

  const { error: insertError } = await supabase
    .from(USER_CREDITS_TABLE)
    .upsert(createDefaultCreditsRow(userId, email), {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });

  if (insertError) {
    throw new Error(normalizeCreditsErrorMessage(`Unable to initialize user credits: ${insertError.message}`));
  }

  const { data: createdRow, error: createdError } = await supabase
    .from(USER_CREDITS_TABLE)
    .select(baseSelect)
    .eq("user_id", userId)
    .single<UserCreditsRow>();

  if (createdError) {
    throw new Error(
      normalizeCreditsErrorMessage(`Unable to read user credits after initialization: ${createdError.message}`),
    );
  }

  return createdRow;
};

export const getAuthenticatedUser = async (accessToken: string) => {
  const supabase = createServerSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Authentication required.");
  }

  return { supabase, user: data.user };
};

export const getOrCreateCreditsRow = async (accessToken: string) => {
  const { user } = await getAuthenticatedUser(accessToken);
  return getOrCreateCreditsRowByUser(user.id, user.email ?? "");
};

export const reserveCreditForGeneration = async (accessToken: string): Promise<CreditReservation> => {
  const { user } = await getAuthenticatedUser(accessToken);
  const creditsRow = await getOrCreateCreditsRow(accessToken);

  if (creditsRow.plan === "unlimited") {
    return { row: creditsRow, user, shouldRefund: false };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .rpc("consume_generation_credit", { p_user_id: user.id })
    .single<UserCreditsRow>();

  if (!data && !error) {
    throw new NoCreditsError(creditsRow);
  }

  if (error) {
    const freshRow = await getOrCreateCreditsRow(accessToken);
    if ((freshRow.credits_remaining ?? 0) <= 0) {
      throw new NoCreditsError(freshRow);
    }

    throw new Error(`Unable to reserve user credit: ${error.message}`);
  }

  return { row: data, user, shouldRefund: true };
};

export const refundReservedCredit = async (reservation: CreditReservation) => {
  if (!reservation.shouldRefund) {
    return reservation.row;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .rpc("refund_generation_credit", {
      p_user_id: reservation.user.id,
      p_plan: reservation.row.plan,
    })
    .single<UserCreditsRow>();

  if (error) {
    throw new Error(`Unable to refund reserved credit: ${error.message}`);
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

export const claimWebhookEvent = async (eventId: string, eventName: string, payload: unknown) => {
  const supabase = createAdminSupabaseClient();
  const { error: insertError } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .insert({
      event_id: eventId,
      event_name: eventName,
      payload,
      status: "processing",
      error_message: null,
    });

  if (!insertError) {
    return true;
  }

  const errorCode = "code" in insertError ? insertError.code : "";
  const isDuplicate = errorCode === "23505" || insertError.message.toLowerCase().includes("duplicate");

  if (!isDuplicate) {
    throw new Error(`Unable to claim webhook event: ${insertError.message}`);
  }

  const { data: existingEvent, error: existingError } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .select("status")
    .eq("event_id", eventId)
    .maybeSingle<{ status: string | null }>();

  if (existingError) {
    throw new Error(`Unable to read webhook event state: ${existingError.message}`);
  }

  if (existingEvent?.status !== "failed") {
    return false;
  }

  const { error: updateError } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .update({
      event_name: eventName,
      payload,
      status: "processing",
      error_message: null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("status", "failed");

  if (updateError) {
    throw new Error(`Unable to retry webhook event: ${updateError.message}`);
  }

  return true;
};

export const markWebhookEventProcessed = async (eventId: string) => {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .update({
      status: "processed",
      error_message: null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(`Unable to mark webhook event processed: ${error.message}`);
  }

  return true;
};

export const markWebhookEventFailed = async (eventId: string, errorMessage: string) => {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(WEBHOOK_EVENTS_TABLE)
    .update({
      status: "failed",
      error_message: errorMessage.slice(0, 1000),
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(`Unable to mark webhook event failed: ${error.message}`);
  }

  return true;
};

export const USER_CREDITS_ERRORS = {
  NO_CREDITS: "NO_CREDITS",
} as const;
