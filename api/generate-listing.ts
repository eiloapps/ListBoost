import type { IncomingMessage, ServerResponse } from "node:http";
import { createListingApiMiddleware } from "../server/api-middleware";
import { sendJson } from "../server/http";

const handler = createListingApiMiddleware();

export default async function generateListing(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    console.info("[api/generate-listing] request received", {
      method: request.method,
      hasAuthorizationHeader: Boolean(request.headers.authorization),
    });
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
