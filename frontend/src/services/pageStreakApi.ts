// frontend/src/services/pageStreakApi.ts
import { PageStreakRun, PageStreakStats, PoolSummary, RosterMilestone, RosterResponse } from '../types/pageStreak';
import { CompletionsResponse } from '../types/challengeCompletion';
import { createStreakApiClient } from './streakApiClient';

const { getJson, postJson } = createStreakApiClient('page-streak');

export async function fetchRoster(token: string): Promise<RosterResponse> {
  const data = await getJson<{ count: number; data: RosterResponse['roster']; milestone: RosterMilestone }>(
    token,
    '/roster'
  );
  return { roster: data.data, milestone: data.milestone };
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

export async function resetAllRuns(token: string): Promise<void> {
  await postJson<{ success: boolean }>(token, '/run/reset-all', {});
}

export async function fetchStats(token: string): Promise<PageStreakStats> {
  const data = await getJson<{ stats: PageStreakStats }>(token, '/stats');
  return data.stats;
}

export async function fetchCompletions(token: string, killer: string): Promise<CompletionsResponse> {
  return getJson<CompletionsResponse>(token, `/completions?killer=${encodeURIComponent(killer)}`);
}
