/**
 * Helpers for API route handlers: JSON responses, client IP, cross-site
 * protection, rate limiting, body validation and error handling.
 */

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { rateLimit } from "@/lib/rate-limit";

import { HttpError } from "@/lib/errors";

export { HttpError };

/** Returns a JSON response. */
export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

/**
 * Cookies are SameSite=Lax, and every state-changing API also checks Origin
 * so another site can't post to it with the visitor's cookies.
 */
export function assertSameOrigin(req: Request) {
  // Modern browsers say outright whether a request came from another site.
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Cross-site request blocked.");
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin fetch from older browsers / server-side callers
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    /* fallthrough */
  }
  throw new HttpError(403, "Cross-site request blocked.");
}

/** Throws 429 when this client exceeds the limit for the named action. */
export function limit(req: Request, name: string, max: number, windowMs: number) {
  const r = rateLimit(`${name}:${clientIp(req)}`, max, windowMs);
  if (!r.ok) throw new HttpError(429, `Too many requests. Try again in ${r.retryAfterSec}s.`);
}

/** Parses the request body and validates it with a Zod schema. */
export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
  return schema.parse(body);
}

/** Wraps a route handler so known errors become clean JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, details: e.details }, { status: e.status });
      if (e instanceof ZodError)
        return json(
          { error: "Please check the highlighted fields.", fields: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
          { status: 422 },
        );
      console.error(e);
      return json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
    }
  };
}
