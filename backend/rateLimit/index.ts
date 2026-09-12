import { RATE_LIMIT_PER_DAY, RATE_LIMIT_PER_MINUTE } from '../config';
import { InMemoryRateLimiter, RateLimiter } from './RateLimiter';

export * from './RateLimiter';

export const analyzeRateLimiter: RateLimiter = new InMemoryRateLimiter([
  { windowMs: 60_000, max: RATE_LIMIT_PER_MINUTE },
  { windowMs: 24 * 60 * 60 * 1000, max: RATE_LIMIT_PER_DAY },
]);
