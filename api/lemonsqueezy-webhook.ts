import type { IncomingMessage, ServerResponse } from "node:http";
import { createLemonSqueezyWebhookMiddleware } from "../server/lemonsqueezy-webhook-middleware";
import { sendJson } from "../server/http";

const handler = createLemonSqueezyWebhookMiddleware();

export default async function lemonsqueezyWebhook(
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
