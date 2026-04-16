import type { IncomingMessage, ServerResponse } from "node:http";
import { generateListingWithAI } from "./generate-listing";
import { getAuthenticatedUser, getOrCreateTrialRow, markFreeTrialUsed, ensureFreeTrialAvailable } from "./trial";

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const sendJson = (response: ServerResponse, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
};

const getAccessToken = (request: IncomingMessage) => {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Authentication required.");
  }

  return header.slice("Bearer ".length).trim();
};

const logServerError = (context: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] ${message}`);
};

export const createListingApiMiddleware = () => {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method === "GET") {
      try {
        const accessToken = getAccessToken(request);
        const trial = await getOrCreateTrialRow(accessToken);
        sendJson(response, 200, trial);
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
      await ensureFreeTrialAvailable(accessToken);
      const body = await readJsonBody(request);
      const listing = await generateListingWithAI(body);
      const { user } = await getAuthenticatedUser(accessToken);
      await markFreeTrialUsed(accessToken, user);
      sendJson(response, 200, listing);
    } catch (error) {
      logServerError("generate-listing:post", error);
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      const statusCode = message === "Authentication required."
        ? 401
        : message === "You've used your free listing. Upgrade to continue."
          ? 403
          : 500;
      sendJson(response, statusCode, { error: message });
    }
  };
};
