// frontend/src/services/chaosStreakApi.ts
import {
  ChaosRun,
  ChaosRunResponse,
  ChaosStats,
  ChaosStatsResponse,
  Difficulty,
} from '../types/chaosStreak';
import { createStreakApiClient } from './streakApiClient';

const { getJson, postJson } = createStreakApiClient('chaos-streak');

export async function fetchChaosRun(token: string, difficulty: Difficulty): Promise<ChaosRun> {
  const data = await getJson<ChaosRunResponse>(token, `/run?difficulty=${difficulty}`);
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
  const data = await getJson<ChaosStatsResponse>(token, `/stats?difficulty=${difficulty}`);
  return data.stats;
}
