/**
 * Backend-only configuration. This file (and everything under `backend/`)
 * must never be imported from `src/` or `app/(tabs)/**` — only from
 * `app/analyze+api.ts`. Expo Router bundles API routes into a separate
 * server target, so `backend/**` and its dependencies (including
 * `@anthropic-ai/sdk`) never reach the mobile client bundle, and
 * `ANTHROPIC_API_KEY` is read here via plain `process.env`, never an
 * `EXPO_PUBLIC_*` var (those get inlined into the client bundle).
 */
import { providerNotConfiguredError } from './errors';

/** ALWAYS use claude-opus-5 unless explicitly overridden — see house model
 * guidance. Overridable via env for cost/latency tuning without a code change. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5';

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL;

/** Anthropic's documented vision input limits (long-standing, not a
 * fast-moving API detail): accepted image formats and a conservative max
 * size we enforce before ever calling the provider. */
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export const MAX_USER_CONTEXT_LENGTH = 500;

/** Abuse/cost guardrails, independent of the (client-side, not yet
 * server-synced) free/pro plan limits in `src/services/entitlements`. This
 * is a technical safeguard, not a product/billing rule — see ROADMAP for
 * reconciling the two once real auth + entitlements sync exists. */
export const RATE_LIMIT_PER_MINUTE = intFromEnv('RATE_LIMIT_PER_MINUTE', 8);
export const RATE_LIMIT_PER_DAY = intFromEnv('RATE_LIMIT_PER_DAY', 60);

export const ANALYSIS_TIMEOUT_MS = intFromEnv('ANALYSIS_TIMEOUT_MS', 45_000);

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** `ANTHROPIC_API_KEY` is read implicitly by `new Anthropic()` — see
 * `aiProvider/AnthropicVisionProvider.ts`. This getter only exists so we can
 * fail fast with a clear, specific `PROVIDER_NOT_CONFIGURED` error before
 * ever constructing the SDK client, instead of letting the SDK throw its
 * own generic error (which would otherwise surface to the client as an
 * unhelpful `UNKNOWN`). */
export function requireAnthropicApiKeyConfigured(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw providerNotConfiguredError(
      'ANTHROPIC_API_KEY is not set. The Resolia backend cannot call the AI provider until ' +
        'it is configured — see .env.example and README.md "AI provider configuration".',
    );
  }
}
