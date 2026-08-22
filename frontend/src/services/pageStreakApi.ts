// frontend/src/services/pageStreakApi.ts
import { PageStreakRun, PageStreakStats, PoolSummary, RosterEntry } from '../types/pageStreak';
import { createStreakApiClient } from './streakApiClient';

const { getJson, postJson } = createStreakApiClient('page-streak');

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

export async function fetchStats(token: string): Promise<PageStreakStats> {
  const data = await getJson<{ stats: PageStreakStats }>(token, '/stats');
  return data.stats;
}
