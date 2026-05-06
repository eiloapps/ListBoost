import type { IncomingMessage, ServerResponse } from "node:http";

export const readRequestBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

export const readJsonBody = async <T>(request: IncomingMessage) => {
  const raw = (await readRequestBody(request)).toString("utf8");
  return (raw ? JSON.parse(raw) : {}) as T;
};

export const sendJson = (response: ServerResponse, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
};

export const getAccessToken = (request: IncomingMessage) => {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Authentication required.");
  }

  return header.slice("Bearer ".length).trim();
};

export const logServerError = (context: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] ${message}`);
};

export const getRequestOrigin = (request: IncomingMessage) => {
  const configuredAppUrl =
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_APP_URL;

  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/+$/, "");
  }

  const forwardedHost = request.headers["x-forwarded-host"];
  const forwardedProto = request.headers["x-forwarded-proto"];
  const hostHeader = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || request.headers.host;
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto ?? "http";
  const originHeader = request.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  if (!hostHeader) {
    throw new Error("Unable to resolve request origin.");
  }

  return `${protocol}://${hostHeader}`;
};
