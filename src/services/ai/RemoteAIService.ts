import { ApiClient } from '../api/ApiClient';
import { AnalysisRequest, AnalysisResult } from '../../types/analysis';
import { AIService } from './types';

/**
 * Production `AIService`. NOT YET IMPLEMENTED.
 *
 * What's missing before this can be used:
 *   1. A backend endpoint (e.g. `POST /v1/analyses`) that accepts an image
 *      upload + optional text context and returns an `AnalysisResult`.
 *   2. The backend owns the AI provider call and the risk classification;
 *      this client only ever sees the final, already-safety-checked JSON.
 *   3. Auth: the request must carry the user's session token, added by
 *      `ApiClient`, so the backend can apply per-plan rate limits.
 *
 * Until that endpoint exists, `analyze()` throws rather than returning
 * fabricated data, so callers fail loudly instead of silently mocking
 * production behavior. Use `MockAIService` for local development and UI
 * work in the meantime.
 */
export class RemoteAIService implements AIService {
  constructor(private readonly api: ApiClient) {}

  async analyze(_request: AnalysisRequest): Promise<AnalysisResult> {
    void this.api;
    throw new Error(
      'RemoteAIService.analyze() is not implemented yet: the LifeFix backend has no ' +
        '/v1/analyses endpoint. See src/services/ai/RemoteAIService.ts for what is needed.',
    );
  }
}
