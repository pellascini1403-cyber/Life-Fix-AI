import { TFunction } from 'i18next';

import { AnalysisErrorCode } from '../types/analysisError';

/** Maps a backend/client analysis error code to the i18n key for its
 * human-friendly message. Every code must have an entry — this function's
 * return type keeps that exhaustive at compile time. */
const ERROR_MESSAGE_KEYS: Record<AnalysisErrorCode, string> = {
  INVALID_REQUEST: 'errors.analysis.invalidRequest',
  INVALID_IMAGE: 'errors.analysis.invalidImage',
  IMAGE_TOO_LARGE: 'errors.analysis.imageTooLarge',
  TIMEOUT: 'errors.analysis.timeout',
  PROVIDER_NOT_CONFIGURED: 'errors.analysis.providerUnavailable',
  PROVIDER_UNAVAILABLE: 'errors.analysis.providerUnavailable',
  INVALID_AI_RESPONSE: 'errors.analysis.invalidResponse',
  RATE_LIMITED: 'errors.analysis.rateLimited',
  NETWORK_ERROR: 'errors.analysis.network',
  UNKNOWN: 'errors.analysis.unknown',
};

export function getAnalysisErrorMessage(t: TFunction, code: AnalysisErrorCode): string {
  return t(ERROR_MESSAGE_KEYS[code]);
}
