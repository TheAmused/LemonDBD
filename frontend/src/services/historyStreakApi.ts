// frontend/src/services/historyStreakApi.ts
import { HistoryMode, HistoryRun, HistoryRunResponse, HistoryStats, HistoryStatsResponse } from '../types/historyStreak';
import { createStreakApiClient } from './streakApiClient';

const { getJson, postJson } = createStreakApiClient('history-streak');

export async function fetchHistoryRun(token: string, mode: HistoryMode): Promise<HistoryRun> {
  const data = await getJson<HistoryRunResponse>(token, `/run?mode=${mode}`);
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
  const data = await getJson<HistoryStatsResponse>(token, `/stats?mode=${mode}`);
  return data.stats;
}
