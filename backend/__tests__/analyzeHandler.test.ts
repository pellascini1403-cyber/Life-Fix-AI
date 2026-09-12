import { handleAnalyzeRequest, toAnalysisError } from '../analyzeHandler';
import { AnalysisError, providerUnavailableError } from '../errors';
import { InMemoryRateLimiter } from '../rateLimit/RateLimiter';
import { ProviderAnalysis } from '../schema';
import { VisionAnalysisProvider } from '../aiProvider';

function fakeProvider(output: ProviderAnalysis): VisionAnalysisProvider {
  return { analyze: jest.fn().mockResolvedValue(output) };
}

function throwingProvider(error: unknown): VisionAnalysisProvider {
  return {
    analyze: jest.fn().mockRejectedValue(error),
  };
}

function validProviderAnalysis(): ProviderAnalysis {
  return {
    category: 'home',
    problem: 'Damp patch on the wall',
    confidence: 'medium',
    explanation: 'A localized damp patch, no visible mold.',
    steps: [{ number: 1, title: 'Ventilate', description: 'Air out the room daily.' }],
    materials: [],
    estimatedTimeMinutes: { min: 10, max: 15 },
    difficulty: 'easy',
    warnings: [],
    thingsToAvoid: [],
    followUpQuestions: [],
    safetyLevel: 'safe',
  };
}

function buildAnalyzeRequest(options: {
  image?: { name: string; type: string; bytes: number } | null;
  userContext?: string;
  category?: string;
  locale?: string;
} = {}): Request {
  const form = new FormData();
  if (options.image !== null) {
    const image = options.image ?? { name: 'photo.jpg', type: 'image/jpeg', bytes: 1024 };
    form.append('image', new File([new Uint8Array(image.bytes)], image.name, { type: image.type }));
  }
  if (options.userContext !== undefined) form.append('userContext', options.userContext);
  if (options.category !== undefined) form.append('category', options.category);
  if (options.locale !== undefined) form.append('locale', options.locale);

  return new Request('http://localhost/analyze', { method: 'POST', body: form });
}

function freshRateLimiter() {
  return new InMemoryRateLimiter([{ windowMs: 60_000, max: 1000 }]);
}

describe('handleAnalyzeRequest', () => {
  it('returns a mapped, safety-checked result on success', async () => {
    const provider = fakeProvider(validProviderAnalysis());
    const result = await handleAnalyzeRequest(buildAnalyzeRequest(), 'test-device', {
      provider,
      rateLimiter: freshRateLimiter(),
    });

    expect(result.problemTitle).toBe('Damp patch on the wall');
    expect(result.risk).toBe('none');
    expect(typeof result.id).toBe('string');
    expect(typeof result.createdAt).toBe('string');
    expect(provider.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ imageMimeType: 'image/jpeg', locale: 'es' }),
    );
  });

  it('passes userContext, category, and locale through to the provider', async () => {
    const provider = fakeProvider(validProviderAnalysis());
    await handleAnalyzeRequest(
      buildAnalyzeRequest({ userContext: 'It smells odd', category: 'garden', locale: 'en' }),
      'test-device',
      { provider, rateLimiter: freshRateLimiter() },
    );

    expect(provider.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ userContext: 'It smells odd', category: 'garden', locale: 'en' }),
    );
  });

  it('rejects with INVALID_IMAGE when no image field is present', async () => {
    const provider = fakeProvider(validProviderAnalysis());
    await expect(
      handleAnalyzeRequest(buildAnalyzeRequest({ image: null }), 'test-device', {
        provider,
        rateLimiter: freshRateLimiter(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
  });

  it('rejects with IMAGE_TOO_LARGE for an oversized image', async () => {
    const provider = fakeProvider(validProviderAnalysis());
    await expect(
      handleAnalyzeRequest(
        buildAnalyzeRequest({ image: { name: 'big.jpg', type: 'image/jpeg', bytes: 9 * 1024 * 1024 } }),
        'test-device',
        { provider, rateLimiter: freshRateLimiter() },
      ),
    ).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
  });

  it('rejects with INVALID_IMAGE for an unsupported image type', async () => {
    const provider = fakeProvider(validProviderAnalysis());
    await expect(
      handleAnalyzeRequest(
        buildAnalyzeRequest({ image: { name: 'scan.pdf', type: 'application/pdf', bytes: 1024 } }),
        'test-device',
        { provider, rateLimiter: freshRateLimiter() },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
  });

  it('rejects with INVALID_REQUEST for an unrecognized category', async () => {
    const provider = fakeProvider(validProviderAnalysis());
    await expect(
      handleAnalyzeRequest(buildAnalyzeRequest({ category: 'not-a-category' }), 'test-device', {
        provider,
        rateLimiter: freshRateLimiter(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('rejects with RATE_LIMITED once the limiter denies the key, without calling the provider', async () => {
    const provider = fakeProvider(validProviderAnalysis());
    const rateLimiter = new InMemoryRateLimiter([{ windowMs: 60_000, max: 0 }]);

    await expect(
      handleAnalyzeRequest(buildAnalyzeRequest(), 'test-device', { provider, rateLimiter }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(provider.analyze).not.toHaveBeenCalled();
  });

  it('propagates a structured AnalysisError thrown by the provider as-is', async () => {
    const provider = throwingProvider(providerUnavailableError('upstream is down'));
    await expect(
      handleAnalyzeRequest(buildAnalyzeRequest(), 'test-device', {
        provider,
        rateLimiter: freshRateLimiter(),
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
});

describe('toAnalysisError', () => {
  it('passes an existing AnalysisError through unchanged', () => {
    const original = providerUnavailableError('down');
    expect(toAnalysisError(original)).toBe(original);
  });

  it('wraps a plain Error as UNKNOWN', () => {
    const wrapped = toAnalysisError(new Error('boom'));
    expect(wrapped).toBeInstanceOf(AnalysisError);
    expect(wrapped.code).toBe('UNKNOWN');
  });

  it('wraps a non-Error thrown value as UNKNOWN', () => {
    const wrapped = toAnalysisError('a string was thrown');
    expect(wrapped.code).toBe('UNKNOWN');
  });
});
