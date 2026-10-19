// Fixed-window limiter kept in process memory. Fine for a single server; for
// several instances, back it with Redis/Upstash (see docs/DEPLOYMENT.md).

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __chajoyRate?: Map<string, Bucket> };
const buckets = (g.__chajoyRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfterSec: 0 };
  }
  b.count++;
  return { ok: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}
