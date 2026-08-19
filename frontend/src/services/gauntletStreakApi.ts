// frontend/src/services/gauntletStreakApi.ts
import { Role, RunResponse, SubmitResultResponse, StatsResponse, GauntletRun } from '../types/gauntletStreak';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/gauntlet-streak`;

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

export async function fetchRun(token: string, role: Role): Promise<RunResponse> {
  return fetch(`${API_BASE}/run?role=${role}`, { headers: authHeaders(token) }).then(
    handleResponse<RunResponse>
  );
}

export async function submitMatchResult(
  token: string,
  role: Role,
  runId: number,
  result: 'win' | 'loss'
): Promise<SubmitResultResponse> {
  return postJson<SubmitResultResponse>(token, '/result', { role, run_id: runId, result });
}

export async function revealTarget(token: string, runId: number): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/reveal', { run_id: runId });
  return data.run;
}

export async function resetRun(token: string, role: Role): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/run/reset', { role });
  return data.run;
}

export async function fetchStats(token: string, role: Role): Promise<StatsResponse> {
  return fetch(`${API_BASE}/stats?role=${role}`, { headers: authHeaders(token) }).then(
    handleResponse<StatsResponse>
  );
}
