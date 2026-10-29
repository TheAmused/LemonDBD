// frontend/src/services/idPleaseStreakApi.ts
import type {
  IdPleaseDifficulty,
  IdPleaseEligibility,
  IdPleaseLane,
  IdPleasePreview,
  IdPleaseRoster,
  IdPleaseRun,
  IdPleaseRunResponse,
  IdPleaseSide,
  IdPleaseStats,
  IdPleaseStatsResponse,
} from '../types/idPleaseStreak';
import type { CompletionsResponse } from '../types/challengeCompletion';
import { createStreakApiClient } from './streakApiClient';

const PREFIX: Record<IdPleaseLane, string> = {
  mixed: 'id-please-streak',
  survivor: 'id-please-survivor-streak',
  killer: 'id-please-killer-streak',
};

const clients = {
  mixed: createStreakApiClient(PREFIX.mixed),
  survivor: createStreakApiClient(PREFIX.survivor),
  killer: createStreakApiClient(PREFIX.killer),
} satisfies Record<IdPleaseLane, ReturnType<typeof createStreakApiClient>>;

export async function fetchIdPleaseRun(lane: IdPleaseLane, token: string, difficulty: IdPleaseDifficulty): Promise<IdPleaseRun> {
  const data = await clients[lane].getJson<IdPleaseRunResponse>(token, `/run?difficulty=${difficulty}`);
  return data.run;
}

export async function submitIdPleaseOpening(
  lane: IdPleaseLane,
  token: string,
  runId: number,
  side: IdPleaseSide,
  perkPositions: number[],
  rosterFingerprint: string
): Promise<IdPleaseRun> {
  const data = await clients[lane].postJson<IdPleaseRunResponse>(token, '/opening', {
    run_id: runId,
    side,
    perk_positions: perkPositions,
    roster_fingerprint: rosterFingerprint,
  });
  return data.run;
}

export async function submitIdPleaseResult(
  lane: IdPleaseLane,
  token: string,
  runId: number,
  matchNumber: number,
  result: 'win' | 'loss',
  rosterFingerprint: string
): Promise<IdPleaseRun> {
  const data = await clients[lane].postJson<IdPleaseRunResponse>(token, '/result', {
    run_id: runId,
    match_number: matchNumber,
    result,
    roster_fingerprint: rosterFingerprint,
  });
  return data.run;
}

export async function abandonIdPleaseRun(lane: IdPleaseLane, token: string, difficulty: IdPleaseDifficulty): Promise<IdPleaseRun> {
  const data = await clients[lane].postJson<IdPleaseRunResponse>(token, '/run/abandon', { difficulty });
  return data.run;
}

export async function fetchIdPleaseStats(lane: IdPleaseLane, token: string, difficulty: IdPleaseDifficulty): Promise<IdPleaseStats> {
  const data = await clients[lane].getJson<IdPleaseStatsResponse>(token, `/stats?difficulty=${difficulty}`);
  return data.stats;
}

export async function fetchIdPleaseCompletions(lane: IdPleaseLane, token: string, difficulty: IdPleaseDifficulty): Promise<CompletionsResponse> {
  return clients[lane].getJson<CompletionsResponse>(token, `/completions?difficulty=${difficulty}`);
}

export async function fetchIdPleaseEligibility(lane: IdPleaseLane, token: string): Promise<IdPleaseEligibility> {
  return clients[lane].getJson<IdPleaseEligibility>(token, '/eligibility');
}

export async function fetchIdPleaseRoster(lane: IdPleaseLane, token: string, side: IdPleaseSide): Promise<IdPleaseRoster> {
  const data = await clients[lane].getJson<{ roster: IdPleaseRoster }>(token, `/roster?side=${side}`);
  return data.roster;
}

export async function fetchIdPleasePreview(
  lane: IdPleaseLane,
  token: string,
  side: IdPleaseSide,
  perkPositions: number[],
  difficulty: IdPleaseDifficulty
): Promise<IdPleasePreview> {
  const data = await clients[lane].getJson<{ preview: IdPleasePreview }>(
    token,
    `/preview?side=${side}&perks=${perkPositions.join(',')}&difficulty=${difficulty}`
  );
  return data.preview;
}
