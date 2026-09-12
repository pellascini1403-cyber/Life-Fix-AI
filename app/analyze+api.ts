import { handleAnalyzeRequest, toAnalysisError } from '../backend/analyzeHandler';
import { toErrorBody } from '../backend/errors';

/**
 * `POST /analyze` — the mobile app's only path to the AI provider. This
 * file is intentionally thin: it's the HTTP boundary (extract a rate-limit
 * key, call the handler, shape the Response). All real logic — parsing,
 * validation, the provider call, the safety policy — lives in
 * `backend/`, which is NOT reachable from the mobile client bundle: Expo
 * Router bundles `+api.ts` routes (and everything they import) into a
 * separate server target, so `@anthropic-ai/sdk` and `ANTHROPIC_API_KEY`
 * never ship inside the app.
 */
export async function POST(request: Request): Promise<Response> {
  const rateLimitKey = request.headers.get('x-device-id') ?? clientAddressFallback(request);

  try {
    const result = await handleAnalyzeRequest(request, rateLimitKey);
    return Response.json(result, { status: 200 });
  } catch (error) {
    const analysisError = toAnalysisError(error);

    // Server-side log only — see `backend/errors.ts` for why the raw
    // message never goes in the response body.
    console.error(`[analyze] ${analysisError.code}: ${analysisError.message}`);

    const headers: HeadersInit = {};
    if (analysisError.retryAfterSeconds) {
      headers['Retry-After'] = String(analysisError.retryAfterSeconds);
    }

    return Response.json(toErrorBody(analysisError), { status: analysisError.status, headers });
  }
}

function clientAddressFallback(request: Request): string {
  return request.headers.get('x-forwarded-for') ?? 'unknown-client';
}
