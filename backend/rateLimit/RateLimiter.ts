export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  check(key: string): RateLimitDecision;
}

interface Window {
  windowMs: number;
  max: number;
}

/**
 * Sliding-window-ish (fixed-window, per key) limiter with two windows — a
 * short burst guard and a daily cap — checked together so a key is
 * rejected the moment either is exceeded. The windowing algorithm itself
 * is fully covered by `backend/__tests__/RateLimiter.test.ts`.
 *
 * IMPORTANT — verified limitation, not just a future scaling concern:
 * this is an in-memory `Map`, and Expo Router API routes execute each
 * request as its own isolated invocation (confirmed by hand against the
 * local dev server: a module-level counter reset on every single
 * request, not just across restarts). That means this implementation
 * currently allows every request — it never actually blocks anything, in
 * dev OR in a serverless-style production deployment (e.g. EAS Hosting),
 * because there is no request-to-request memory to check against. It
 * would only work as a real limiter behind a traditional long-lived
 * single Node process that keeps one module instance alive across
 * requests (e.g. `expo export` + a persistent Node server, not a
 * serverless/edge function) — and even then, still not across multiple
 * instances.
 *
 * For this to actually enforce anything, `analyzeRateLimiter` in
 * `backend/rateLimit/index.ts` needs a `RateLimiter` backed by a shared,
 * durable store (Redis/Upstash, a database row, etc.) — swapping the
 * implementation behind this same interface is a one-file change;
 * nothing in `analyzeHandler.ts` needs to know. See README "What's
 * implemented / what's not" and ROADMAP for this as an open item.
 *
 * Deliberately independent of the client-side `EntitlementsService` free
 * plan limit — this exists purely to bound provider cost/abuse, not to
 * enforce product/billing rules (see ROADMAP).
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly windows: Window[]) {}

  check(key: string): RateLimitDecision {
    const now = Date.now();
    const timestamps = (this.hits.get(key) ?? []).filter(
      (t) => now - t < Math.max(...this.windows.map((w) => w.windowMs)),
    );

    for (const window of this.windows) {
      const countInWindow = timestamps.filter((t) => now - t < window.windowMs).length;
      if (countInWindow >= window.max) {
        const oldestInWindow = Math.min(...timestamps.filter((t) => now - t < window.windowMs));
        const retryAfterSeconds = Math.max(1, Math.ceil((window.windowMs - (now - oldestInWindow)) / 1000));
        return { allowed: false, retryAfterSeconds };
      }
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { allowed: true };
  }
}
