import { ApiClient, API_BASE_URL } from '../api/ApiClient';
import { MockAIService } from './MockAIService';
import { RemoteAIService } from './RemoteAIService';
import { AIService } from './types';

export * from './types';
export { MockAIService } from './MockAIService';
export { RemoteAIService } from './RemoteAIService';

/**
 * Single place that decides which `AIService` implementation the app uses.
 *
 * Defaults to `RemoteAIService` (the real backend + AI provider) now that
 * `POST /analyze` exists — this is the whole point of Phase 2. Set
 * `EXPO_PUBLIC_USE_REMOTE_AI=false` to opt into `MockAIService` for local
 * UI work, tests, or offline development; there is no automatic silent
 * fallback to the mock in the other direction — if the real backend is
 * misconfigured or unreachable, `RemoteAIService` throws a
 * `ClientAnalysisError` and the app shows a real error state, rather than
 * quietly serving fabricated results.
 */
export function createAIService(): AIService {
  const useMock = process.env.EXPO_PUBLIC_USE_REMOTE_AI === 'false';
  if (useMock) {
    return new MockAIService();
  }
  return new RemoteAIService(new ApiClient({ baseUrl: API_BASE_URL }));
}
