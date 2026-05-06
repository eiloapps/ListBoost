import type { IncomingMessage, ServerResponse } from "node:http";
import { createCheckoutApiMiddleware } from "../server/create-checkout-middleware";
import { sendJson } from "../server/http";

const handler = createCheckoutApiMiddleware();

export default async function createCheckout(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    await handler(request, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (!response.headersSent) {
      sendJson(response, 500, { error: message });
    } else {
      response.end();
    }
  }
}
