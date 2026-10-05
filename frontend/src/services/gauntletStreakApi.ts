// frontend/src/services/gauntletStreakApi.ts
import {
  DEFAULT_GAUNTLET_GAME_MODE,
  BuyableBoost,
  GauntletGameMode,
  Role,
  RunResponse,
  SubmitResultResponse,
  StatsResponse,
  GauntletRun,
} from '../types/gauntletStreak';
import { CompletionsResponse } from '../types/challengeCompletion';
import { createStreakApiClient } from './streakApiClient';

const { getJson, postJson } = createStreakApiClient('gauntlet-streak');

export async function fetchRun(
  token: string,
  role: Role,
  gameMode: GauntletGameMode = DEFAULT_GAUNTLET_GAME_MODE
): Promise<RunResponse> {
  return getJson<RunResponse>(token, `/run?role=${role}&game_mode=${gameMode}`);
}

export async function submitMatchResult(
  token: string,
  role: Role,
  runId: number,
  result: 'win' | 'loss',
  useShield = false
): Promise<SubmitResultResponse> {
  return postJson<SubmitResultResponse>(token, '/result', { role, run_id: runId, result, use_shield: useShield });
}

export async function buyBoost(
  token: string,
  runId: number,
  boost: BuyableBoost,
  character?: string
): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/boost', { run_id: runId, boost, character });
  return data.run;
}

export async function revealTarget(token: string, runId: number): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/reveal', { run_id: runId });
  return data.run;
}

export async function selectTarget(token: string, runId: number, character: string): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/target', { run_id: runId, character });
  return data.run;
}

/** TEMP DEV: jump a run to a streak. The server answers 404 outside development. */
export async function devSetStreak(token: string, runId: number, streak: number): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/dev/streak', { run_id: runId, streak });
  return data.run;
}

export async function resetRun(
  token: string,
  role: Role,
  gameMode: GauntletGameMode = DEFAULT_GAUNTLET_GAME_MODE
): Promise<GauntletRun> {
  const data = await postJson<RunResponse>(token, '/run/reset', { role, game_mode: gameMode });
  return data.run;
}

export async function fetchStats(
  token: string,
  role: Role,
  gameMode: GauntletGameMode = DEFAULT_GAUNTLET_GAME_MODE
): Promise<StatsResponse> {
  return getJson<StatsResponse>(token, `/stats?role=${role}&game_mode=${gameMode}`);
}

export async function fetchCompletions(
  token: string,
  role: Role,
  gameMode: GauntletGameMode = DEFAULT_GAUNTLET_GAME_MODE
): Promise<CompletionsResponse> {
  return getJson<CompletionsResponse>(token, `/completions?role=${role}&game_mode=${gameMode}`);
}
