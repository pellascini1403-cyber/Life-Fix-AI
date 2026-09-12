/**
 * Client-facing analysis error codes. Mirrors `ANALYSIS_ERROR_CODES` in
 * `backend/errors.ts` (kept as an independent copy, not a shared import —
 * client code must never import from `backend/`), plus one client-only
 * code: `NETWORK_ERROR`, for a `fetch()`-layer failure with no response to
 * parse (no connection, DNS failure, etc.) — there is no backend
 * equivalent. `backend/__tests__/errorCodes.test.ts` asserts every backend
 * code has a match here.
 *
 * Note on "image with no useful content" (a scenario the product spec
 * calls out): this is deliberately NOT a distinct error code. A photo that
 * doesn't show a clear problem still gets a normal, successful response —
 * `category: 'other'`, low confidence, and `followUpQuestions` asking for
 * a clearer photo — the same soft path `MockAIService`'s "other" template
 * already models. Treating it as a thrown error would be inventing a
 * failure where the AI actually did its job (reporting low confidence).
 */
export const ANALYSIS_ERROR_CODES = [
  'INVALID_REQUEST',
  'INVALID_IMAGE',
  'IMAGE_TOO_LARGE',
  'TIMEOUT',
  'PROVIDER_NOT_CONFIGURED',
  'PROVIDER_UNAVAILABLE',
  'INVALID_AI_RESPONSE',
  'RATE_LIMITED',
  'NETWORK_ERROR',
  'UNKNOWN',
] as const;

export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];

/** Thrown by `RemoteAIService` so `useAnalysisSessionStore` can show a
 * specific, human-friendly message per `code` instead of one generic one. */
export class ClientAnalysisError extends Error {
  constructor(
    public readonly code: AnalysisErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ClientAnalysisError';
  }
}
