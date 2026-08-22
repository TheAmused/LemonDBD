// frontend/src/services/gauntletStreakApi.ts
import { Role, RunResponse, SubmitResultResponse, StatsResponse, GauntletRun } from '../types/gauntletStreak';
import { createStreakApiClient } from './streakApiClient';

const { getJson, postJson } = createStreakApiClient('gauntlet-streak');

export async function fetchRun(token: string, role: Role): Promise<RunResponse> {
  return getJson<RunResponse>(token, `/run?role=${role}`);
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
  return getJson<StatsResponse>(token, `/stats?role=${role}`);
}
