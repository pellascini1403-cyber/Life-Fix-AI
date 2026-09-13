import i18n from '../../i18n';
import { AnalysisRequest, AnalysisResult } from '../../types/analysis';
import { AnalysisErrorCode, ClientAnalysisError } from '../../types/analysisError';
import { ApiClient, ApiError } from '../api/ApiClient';
import { getOrCreateDeviceId } from '../device/deviceId';
import { AIService } from './types';

/** Body shape the backend returns on success — everything except the two
 * fields the client already owns and fills in itself (see analyzeHandler.ts). */
type AnalyzeSuccessBody = Omit<AnalysisResult, 'imageUri' | 'userContext'>;

/** Client-side timeout for the whole analyze round trip. Comfortably above
 * the backend's own `ANALYSIS_TIMEOUT_MS` for the provider call itself, so
 * a slow-but-successful provider response isn't cut off by the client
 * first. */
const ANALYZE_TIMEOUT_MS = 60_000;

interface AnalyzeErrorBody {
  error: { code: AnalysisErrorCode };
}

/**
 * Production `AIService`: uploads the photo + context to Resolia's own
 * `/analyze` backend route (see `app/analyze+api.ts`) and never talks to
 * an AI provider directly. The backend owns the provider call, the
 * structured-output validation, and the safety policy — this client only
 * ever sees the final, already-safety-checked JSON.
 */
export class RemoteAIService implements AIService {
  constructor(private readonly api: ApiClient) {}

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append('image', await imageUriToBlob(request.imageUri));
    if (request.userContext) formData.append('userContext', request.userContext);
    if (request.category) formData.append('category', request.category);
    formData.append('locale', i18n.language === 'en' ? 'en' : 'es');

    const deviceId = await getOrCreateDeviceId();

    try {
      const body = await this.api.request<AnalyzeSuccessBody>(
        '/analyze',
        {
          method: 'POST',
          body: formData,
          headers: { 'X-Device-Id': deviceId },
        },
        ANALYZE_TIMEOUT_MS,
      );

      return {
        ...body,
        imageUri: request.imageUri,
        userContext: request.userContext ?? null,
      };
    } catch (error) {
      throw toClientAnalysisError(error);
    }
  }
}

async function imageUriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

function toClientAnalysisError(error: unknown): ClientAnalysisError {
  if (error instanceof ApiError) {
    const parsed = parseErrorBody(error.message);
    if (parsed) {
      return new ClientAnalysisError(parsed.error.code, `Backend error ${error.status}: ${parsed.error.code}`);
    }
    return new ClientAnalysisError('UNKNOWN', `Backend error ${error.status}`);
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new ClientAnalysisError('TIMEOUT', 'Request aborted after client-side timeout');
  }
  if (error instanceof TypeError) {
    // fetch() throws a plain TypeError for network-level failures (no
    // connection, DNS failure, CORS, etc.) — there is no response to parse.
    return new ClientAnalysisError('NETWORK_ERROR', error.message);
  }
  if (error instanceof Error) {
    return new ClientAnalysisError('UNKNOWN', error.message);
  }
  return new ClientAnalysisError('UNKNOWN', 'Unknown error');
}

function parseErrorBody(raw: string): AnalyzeErrorBody | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      parsed.error &&
      typeof parsed.error === 'object' &&
      'code' in parsed.error
    ) {
      return parsed as AnalyzeErrorBody;
    }
    return null;
  } catch {
    return null;
  }
}
