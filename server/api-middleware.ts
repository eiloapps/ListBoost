import type { IncomingMessage, ServerResponse } from "node:http";
import { decrementCreditsAfterGeneration, ensureGenerationAllowed, getAuthenticatedUser, getOrCreateCreditsRow, NoCreditsError } from "./credits";
import { generateListingWithAI } from "./generate-listing";
import { getAccessToken, logServerError, readJsonBody, sendJson } from "./http";

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
        sendJson(response, statusCode, { error: message });
      }
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      const accessToken = getAccessToken(request);
      await ensureGenerationAllowed(accessToken);
      const body = await readJsonBody(request);
      const listing = await generateListingWithAI(body);
      const { user } = await getAuthenticatedUser(accessToken);
      await decrementCreditsAfterGeneration(accessToken, user);
      sendJson(response, 200, listing);
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
