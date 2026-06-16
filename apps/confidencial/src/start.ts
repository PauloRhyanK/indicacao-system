import { createStart, createMiddleware } from "@tanstack/react-start";

import { ROBOTS_NOINDEX_VALUE } from "./lib/app-meta.js";
import { renderErrorPage } from "./lib/error-page.js";

function withRobotsHeader(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", ROBOTS_NOINDEX_VALUE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const robotsMiddleware = createMiddleware().server(async ({ next }) => {
  const response = await next();
  return response instanceof Response ? withRobotsHeader(response) : response;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return withRobotsHeader(
      new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [robotsMiddleware, errorMiddleware],
}));
