// frontend/src/services/streakApiClient.ts
import { backendBase } from '@/utils/staticUrl';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
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
    getJson<T>(token: string, path: string): Promise<T> {
      return fetch(`${base}${path}`, { headers: authHeaders(token) }).then(handleResponse<T>);
    },
    postJson<T>(token: string, path: string, body: unknown): Promise<T> {
      return fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(body),
      }).then(handleResponse<T>);
    },
  };
}
