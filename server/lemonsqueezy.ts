import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ensureAdminCreditsRow,
  getAdminCreditsByCustomerId,
  getAdminCreditsByEmail,
  getAdminCreditsBySubscriptionId,
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
  type CreditPlan,
  type UserCreditsRow,
  updateAdminCreditsRow,
} from "./credits";

type CheckoutPlan = Exclude<CreditPlan, "free">;

type LemonSqueezyConfig = {
  apiKey: string;
  storeId: string;
  proVariantId: string;
  unlimitedVariantId: string;
};

type LemonSqueezyWebhookConfig = {
  webhookSecret: string;
};

type CheckoutRequest = {
  plan: CheckoutPlan;
  userId: string;
  email: string;
  origin: string;
};

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
    webhook_id?: string;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
};

type LemonSubscription = {
  id: string;
  customer_id: string | null;
  status: string | null;
  variant_id: string | null;
  user_email: string | null;
  current_period_end: string | null;
};

const ACTIVE_STATUSES = new Set(["active", "on_trial"]);

const getLemonSqueezyCheckoutConfig = (): LemonSqueezyConfig => {
  const missingKeys: string[] = [];
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const proVariantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
  const unlimitedVariantId = process.env.LEMONSQUEEZY_UNLIMITED_VARIANT_ID;

  if (!apiKey) missingKeys.push("LEMONSQUEEZY_API_KEY");
  if (!storeId) missingKeys.push("LEMONSQUEEZY_STORE_ID");
  if (!proVariantId) missingKeys.push("LEMONSQUEEZY_PRO_VARIANT_ID");
  if (!unlimitedVariantId) missingKeys.push("LEMONSQUEEZY_UNLIMITED_VARIANT_ID");

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Lemon Squeezy checkout environment variables: ${missingKeys.join(", ")}.`,
    );
  }

  return {
    apiKey,
    storeId,
    proVariantId,
    unlimitedVariantId,
  };
};

const getLemonSqueezyWebhookConfig = (): LemonSqueezyWebhookConfig => {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing Lemon Squeezy webhook environment variable: LEMONSQUEEZY_WEBHOOK_SECRET.");
  }

  return { webhookSecret };
};

const lemonFetch = async <T>(path: string, init?: RequestInit) => {
  const { apiKey } = getLemonSqueezyCheckoutConfig();
  const response = await fetch(`https://api.lemonsqueezy.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const isVariantOrStoreMismatch = response.status === 404 || response.status === 422;
    const message =
      payload?.errors?.[0]?.detail ||
      payload?.error ||
      `Lemon Squeezy request failed with status ${response.status}.`;
    throw new Error(
      isVariantOrStoreMismatch
        ? `${message} Check that your store ID and variant IDs all belong to the same Lemon Squeezy test-mode store.`
        : message,
    );
  }

  return payload as T;
};

const getVariantIdForPlan = (plan: CheckoutPlan) => {
  const { proVariantId, unlimitedVariantId } = getLemonSqueezyCheckoutConfig();
  return plan === "pro" ? proVariantId : unlimitedVariantId;
};

const getPlanForVariantId = (variantId: string | null): CreditPlan | null => {
  const { proVariantId, unlimitedVariantId } = getLemonSqueezyCheckoutConfig();

  if (!variantId) {
    return null;
  }

  if (variantId === proVariantId) {
    return "pro";
  }

  if (variantId === unlimitedVariantId) {
    return "unlimited";
  }

  return null;
};

export const createCheckoutUrl = async ({ plan, userId, email, origin }: CheckoutRequest) => {
  const { storeId } = getLemonSqueezyCheckoutConfig();
  const variantId = getVariantIdForPlan(plan);

  const payload = await lemonFetch<{
    data?: {
      attributes?: {
        url?: string;
      };
    };
  }>("/v1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email,
            custom: {
              user_id: userId,
              email,
              selected_plan: plan,
            },
          },
          product_options: {
            redirect_url: `${origin}/dashboard`,
            receipt_button_text: "Go to dashboard",
            receipt_link_url: `${origin}/dashboard`,
          },
          checkout_options: {
            embed: false,
            media: true,
            logo: true,
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    }),
  });

  const url = payload?.data?.attributes?.url;

  if (!url) {
    throw new Error("Lemon Squeezy checkout URL was not returned.");
  }

  return url;
};

