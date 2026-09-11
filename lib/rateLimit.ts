/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for a single-process deployment (a small club site running on
 * one Node server / one long-lived serverless instance). It resets if the
 * process restarts, which is an acceptable trade-off here in exchange for
 * zero extra infrastructure (no Redis needed for one admin login form).
 */

const buckets = new Map<string, { count: number; windowStart: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

// Periodically drop stale buckets so this map doesn't grow forever.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000);

// Don't let this background timer keep the Node process alive on its own
// (only relevant outside serverless — harmless where `unref` doesn't exist).
if (typeof (cleanupInterval as unknown as { unref?: () => void }).unref === 'function') {
  (cleanupInterval as unknown as { unref: () => void }).unref();
}
