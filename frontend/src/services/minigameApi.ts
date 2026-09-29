// frontend/src/services/minigameApi.ts
import type {
  MinigameCatalog,
  ChallengeDefinition,
  GuessEvaluationResult,
  RoundConfig,
} from '@/types/minigame';
import { apiUrl } from '@/utils/api';
import { CATALOG_TTL_MS, catalogKey, fetchCached, fetchJson } from '@/services/dataCache';

export function minigameCatalogCacheKey(lang: string = 'en'): string {
  return catalogKey('minigames/catalog', { lang });
}

export async function fetchMinigameCatalog(lang: string = 'en'): Promise<MinigameCatalog> {
  const url = minigameCatalogCacheKey(lang);
  const data = await fetchCached(
    url,
    () => fetchJson<any>(url),
    { ttlMs: CATALOG_TTL_MS }
  );

  const rawChars = data.characters || [];
  const killers = (data.killers && data.killers.length > 0)
    ? data.killers
    : rawChars.filter((c: any) => c.role === 'Killer' || c.type === 'killer');
  const survivors = (data.survivors && data.survivors.length > 0)
    ? data.survivors
    : rawChars.filter((c: any) => c.role === 'Survivor' || c.type === 'survivor');

  return {
    characters: rawChars,
    killers,
    survivors,
    perks: data.perks || [],
    realms: data.realms || [],
  };
}

export async function fetchDailyChallenge(
  gameMode: string = 'classic',
  dateStr?: string
): Promise<ChallengeDefinition> {
  const params = new URLSearchParams({ mode: gameMode });
  if (dateStr) params.set('date', dateStr);
  const res = await fetch(apiUrl(`/api/v1/minigames/daily?${params.toString()}`), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to fetch daily challenge (${res.status})`);
  }
  return res.json();
}

export async function fetchRepeatableChallenge(
  gameMode: string = 'classic',
  seed?: string
): Promise<ChallengeDefinition> {
  const params = new URLSearchParams({ mode: gameMode, game_mode: gameMode });
  if (seed) params.set('seed', seed);

  const res = await fetch(apiUrl(`/api/v1/minigames/repeatable?${params.toString()}`), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to fetch repeatable challenge (${res.status})`);
  }
  return res.json();
}


export interface SubmitGuessParams {
  challenge_id?: number | string;
  round_index: number;
  guess_id?: number | string;
  guess_type?: string;
  guess_name?: string;
  custom_round_config?: RoundConfig;
  attempt_number?: number;
}

export async function submitGuess(params: SubmitGuessParams): Promise<GuessEvaluationResult> {
  const res = await fetch(apiUrl('/api/v1/minigames/guess'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to evaluate guess (${res.status})`);
  }

  return res.json();
}

export interface SharedLinkResponse {
  short_code: string;
  share_url: string;
}

export async function createSharedLink(challenge: ChallengeDefinition): Promise<SharedLinkResponse> {
  const res = await fetch(apiUrl('/api/v1/minigames/share'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      challenge_payload: {
        title: challenge.title,
        description: challenge.description || '',
        game_mode: challenge.game_mode || 'custom',
        rounds: challenge.rounds,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to create share link (${res.status})`);
  }

  return res.json();
}

export async function fetchSharedChallenge(shortCode: string): Promise<ChallengeDefinition> {
  const res = await fetch(apiUrl(`/api/v1/minigames/share/${encodeURIComponent(shortCode)}`), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Shared challenge not found (${res.status})`);
  }

  return res.json();
}

export async function publishOfficialChallenge(
  token: string,
  challenge: ChallengeDefinition
): Promise<ChallengeDefinition> {
  const res = await fetch(apiUrl('/api/v1/minigames/official'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: challenge.title,
      description: challenge.description,
      challenge_date: challenge.challenge_date,
      game_mode: challenge.game_mode || 'classic',
      rounds: challenge.rounds,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to publish official challenge (${res.status})`);
  }

  return res.json();
}
