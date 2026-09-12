import { createVisionAnalysisProvider, VisionAnalysisProvider } from './aiProvider';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, MAX_USER_CONTEXT_LENGTH } from './config';
import {
  AnalysisError,
  imageTooLargeError,
  invalidImageError,
  invalidRequestError,
  rateLimitedError,
  unknownError,
} from './errors';
import { applySafetyPolicy } from './safety/applySafetyPolicy';
import { mapProviderOutputToAnalysisResult } from './mapping/mapProviderOutputToAnalysisResult';
import { analyzeRateLimiter } from './rateLimit';
import { RateLimiter } from './rateLimit/RateLimiter';
import { AnalyzeRequestFields, AnalyzeRequestFieldsSchema } from './schema';
import { AnalysisResult } from '../src/types/analysis';

export type AnalyzeSuccessBody = Omit<AnalysisResult, 'imageUri' | 'userContext'>;

/**
 * The global `FormData` name resolves ambiguously in this project: React
 * Native declares its own minimal `FormData` (matching its client-side
 * polyfill) in the same global scope TypeScript uses for this Node-only
 * server file. Rather than depend on whichever declaration wins, this
 * describes only the handful of members this file actually calls — the
 * real value at runtime is still the platform's full multipart FormData
 * (from `Request.formData()`), just narrowly typed here on purpose.
 */
interface MultipartForm {
  get(name: string): string | Blob | null;
}

/**
 * Everything the `/analyze` route needs to do that isn't HTTP plumbing:
 * rate limit, parse + validate the multipart request, run the AI
 * provider, apply the safety policy, and shape the response. Kept
 * separate from `app/analyze+api.ts` so it's plainly testable without
 * spinning up a Request/Response pair, and so the route file stays a thin
 * HTTP adapter.
 *
 * Returns the parts of `AnalysisResult` the server owns; the client fills
 * in `imageUri` and `userContext` itself (it already has both — no reason
 * to round-trip the image back over the network, and less reason to keep
 * a copy of it server-side longer than this request).
 *
 * `provider` and `rateLimiter` default to the real singletons but are
 * injectable so tests can exercise this handler's own logic (validation,
 * mapping, safety policy) against a fake provider, without needing a
 * network call or an API key configured.
 */
export async function handleAnalyzeRequest(
  request: Request,
  rateLimitKey: string,
  dependencies: { provider?: VisionAnalysisProvider; rateLimiter?: RateLimiter } = {},
): Promise<AnalyzeSuccessBody> {
  const provider = dependencies.provider ?? createVisionAnalysisProvider();
  const rateLimiter = dependencies.rateLimiter ?? analyzeRateLimiter;

  const rateLimitDecision = rateLimiter.check(rateLimitKey);
  if (!rateLimitDecision.allowed) {
    throw rateLimitedError(rateLimitDecision.retryAfterSeconds ?? 60);
  }

  const form = await parseMultipart(request);
  const image = extractImage(form);
  const fields = parseFields(form);

  if (fields.userContext && fields.userContext.length > MAX_USER_CONTEXT_LENGTH) {
    throw invalidRequestError(`userContext exceeds ${MAX_USER_CONTEXT_LENGTH} characters`);
  }

  const imageBuffer = await image.arrayBuffer();
  const imageBase64 = arrayBufferToBase64(imageBuffer);

  const providerOutput = await provider.analyze({
    imageBase64,
    imageMimeType: image.type,
    userContext: fields.userContext,
    category: fields.category,
    locale: fields.locale,
  });

  const mapped = mapProviderOutputToAnalysisResult(providerOutput);
  const safe = applySafetyPolicy(mapped, fields.locale);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...safe,
  };
}

/** Chunked to stay well under `String.fromCharCode`'s argument-count limit
 * for large images — no Node-specific `Buffer` needed, just Web APIs
 * (`Uint8Array` + `btoa`), which keeps this file's global types identical
 * whether TypeScript sees it under DOM lib alone or alongside @types/node. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function parseMultipart(request: Request): Promise<MultipartForm> {
  try {
    return (await request.formData()) as unknown as MultipartForm;
  } catch {
    throw invalidImageError('Request body is not valid multipart/form-data');
  }
}

function extractImage(form: MultipartForm): File {
  const value = form.get('image');
  if (!(value instanceof File)) {
    throw invalidImageError('Missing "image" field, or it is not a file');
  }
  if (value.size === 0) {
    throw invalidImageError('Uploaded image is empty');
  }
  if (value.size > MAX_IMAGE_BYTES) {
    throw imageTooLargeError(`Image is ${value.size} bytes, max is ${MAX_IMAGE_BYTES}`);
  }
  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value.type)) {
    throw invalidImageError(`Unsupported image type "${value.type}"`);
  }
  return value;
}

function parseFields(form: MultipartForm): AnalyzeRequestFields {
  const result = AnalyzeRequestFieldsSchema.safeParse({
    userContext: trimOrUndefined(form.get('userContext')),
    category: trimOrUndefined(form.get('category')),
    locale: trimOrUndefined(form.get('locale')),
  });
  if (!result.success) {
    throw invalidRequestError(`Invalid request fields: ${result.error.message}`);
  }
  return result.data;
}

function trimOrUndefined(value: string | Blob | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toAnalysisError(error: unknown): AnalysisError {
  if (error instanceof AnalysisError) return error;
  if (error instanceof Error) return unknownError(error.message);
  return unknownError('Unknown error');
}
