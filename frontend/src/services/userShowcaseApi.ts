// frontend/src/services/userShowcaseApi.ts
'use client';

import { DEFAULT_SHOWCASE_STATE, GRADE_EMBLEMS, PLAYER_TITLES, type UserShowcaseState } from '@/types/userShowcase';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { ApiError, authHeaders, getAuthToken, type ApiErrorBody } from '@/utils/api';

function apiBase(): string {
  return getBackendBaseUrl();
}

interface BackendMain {
  character_id?: unknown;
  character_name?: string;
  prestige?: unknown;
  perk_ids?: unknown;
}

interface BackendShowcase {
  player_title?: unknown;
  devotion_level?: unknown;
  grade_rank?: unknown;
  survivor_main?: BackendMain;
  killer_main?: BackendMain;
}

interface ShowcaseResponse extends ApiErrorBody {
  data?: BackendShowcase;
}

/** `{ characterId }` when the id is a number, nothing otherwise, so states without one stay free of the key. */
function characterIdField(id: unknown): { characterId?: number } {
  return typeof id === 'number' ? { characterId: id } : {};
}

export function mapBackendToShowcaseState(raw: unknown): UserShowcaseState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid showcase data payload');
  }
  const data = raw as BackendShowcase;

  const sPerks = Array.isArray(data.survivor_main?.perk_ids) ? data.survivor_main.perk_ids : [];
  const kPerks = Array.isArray(data.killer_main?.perk_ids) ? data.killer_main.perk_ids : [];

  // One set of defaults and bounds (DEFAULT_SHOWCASE_STATE, 0-99 / 0-100), the same ones the
  // backend and `mergeShowcaseState` use; this used to fall back to a title the picker doesn't offer.
  const D = DEFAULT_SHOWCASE_STATE;
  const bounded = (value: unknown, max: number, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : fallback;
  return {
    playerTitle:
      typeof data.player_title === 'string' && (PLAYER_TITLES as readonly string[]).includes(data.player_title)
        ? data.player_title
        : D.playerTitle,
    devotionLevel: bounded(data.devotion_level, 99, D.devotionLevel),
    gradeRank:
      typeof data.grade_rank === 'string' && (GRADE_EMBLEMS as readonly string[]).includes(data.grade_rank)
        ? data.grade_rank
        : D.gradeRank,
    survivorMain: {
      characterName: data.survivor_main?.character_name || D.survivorMain.characterName,
      ...characterIdField(data.survivor_main?.character_id),
      prestige: bounded(data.survivor_main?.prestige, 100, D.survivorMain.prestige),
      perkIds: [0, 1, 2, 3].map((i) => (typeof sPerks[i] === 'number' ? sPerks[i] : null)),
    },
    killerMain: {
      characterName: data.killer_main?.character_name || D.killerMain.characterName,
      ...characterIdField(data.killer_main?.character_id),
      prestige: bounded(data.killer_main?.prestige, 100, D.killerMain.prestige),
      perkIds: [0, 1, 2, 3].map((i) => (typeof kPerks[i] === 'number' ? kPerks[i] : null)),
    },
  };
}

/** The backend prefers `character_id` over the name, which may be a translation it has no row for. */
function backendCharacterIdField(id: number | undefined): { character_id?: number } {
  return id === undefined ? {} : { character_id: id };
}

export function mapShowcaseStateToBackend(state: UserShowcaseState): Record<string, unknown> {
  return {
    player_title: state.playerTitle,
    devotion_level: state.devotionLevel,
    grade_rank: state.gradeRank,
    survivor_main: {
      character_name: state.survivorMain.characterName,
      ...backendCharacterIdField(state.survivorMain.characterId),
      prestige: state.survivorMain.prestige,
      perk_ids: state.survivorMain.perkIds,
    },
    killer_main: {
      character_name: state.killerMain.characterName,
      ...backendCharacterIdField(state.killerMain.characterId),
      prestige: state.killerMain.prestige,
      perk_ids: state.killerMain.perkIds,
    },
  };
}

export async function fetchUserShowcase(
  userId: number | string,
  signal?: AbortSignal
): Promise<UserShowcaseState> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...authHeaders(token),
  };

  // Self or admin only: the session cookie has to go with it.
  const res = await fetch(`${apiBase()}/api/v1/users/${userId}/showcase?_t=${Date.now()}`, {
    headers,
    credentials: 'include',
    signal,
  });

  let data: ShowcaseResponse = {};
  try {
    data = (await res.json()) as ShowcaseResponse;
  } catch {
    // Empty or non-JSON body
  }

  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to fetch showcase', res.status, data.error_code);
  }

  return mapBackendToShowcaseState(data.data);
}

export async function updateUserShowcaseApi(
  userId: number | string,
  state: UserShowcaseState,
  signal?: AbortSignal
): Promise<UserShowcaseState> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const payload = mapShowcaseStateToBackend(state);

  const res = await fetch(`${apiBase()}/api/v1/users/${userId}/showcase`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
    signal,
  });

  let data: ShowcaseResponse = {};
  try {
    data = (await res.json()) as ShowcaseResponse;
  } catch {
    // Empty or non-JSON body
  }

  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to update showcase', res.status, data.error_code);
  }

  return mapBackendToShowcaseState(data.data);
}
