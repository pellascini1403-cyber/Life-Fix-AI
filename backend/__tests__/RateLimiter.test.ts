import { InMemoryRateLimiter } from '../rateLimit/RateLimiter';

describe('InMemoryRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = new InMemoryRateLimiter([{ windowMs: 60_000, max: 3 }]);
    expect(limiter.check('device-a').allowed).toBe(true);
    expect(limiter.check('device-a').allowed).toBe(true);
    expect(limiter.check('device-a').allowed).toBe(true);
  });

  it('rejects the request that exceeds the limit, with a retryAfterSeconds', () => {
    const limiter = new InMemoryRateLimiter([{ windowMs: 60_000, max: 2 }]);
    limiter.check('device-a');
    limiter.check('device-a');
    const decision = limiter.check('device-a');
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks separate keys independently', () => {
    const limiter = new InMemoryRateLimiter([{ windowMs: 60_000, max: 1 }]);
    expect(limiter.check('device-a').allowed).toBe(true);
    expect(limiter.check('device-b').allowed).toBe(true);
    expect(limiter.check('device-a').allowed).toBe(false);
  });

  it('rejects as soon as either configured window is exceeded', () => {
    const limiter = new InMemoryRateLimiter([
      { windowMs: 1_000, max: 1 }, // tight burst window
      { windowMs: 60_000, max: 100 }, // generous longer window
    ]);
    expect(limiter.check('device-a').allowed).toBe(true);
    // Second request immediately after trips the 1-request-per-second burst
    // guard even though the longer window has plenty of room left.
    expect(limiter.check('device-a').allowed).toBe(false);
  });

  it('does not let a request that was rejected also count against the limit', () => {
    const limiter = new InMemoryRateLimiter([{ windowMs: 60_000, max: 1 }]);
    limiter.check('device-a');
    limiter.check('device-a'); // rejected
    limiter.check('device-a'); // still rejected, not "un-rejected" by the previous attempt
    const decision = limiter.check('device-a');
    expect(decision.allowed).toBe(false);
  });
});
