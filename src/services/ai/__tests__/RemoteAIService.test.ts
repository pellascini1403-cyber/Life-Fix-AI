import { ApiClient, ApiError } from '../../api/ApiClient';
import { RemoteAIService } from '../RemoteAIService';
import { ClientAnalysisError } from '../../../types/analysisError';
import { AnalysisResult } from '../../../types/analysis';

function fakeApiClient(): ApiClient {
  return { request: jest.fn() } as unknown as ApiClient;
}

function successBody(): Omit<AnalysisResult, 'imageUri' | 'userContext'> {
  return {
    id: 'srv-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    category: 'home',
    problemTitle: 'Damp patch',
    problemExplanation: 'Explanation',
    confidence: 'medium',
    steps: [{ order: 1, instruction: 'Ventilate.' }],
    requiredItems: [],
    estimatedTimeMinutes: { min: 10, max: 15 },
    difficulty: 'easy',
    warnings: [],
    followUpQuestions: [],
    risk: 'none',
    recommendsProfessional: false,
  };
}

beforeEach(() => {
  // The client converts the local imageUri into a Blob (via fetch) before
  // ever calling the backend — mock that step so it never hits the network.
  global.fetch = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(new Blob(['x'])) });
});

describe('RemoteAIService', () => {
  it('merges the backend response with the client-owned imageUri/userContext', async () => {
    const api = fakeApiClient();
    (api.request as jest.Mock).mockResolvedValue(successBody());

    const service = new RemoteAIService(api);
    const result = await service.analyze({
      imageUri: 'file:///local/photo.jpg',
      userContext: 'It smells odd',
    });

    expect(result.id).toBe('srv-1');
    expect(result.imageUri).toBe('file:///local/photo.jpg');
    expect(result.userContext).toBe('It smells odd');
  });

  it('posts to /analyze with a multipart body and the device-id header', async () => {
    const api = fakeApiClient();
    (api.request as jest.Mock).mockResolvedValue(successBody());

    const service = new RemoteAIService(api);
    await service.analyze({ imageUri: 'file:///local/photo.jpg', category: 'garden' });

    expect(api.request).toHaveBeenCalledWith(
      '/analyze',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
        headers: expect.objectContaining({ 'X-Device-Id': expect.any(String) }),
      }),
      expect.any(Number),
    );
  });

  it('maps a structured backend error body to the matching ClientAnalysisError code', async () => {
    const api = fakeApiClient();
    (api.request as jest.Mock).mockRejectedValue(
      new ApiError(JSON.stringify({ error: { code: 'RATE_LIMITED' } }), 429),
    );

    const service = new RemoteAIService(api);
    await expect(service.analyze({ imageUri: 'file:///x.jpg' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  it('falls back to UNKNOWN when the error body is not the expected shape', async () => {
    const api = fakeApiClient();
    (api.request as jest.Mock).mockRejectedValue(new ApiError('<html>502 Bad Gateway</html>', 502));

    const service = new RemoteAIService(api);
    await expect(service.analyze({ imageUri: 'file:///x.jpg' })).rejects.toMatchObject({
      code: 'UNKNOWN',
    });
  });

  it('maps a network-level TypeError to NETWORK_ERROR', async () => {
    const api = fakeApiClient();
    (api.request as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    const service = new RemoteAIService(api);
    await expect(service.analyze({ imageUri: 'file:///x.jpg' })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('maps an aborted (timed out) request to TIMEOUT', async () => {
    const api = fakeApiClient();
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    (api.request as jest.Mock).mockRejectedValue(abortError);

    const service = new RemoteAIService(api);
    await expect(service.analyze({ imageUri: 'file:///x.jpg' })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('always throws a ClientAnalysisError, never a raw error', async () => {
    const api = fakeApiClient();
    (api.request as jest.Mock).mockRejectedValue(new Error('something odd'));

    const service = new RemoteAIService(api);
    try {
      await service.analyze({ imageUri: 'file:///x.jpg' });
      throw new Error('expected analyze() to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ClientAnalysisError);
    }
  });
});