export const verifyWebhookSignature = (rawBody: Buffer, signatureHeader: string | string[] | undefined) => {
  const { webhookSecret } = getLemonSqueezyWebhookConfig();
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!signature) {
    throw new Error("Missing Lemon Squeezy signature header.");
  }

  const digest = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const received = Buffer.from(signature, "utf8");
  const expected = Buffer.from(digest, "utf8");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error("Invalid Lemon Squeezy webhook signature.");
  }
};

const extractWebhookEventId = (payload: LemonWebhookPayload, eventName: string) => {
  const webhookId = payload.meta?.webhook_id;
  const resourceId = payload.data?.id ?? "unknown";
  const updatedAt = String(payload.data?.attributes?.updated_at ?? payload.data?.attributes?.created_at ?? "");

  return webhookId || `${eventName}:${payload.data?.type ?? "unknown"}:${resourceId}:${updatedAt}`;
};

const extractSubscriptionId = (payload: LemonWebhookPayload) => {
  if (payload.data?.type === "subscriptions" && payload.data.id) {
    return payload.data.id;
  }

  const attributes = payload.data?.attributes ?? {};
  const subscriptionId = attributes.subscription_id;
  return typeof subscriptionId === "number" || typeof subscriptionId === "string" ? String(subscriptionId) : null;
};

const fetchSubscription = async (subscriptionId: string) => {
  const payload = await lemonFetch<{
    data?: {
      id?: string;
      attributes?: Record<string, unknown>;
    };
  }>(`/v1/subscriptions/${subscriptionId}`, {
    method: "GET",
  });

  const attributes = payload.data?.attributes ?? {};

  return {
    id: String(payload.data?.id ?? subscriptionId),
    customer_id:
      typeof attributes.customer_id === "number" || typeof attributes.customer_id === "string"
        ? String(attributes.customer_id)
        : null,
    status: typeof attributes.status === "string" ? attributes.status : null,
    variant_id:
      typeof attributes.variant_id === "number" || typeof attributes.variant_id === "string"
        ? String(attributes.variant_id)
        : null,
    user_email: typeof attributes.user_email === "string" ? attributes.user_email : null,
    current_period_end: typeof attributes.current_period_end === "string" ? attributes.current_period_end : null,
  } satisfies LemonSubscription;
};

const resolveUserRow = async (payload: LemonWebhookPayload, subscription: LemonSubscription | null) => {
  const customData = payload.meta?.custom_data ?? {};
  const customUserId = typeof customData.user_id === "string" ? customData.user_id : null;
  const customEmail = typeof customData.email === "string" ? customData.email : null;
  const attributes = payload.data?.attributes ?? {};
  const emailFromPayload =
    customEmail ||
    subscription?.user_email ||
    (typeof attributes.user_email === "string" ? attributes.user_email : null) ||
    (typeof attributes.customer_email === "string" ? attributes.customer_email : null);

  if (customUserId) {
    return ensureAdminCreditsRow(customUserId, emailFromPayload ?? "");
  }

  const subscriptionId = subscription?.id ?? extractSubscriptionId(payload);

  if (subscriptionId) {
    const bySubscription = await getAdminCreditsBySubscriptionId(subscriptionId);
    if (bySubscription) {
      return bySubscription;
    }
  }

  if (subscription?.customer_id) {
    const byCustomer = await getAdminCreditsByCustomerId(subscription.customer_id);
    if (byCustomer) {
      return byCustomer;
    }
  }

  if (emailFromPayload) {
    const byEmail = await getAdminCreditsByEmail(emailFromPayload);
    if (byEmail) {
      return byEmail;
    }
  }

  throw new Error("Unable to match Lemon Squeezy webhook to a ListBoost user.");
};

