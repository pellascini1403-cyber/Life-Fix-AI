import { ApiClient, API_BASE_URL } from '../api/ApiClient';
import { MockAIService } from './MockAIService';
import { RemoteAIService } from './RemoteAIService';
import { AIService } from './types';

export * from './types';
export { MockAIService } from './MockAIService';
export { RemoteAIService } from './RemoteAIService';

/**
 * Single place that decides which `AIService` implementation the app uses.
 * Today this always returns the mock, because the backend endpoint
 * `RemoteAIService` needs doesn't exist yet. Once it does, flip the
 * condition below (e.g. based on `EXPO_PUBLIC_USE_REMOTE_AI`) — nothing
 * else in the app needs to change, since callers only depend on the
 * `AIService` interface.
 */
export function createAIService(): AIService {
  const useRemote = process.env.EXPO_PUBLIC_USE_REMOTE_AI === 'true';
  if (useRemote) {
    return new RemoteAIService(new ApiClient({ baseUrl: API_BASE_URL }));
  }
  return new MockAIService();
}
