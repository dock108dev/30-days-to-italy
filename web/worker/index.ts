/** Cloudflare Worker entry point for the Un mese sulla costa web prototype. */
import handler from "vinext/server/app-router-entry";

type Env = Record<string, unknown>;

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "browsing-topics=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

async function secureResponse(response: Response, pathname: string): Promise<Response> {
  const entries: Array<readonly [string, string]> = [
    ["Content-Security-Policy", CONTENT_SECURITY_POLICY],
    ["Cross-Origin-Opener-Policy", "same-origin"],
    ["Cross-Origin-Resource-Policy", "same-origin"],
    ["Strict-Transport-Security", "max-age=31536000"],
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "no-referrer"],
    ["Permissions-Policy", PERMISSIONS_POLICY],
    ["X-Frame-Options", "DENY"],
    ["X-Robots-Tag", "noindex, nofollow, noarchive"],
  ];
  if (pathname === "/" && response.status < 400) {
    entries.push(["Cache-Control", "private, no-store"]);
  } else if (pathname === "/sw.js") {
    entries.push(["Cache-Control", "no-cache, no-store, must-revalidate"]);
  }

  try {
    for (const [name, value] of entries) response.headers.set(name, value);
    return response;
  } catch {
    // Framework responses may expose immutable headers. Rebuild the response
    // with the same body/status so required security headers are never skipped.
    const headers = new Headers(response.headers);
    for (const [name, value] of entries) headers.set(name, value);
    const body = response.body === null ? null : await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return secureResponse(new Response("Method not allowed", {
        status: 405,
        headers: {
          Allow: "GET, HEAD",
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      }), url.pathname);
    }

    // No application code uses Next/Vinext image optimization. Rejecting the
    // unused transform surface removes unnecessary parser and resource-abuse
    // exposure without affecting static same-origin images.
    if (url.pathname === "/_vinext/image") {
      return secureResponse(new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      }), url.pathname);
    }

    const response = await handler.fetch(request, env, ctx);
    return secureResponse(response, url.pathname);
  },
};

export default worker;
