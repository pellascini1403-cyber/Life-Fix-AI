/**
 * Thin HTTP client for talking to the LifeFix backend (never an AI provider
 * directly — see docs/architecture.md). Centralizes base URL, auth header
 * injection, and error normalization so services don't each reimplement it.
 */
export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async request<T>(path: string, init: RequestInit = {}, timeoutMs?: number): Promise<T> {
    const token = await this.config.getAuthToken?.();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    };

    const controller = timeoutMs ? new AbortController() : undefined;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller?.signal,
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiError(body || response.statusText, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

/**
 * Defaults to an empty string — a relative path — which resolves against
 * the app's own origin. That's correct as-is for web (the Expo Router
 * `/analyze` API route is served by the same dev/production server as the
 * app) and works for native during development too, since Expo serves the
 * bundle and its API routes from the same Metro dev server URL. A native
 * production build talking to a separately hosted backend (e.g. EAS
 * Hosting) must set `EXPO_PUBLIC_API_URL` to that deployment's absolute
 * URL — see .env.example.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
