import type { IncomingMessage, ServerResponse } from "node:http";
import { processLemonSqueezyWebhook, verifyWebhookSignature } from "./lemonsqueezy";
import { logServerError, readRequestBody, sendJson } from "./http";

export const createLemonSqueezyWebhookMiddleware = () => {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      verifyWebhookSignature(rawBody, request.headers["x-signature"]);
      const payload = JSON.parse(rawBody.toString("utf8"));
      const result = await processLemonSqueezyWebhook(payload);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      logServerError("lemonsqueezy-webhook:post", error);
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      const statusCode = message.includes("signature") ? 401 : 500;
      sendJson(response, statusCode, { error: message });
    }
  };
};
