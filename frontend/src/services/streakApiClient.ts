// frontend/src/services/streakApiClient.ts
import { backendBase } from '@/utils/staticUrl';
import { authHeaders } from '@/utils/api';

/** A failed streak request. Carries the HTTP status, the server's machine-readable `code` and the whole
 *  error body, for the few modes whose conflicts (409) hold data the board needs to recover. */
export class StreakApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
    readonly body: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StreakApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData: Record<string, unknown> = await response.json().catch(() => ({}));
    const message = typeof errorData.error === 'string' && errorData.error ? errorData.error : `HTTP error! status: ${response.status}`;
    throw new StreakApiError(message, response.status, typeof errorData.code === 'string' ? errorData.code : undefined, errorData);
  }
  return response.json();
}

/**
 * Every streak mode's API client (Gauntlet/Chaos/History/Page Streak) was
 * hand-rolling the same fetch wrapper (base URL, auth header, JSON error
 * handling) with small, easy-to-drift differences. This factory is the one
 * place that plumbing lives now; each mode's api file just supplies its own
 * URL prefix and typed wrapper functions.
 */
export function createStreakApiClient(prefix: string) {
  const base = `${backendBase}/api/v1/${prefix}`;

  return {
    getJson: <T>(token: string, path: string): Promise<T> =>
      fetch(`${base}${path}`, { headers: authHeaders(token) }).then(handleResponse<T>),
    postJson: <T>(token: string, path: string, body: unknown): Promise<T> =>
      fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(body),
      }).then(handleResponse<T>),
  };
}
