import { ApiClient, ApiError } from '../ApiClient';

function fakeResponse(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: jest.fn().mockResolvedValue(''),
    json: jest.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as Response;
}

describe('ApiClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('returns the parsed JSON body on a 200 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse({ json: jest.fn().mockResolvedValue({ foo: 'bar' }) }),
    );
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    const result = await client.request('/things');

    expect(result).toEqual({ foo: 'bar' });
  });

  it('calls fetch with baseUrl + path', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await client.request('/things');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.test/things',
      expect.objectContaining({}),
    );
  });

  it('returns undefined for a 204 No Content response, without reading a body', async () => {
    const jsonSpy = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse({ status: 204, json: jsonSpy }));
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    const result = await client.request('/things');

    expect(result).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it('throws ApiError with the status and text body on a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse({ ok: false, status: 404, statusText: 'Not Found', text: jest.fn().mockResolvedValue('nope') }),
    );
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await expect(client.request('/missing')).rejects.toBeInstanceOf(ApiError);
    await expect(client.request('/missing')).rejects.toMatchObject({ status: 404, message: 'nope' });
  });

  it('falls back to statusText when the error response body is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse({ ok: false, status: 500, statusText: 'Server Error', text: jest.fn().mockResolvedValue('') }),
    );
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await expect(client.request('/broken')).rejects.toMatchObject({ status: 500, message: 'Server Error' });
  });

  it('falls back to statusText when reading the error body itself fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: jest.fn().mockRejectedValue(new Error('stream already read')),
      }),
    );
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await expect(client.request('/broken')).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('sends an Authorization: Bearer header when getAuthToken resolves a token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({
      baseUrl: 'https://example.test',
      getAuthToken: async () => 'token-123',
    });

    await client.request('/things');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token-123');
  });

  it('sends no Authorization header when getAuthToken is not provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await client.request('/things');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('sends no Authorization header when getAuthToken resolves null', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({ baseUrl: 'https://example.test', getAuthToken: async () => null });

    await client.request('/things');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('sets Content-Type: application/json for a plain object body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await client.request('/things', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('does not set Content-Type for a FormData body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await client.request('/things', { method: 'POST', body: new FormData() });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('lets caller-provided headers pass through', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await client.request('/things', { headers: { 'X-Device-Id': 'abc' } });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['X-Device-Id']).toBe('abc');
  });

  it('aborts the underlying fetch once the given timeout elapses', async () => {
    (global.fetch as jest.Mock).mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await expect(client.request('/slow', {}, 10)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not pass an abort signal when no timeout is given', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse());
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    await client.request('/things');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.signal).toBeUndefined();
  });

  it('propagates a raw error when the response body is not valid JSON (current, undocumented behavior)', async () => {
    const jsonError = new SyntaxError('Unexpected token in JSON');
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse({ json: jest.fn().mockRejectedValue(jsonError) }));
    const client = new ApiClient({ baseUrl: 'https://example.test' });

    // Documents today's actual behavior: an unparseable 200 body is not
    // wrapped in an ApiError, it propagates as-is. Not changed here per
    // scope — see the audit note this test exists to cover.
    await expect(client.request('/things')).rejects.toBe(jsonError);
  });
});
