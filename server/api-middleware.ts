import type { IncomingMessage, ServerResponse } from "node:http";
import { getOrCreateCreditsRow, NoCreditsError, refundReservedCredit, reserveCreditForGeneration, type CreditReservation } from "./credits.js";
import { generateListingWithAI } from "./generate-listing.js";
import { getAccessToken, logServerError, readJsonBody, sendJson } from "./http.js";

const formatProExhaustedMessage = (currentPeriodEnd: string | null) => {
  if (!currentPeriodEnd) {
    return "You've used all 50 Pro credits for this billing period. More credits will be available next cycle, or upgrade to Unlimited.";
  }

  const formattedDate = new Date(currentPeriodEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `You've used all 50 Pro credits for this billing period. Credits reset on ${formattedDate}, or upgrade to Unlimited.`;
};

const toNoCreditsPayload = (error: NoCreditsError) => {
  const plan = error.row.plan;
  return {
    error: "NO_CREDITS",
    plan,
    currentPeriodEnd: error.row.current_period_end,
    message: plan === "pro"
      ? formatProExhaustedMessage(error.row.current_period_end)
      : "You've used all your free credits. Upgrade to continue.",
  };
};

const toCreditsStatusErrorPayload = (message: string) => {
  if (message.includes("public.user_credits table does not exist")) {
    return {
      error: "CREDITS_TABLE_MISSING",
      message,
    };
  }

  if (message.includes("RLS policies")) {
    return {
      error: "CREDITS_RLS_BLOCKED",
      message,
    };
  }

  if (message.includes("server-side Supabase environment variables")) {
    return {
      error: "CREDITS_CONFIG_ERROR",
      message,
    };
  }

  return {
    error: "CREDITS_STATUS_UNAVAILABLE",
    message,
  };
};

export const createListingApiMiddleware = () => {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method === "GET") {
      try {
        const accessToken = getAccessToken(request);
        const credits = await getOrCreateCreditsRow(accessToken);
        sendJson(response, 200, credits);
      } catch (error) {
        logServerError("generate-listing:get", error);
        const message = error instanceof Error ? error.message : "Unexpected server error.";
        const statusCode = message === "Authentication required." ? 401 : 500;
        sendJson(response, statusCode, message === "Authentication required."
          ? { error: message }
          : toCreditsStatusErrorPayload(message));
      }
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      const accessToken = getAccessToken(request);
      let reservation: CreditReservation | null = null;
      const body = await readJsonBody(request);
      try {
        reservation = await reserveCreditForGeneration(accessToken);
        const listing = await generateListingWithAI(body);
        reservation = null;
        sendJson(response, 200, listing);
      } catch (error) {
        if (reservation) {
          try {
            await refundReservedCredit(reservation);
          } catch (refundError) {
            logServerError("generate-listing:refund", refundError);
          }
        }

        throw error;
      }
    } catch (error) {
      logServerError("generate-listing:post", error);

      if (error instanceof NoCreditsError) {
        sendJson(response, 403, toNoCreditsPayload(error));
        return;
      }

      const message = error instanceof Error ? error.message : "Unexpected server error.";
      const statusCode = message === "Authentication required." ? 401 : 500;
      sendJson(response, statusCode, { error: message });
    }
  };
};
