// frontend/src/services/historyStreakApi.ts
import { HistoryMode, HistoryRun, HistoryRunResponse, HistoryStats, HistoryStatsResponse } from '../types/historyStreak';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/history-streak`;

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

function postJson<T>(token: string, path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  }).then(handleResponse<T>);
}

export async function fetchHistoryRun(token: string, mode: HistoryMode): Promise<HistoryRun> {
  const data = await fetch(`${API_BASE}/run?mode=${mode}`, {
    headers: authHeaders(token),
  }).then(handleResponse<HistoryRunResponse>);
  return data.run;
}

export async function submitHistoryResult(
  token: string,
  runId: number,
  result: 'win' | 'loss',
  killerId: string
): Promise<HistoryRun> {
  const data = await postJson<HistoryRunResponse>(token, '/result', {
    run_id: runId,
    result,
    killer_id: killerId,
  });
  return data.run;
}

export async function resetHistoryRun(token: string, mode: HistoryMode): Promise<HistoryRun> {
  const data = await postJson<HistoryRunResponse>(token, '/run/reset', { mode });
  return data.run;
}

export async function fetchHistoryStats(token: string, mode: HistoryMode): Promise<HistoryStats> {
  const data = await fetch(`${API_BASE}/stats?mode=${mode}`, {
    headers: authHeaders(token),
  }).then(handleResponse<HistoryStatsResponse>);
  return data.stats;
}
