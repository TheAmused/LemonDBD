// frontend/src/services/pageStreakApi.ts
import { PageStreakRun, PoolSummary, RosterEntry } from '../types/pageStreak';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/page-streak`;

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

function getJson<T>(token: string, path: string): Promise<T> {
  return fetch(`${API_BASE}${path}`, { headers: authHeaders(token) }).then(handleResponse<T>);
}

function postJson<T>(token: string, path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  }).then(handleResponse<T>);
}

export async function fetchRoster(token: string): Promise<RosterEntry[]> {
  const data = await getJson<{ count: number; data: RosterEntry[] }>(token, '/roster');
  return data.data;
}

export async function fetchPoolSummary(token: string): Promise<PoolSummary> {
  return getJson<PoolSummary>(token, '/pool');
}

export async function fetchRun(token: string, killer: string): Promise<PageStreakRun | null> {
  const data = await getJson<{ run: PageStreakRun | null }>(
    token,
    `/run?killer=${encodeURIComponent(killer)}`
  );
  return data.run;
}

export async function startRun(token: string, killer: string): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>(token, '/run/start', { killer });
  return data.run;
}

export async function submitResult(
  token: string,
  killer: string,
  page: number,
  perks: string[],
  result: 'win' | 'loss'
): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>(token, '/run/result', {
    killer,
    page,
    perks,
    result,
  });
  return data.run;
}

export async function resetRun(token: string, killer: string): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>(token, '/run/reset', { killer });
  return data.run;
}
