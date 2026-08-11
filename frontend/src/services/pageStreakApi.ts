import {
  ExcludedPerksResponse,
  PageStreakRun,
  RosterEntry,
} from '../types/pageStreak';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/page-streak`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handleResponse<T>);
}

export async function fetchRoster(): Promise<RosterEntry[]> {
  const data = await handleResponse<{ count: number; data: RosterEntry[] }>(
    await fetch(`${API_BASE}/roster`)
  );
  return data.data;
}

export async function fetchExcludedPerks(): Promise<ExcludedPerksResponse> {
  return handleResponse<ExcludedPerksResponse>(await fetch(`${API_BASE}/excluded-perks`));
}

export async function saveExcludedPerks(
  excluded: string[]
): Promise<{ excluded: string[]; pool_size: number; page_count: number }> {
  const response = await fetch(`${API_BASE}/excluded-perks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ excluded }),
  });
  return handleResponse(response);
}

export async function fetchRun(killer: string): Promise<PageStreakRun | null> {
  const data = await handleResponse<{ run: PageStreakRun | null }>(
    await fetch(`${API_BASE}/run?killer=${encodeURIComponent(killer)}`)
  );
  return data.run;
}

export async function startRun(killer: string): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>('/run/start', { killer });
  return data.run;
}

export async function submitResult(
  killer: string,
  page: number,
  perks: string[],
  result: 'win' | 'loss'
): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>('/run/result', {
    killer,
    page,
    perks,
    result,
  });
  return data.run;
}

export async function resetRun(killer: string): Promise<PageStreakRun> {
  const data = await postJson<{ run: PageStreakRun }>('/run/reset', { killer });
  return data.run;
}
