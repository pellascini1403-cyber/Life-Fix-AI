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
 * Defaults to `MockAIService` — no network call, no AI provider, no cost —
 * per an explicit product decision to develop against simulated data until
 * we're ready to pick and pay for a real AI provider. The real backend
 * (`POST /analyze`, `backend/**`, `RemoteAIService`) is fully built and
 * stays that way, it's just not the default path right now. Set
 * `EXPO_PUBLIC_USE_REMOTE_AI=true` to opt into it for local testing (it
 * will call Anthropic and incur cost — needs `ANTHROPIC_API_KEY` set
 * server-side, see .env.example). There is no automatic silent fallback
 * from remote to mock — if you do opt in and the backend is misconfigured
 * or unreachable, `RemoteAIService` throws a `ClientAnalysisError` and the
 * app shows a real error state, rather than quietly serving fabricated
 * results.
 */
export function createAIService(): AIService {
  const useRemote = process.env.EXPO_PUBLIC_USE_REMOTE_AI === 'true';
  if (useRemote) {
    return new RemoteAIService(new ApiClient({ baseUrl: API_BASE_URL }));
  }
  return new MockAIService();
}
