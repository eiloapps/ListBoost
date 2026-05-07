import type { IncomingMessage, ServerResponse } from "node:http";
import { createCheckoutUrl } from "./lemonsqueezy.js";
import { getAuthenticatedUser } from "./credits.js";
import { getAccessToken, getRequestOrigin, readJsonBody, sendJson, logServerError } from "./http.js";

type CheckoutRequestBody = {
  plan?: string;
  userId?: string;
  email?: string;
};

export const createCheckoutApiMiddleware = () => {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      console.info("[create-checkout] authorization header present:", Boolean(request.headers.authorization));
      const accessToken = getAccessToken(request);
      const { user } = await getAuthenticatedUser(accessToken);
      console.info("[create-checkout] authenticated supabase user:", user.id);
      const body = await readJsonBody<CheckoutRequestBody>(request);
      const requestedPlan = body.plan;

      if (requestedPlan !== "pro" && requestedPlan !== "unlimited") {
        sendJson(response, 400, { error: "Invalid plan selected." });
        return;
      }

      if (body.userId && body.userId !== user.id) {
        console.warn("[create-checkout] authenticated user mismatch:", { bodyUserId: body.userId, authUserId: user.id });
        sendJson(response, 403, { error: "Authenticated user mismatch." });
        return;
      }

      const checkoutUrl = await createCheckoutUrl({
        plan: requestedPlan,
        userId: user.id,
        email: user.email ?? body.email ?? "",
        origin: getRequestOrigin(request),
      });

      sendJson(response, 200, { url: checkoutUrl });
    } catch (error) {
      logServerError("create-checkout:post", error);
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      const statusCode = message === "Authentication required."
        ? 401
        : message.startsWith("Missing Lemon Squeezy checkout environment variables:")
          ? 500
          : 500;
      sendJson(response, statusCode, { error: message });
    }
  };
};