const shouldResetProCredits = (row: UserCreditsRow, nextPeriodEnd: string | null, eventName: string) => {
  if (eventName === "subscription_created" || eventName === "subscription_payment_success") {
    return true;
  }

  if (row.plan !== "pro") {
    return true;
  }

  return Boolean(nextPeriodEnd && row.current_period_end !== nextPeriodEnd);
};

const fallbackToFreePlan = async (row: UserCreditsRow, status: string | null, customerId: string | null, subscriptionId: string | null, variantId: string | null) => {
  return updateAdminCreditsRow(row.user_id, {
    email: row.email,
    plan: "free",
    credits_remaining: row.free_credits_remaining,
    lemonsqueezy_customer_id: customerId ?? row.lemonsqueezy_customer_id,
    lemonsqueezy_subscription_id: subscriptionId ?? row.lemonsqueezy_subscription_id,
    lemonsqueezy_variant_id: variantId ?? row.lemonsqueezy_variant_id,
    subscription_status: status,
    current_period_end: null,
  });
};

export const processLemonSqueezyWebhook = async (payload: LemonWebhookPayload) => {
  const eventName = payload.meta?.event_name;

  if (!eventName) {
    throw new Error("Missing Lemon Squeezy event name.");
  }

  const eventId = extractWebhookEventId(payload, eventName);
  const hasProcessedEvent = await hasProcessedWebhookEvent(eventId);

  if (hasProcessedEvent) {
    return { ignored: true };
  }

  const subscriptionId = extractSubscriptionId(payload);
  const subscription = subscriptionId ? await fetchSubscription(subscriptionId) : null;
  const row = await resolveUserRow(payload, subscription);
  const attributes = payload.data?.attributes ?? {};
  const status =
    subscription?.status ||
    (typeof attributes.status === "string" ? attributes.status : null) ||
    (eventName === "subscription_cancelled" ? "cancelled" : null) ||
    (eventName === "subscription_expired" ? "expired" : null);
  const customerId =
    subscription?.customer_id ||
    (typeof attributes.customer_id === "number" || typeof attributes.customer_id === "string"
      ? String(attributes.customer_id)
      : null);
  const variantId =
    subscription?.variant_id ||
    (typeof attributes.variant_id === "number" || typeof attributes.variant_id === "string"
      ? String(attributes.variant_id)
      : null);
  const planFromVariant = getPlanForVariantId(variantId);
  const currentPeriodEnd =
    subscription?.current_period_end ||
    (typeof attributes.current_period_end === "string" ? attributes.current_period_end : null);
  const nextEmail = subscription?.user_email || (typeof attributes.user_email === "string" ? attributes.user_email : row.email) || row.email;

  if (!status || !ACTIVE_STATUSES.has(status) || !planFromVariant) {
    await fallbackToFreePlan(row, status, customerId, subscription?.id ?? subscriptionId, variantId);
    await markWebhookEventProcessed(eventId, eventName, payload);
    return { ignored: false, plan: "free" };
  }

  if (planFromVariant === "unlimited") {
    await updateAdminCreditsRow(row.user_id, {
      email: nextEmail,
      plan: "unlimited",
      credits_remaining: null,
      lemonsqueezy_customer_id: customerId,
      lemonsqueezy_subscription_id: subscription?.id ?? subscriptionId,
      lemonsqueezy_variant_id: variantId,
      subscription_status: status,
      current_period_end: currentPeriodEnd,
    });
    await markWebhookEventProcessed(eventId, eventName, payload);
    return { ignored: false, plan: "unlimited" };
  }

  const nextCredits = shouldResetProCredits(row, currentPeriodEnd, eventName)
    ? 50
    : row.plan === "pro"
      ? row.credits_remaining ?? 50
      : 50;

  await updateAdminCreditsRow(row.user_id, {
    email: nextEmail,
    plan: "pro",
    credits_remaining: nextCredits,
    lemonsqueezy_customer_id: customerId,
    lemonsqueezy_subscription_id: subscription?.id ?? subscriptionId,
    lemonsqueezy_variant_id: variantId,
    subscription_status: status,
    current_period_end: currentPeriodEnd,
  });
  await markWebhookEventProcessed(eventId, eventName, payload);

  return { ignored: false, plan: "pro" };
};
