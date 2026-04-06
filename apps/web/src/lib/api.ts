/**
 * API Client for Il Buon Caffe
 * Handles communication with Cloudflare Workers API
 *
 * Client-side requests always use same-origin relative URLs (e.g. /api/auth/login).
 * Next.js rewrites in next.config.mjs proxy /api/* → the Hono Worker.
 * This avoids CORS issues and works in both dev and production.
 */

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Fetch wrapper with error handling and JSON parsing.
 * @param endpoint - e.g. "/auth/login" (will be prefixed with /api)
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errorMessage = errorBody.message || errorBody.error || res.statusText;
    throw new ApiError(
      errorBody.code || 'UNKNOWN_ERROR',
      errorMessage,
      res.status,
      errorBody
    );
  }

  // Handle empty responses (204 No Content)
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  put: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
};
