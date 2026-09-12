/**
 * Backend error taxonomy. Every error the `/analyze` route can return is one
 * of these, each carrying an HTTP status and a stable `code` the client maps
 * to a human-friendly, localized message (see `src/types/analysisError.ts`
 * and the `errors.*` i18n keys) — the raw `message` here is for server logs
 * only and must never reach the client as-is.
 *
 * Kept as a runtime array (not just a type) so a test can assert this list
 * stays a subset of the client's independent copy in
 * `src/types/analysisError.ts` (the client's list is a superset — it also
 * has `NETWORK_ERROR`, a client-only fetch-layer failure with no backend
 * equivalent).
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
  'UNKNOWN',
] as const;

export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];

export class AnalysisError extends Error {
  constructor(
    public readonly code: AnalysisErrorCode,
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export function invalidRequestError(message: string): AnalysisError {
  return new AnalysisError('INVALID_REQUEST', 400, message);
}

export function invalidImageError(message: string): AnalysisError {
  return new AnalysisError('INVALID_IMAGE', 400, message);
}

export function imageTooLargeError(message: string): AnalysisError {
  return new AnalysisError('IMAGE_TOO_LARGE', 413, message);
}

export function rateLimitedError(retryAfterSeconds: number): AnalysisError {
  return new AnalysisError(
    'RATE_LIMITED',
    429,
    `Rate limit exceeded, retry after ${retryAfterSeconds}s`,
    retryAfterSeconds,
  );
}

export function providerNotConfiguredError(message: string): AnalysisError {
  return new AnalysisError('PROVIDER_NOT_CONFIGURED', 503, message);
}

export function providerUnavailableError(message: string): AnalysisError {
  return new AnalysisError('PROVIDER_UNAVAILABLE', 502, message);
}

export function invalidAIResponseError(message: string): AnalysisError {
  return new AnalysisError('INVALID_AI_RESPONSE', 502, message);
}

export function timeoutError(message: string): AnalysisError {
  return new AnalysisError('TIMEOUT', 504, message);
}

export function unknownError(message: string): AnalysisError {
  return new AnalysisError('UNKNOWN', 500, message);
}

/**
 * Body shape returned for every non-2xx `/analyze` response.
 *
 * Deliberately carries only the stable `code`, never `error.message` — that
 * string is for server logs (it can include upstream provider detail) and
 * must never reach the client. The client maps `code` to a localized,
 * human-friendly message itself (see `errors.*` i18n keys).
 */
export interface AnalysisErrorBody {
  error: {
    code: AnalysisErrorCode;
  };
}

export function toErrorBody(error: AnalysisError): AnalysisErrorBody {
  return { error: { code: error.code } };
}
