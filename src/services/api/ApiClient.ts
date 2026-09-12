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

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.config.getAuthToken?.();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    };

    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers,
    });

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

/** No backend exists yet; this URL is a placeholder read from env so it can
 * be pointed at a real deployment without code changes. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.lifefix.ai';
