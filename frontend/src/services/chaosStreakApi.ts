// frontend/src/services/chaosStreakApi.ts
import {
  ChaosRun,
  ChaosRunResponse,
  ChaosStats,
  ChaosStatsResponse,
  Difficulty,
} from '../types/chaosStreak';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/chaos-streak`;

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

export async function fetchChaosRun(token: string, difficulty: Difficulty): Promise<ChaosRun> {
  const data = await fetch(`${API_BASE}/run?difficulty=${difficulty}`, {
    headers: authHeaders(token),
  }).then(handleResponse<ChaosRunResponse>);
  return data.run;
}

export async function revealChaosBuild(token: string, runId: number): Promise<ChaosRun> {
  const data = await postJson<ChaosRunResponse>(token, '/reveal', { run_id: runId });
  return data.run;
}

export async function submitChaosResult(
  token: string,
  runId: number,
  result: 'win' | 'loss',
  killerId: string
): Promise<ChaosRun> {
  const data = await postJson<ChaosRunResponse>(token, '/result', {
    run_id: runId,
    result,
    killer_id: killerId,
  });
  return data.run;
}

export async function resetChaosRun(token: string, difficulty: Difficulty): Promise<ChaosRun> {
  const data = await postJson<ChaosRunResponse>(token, '/run/reset', { difficulty });
  return data.run;
}

export async function fetchChaosStats(token: string, difficulty: Difficulty): Promise<ChaosStats> {
  const data = await fetch(`${API_BASE}/stats?difficulty=${difficulty}`, {
    headers: authHeaders(token),
  }).then(handleResponse<ChaosStatsResponse>);
  return data.stats;
}
