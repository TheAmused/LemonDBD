// frontend/src/lib/api-client.ts
/**
 * Centralized API client wrapper with:
 * - Automatic base URL resolution (via apiUrl)
 * - Configurable timeout (default 15s) with AbortController
 * - Automatic credentials: 'include' for session cookies
 * - JSON headers support
 * - Normalized error handling throwing ApiError or structured Error
 */

import { apiUrl, ApiError, authHeaders, type ApiErrorBody } from '@/utils/api';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  token?: string | null;
  json?: boolean;
}

export const DEFAULT_TIMEOUT_MS = 15000;

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    token,
    json = false,
    headers,
    signal,
    ...rest
  } = options;

  const url = apiUrl(endpoint);

  const controller = new AbortController();
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const combinedSignal = signal
    ? anySignal([signal, controller.signal])
    : controller.signal;

  const mergedHeaders = new Headers(authHeaders(token, { json }));
  if (headers) {
    new Headers(headers).forEach((value, key) => mergedHeaders.set(key, value));
  }

  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: mergedHeaders,
      signal: combinedSignal,
      ...rest,
    });

    if (!res.ok) {
      let body: ApiErrorBody = {};
      try {
        body = (await res.json()) as ApiErrorBody;
      } catch {
        // Response was not JSON
      }
      const message = body.error || `Request failed (${res.status}): ${url}`;
      throw new ApiError(message, res.status, body.error_code);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort();
      return controller.signal;
    }
    sig.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export const api = {
  get: <T>(url: string, opts?: RequestOptions) => apiClient<T>(url, { ...opts, method: 'GET' }),
  post: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiClient<T>(url, {
      ...opts,
      method: 'POST',
      json: true,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiClient<T>(url, {
      ...opts,
      method: 'PUT',
      json: true,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    apiClient<T>(url, {
      ...opts,
      method: 'PATCH',
      json: true,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string, opts?: RequestOptions) => apiClient<T>(url, { ...opts, method: 'DELETE' }),
};
