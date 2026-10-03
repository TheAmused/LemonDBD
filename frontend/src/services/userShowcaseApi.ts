// frontend/src/services/userShowcaseApi.ts
'use client';

import { PLAYER_TITLES, type UserShowcaseState } from '@/types/userShowcase';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { ApiError, authHeaders, getAuthToken, type ApiErrorBody } from '@/utils/api';

function apiBase(): string {
  return getBackendBaseUrl();
}

interface BackendMain {
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

export function mapBackendToShowcaseState(raw: unknown): UserShowcaseState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid showcase data payload');
  }
  const data = raw as BackendShowcase;

  const sPerks = Array.isArray(data.survivor_main?.perk_ids) ? data.survivor_main.perk_ids : [];
  const kPerks = Array.isArray(data.killer_main?.perk_ids) ? data.killer_main.perk_ids : [];

  return {
    playerTitle:
      typeof data.player_title === 'string' && (PLAYER_TITLES as readonly string[]).includes(data.player_title)
        ? data.player_title
        : 'The Camper',
    devotionLevel: typeof data.devotion_level === 'number' ? Math.max(1, Math.min(99, data.devotion_level)) : 14,
    gradeRank: typeof data.grade_rank === 'string' && data.grade_rank ? data.grade_rank : 'Iridescent I',
    survivorMain: {
      characterName: data.survivor_main?.character_name || 'Feng Min',
      prestige: typeof data.survivor_main?.prestige === 'number' ? Math.max(1, Math.min(100, data.survivor_main.prestige)) : 9,
      perkIds: [0, 1, 2, 3].map((i) => (typeof sPerks[i] === 'number' ? sPerks[i] : null)),
    },
    killerMain: {
      characterName: data.killer_main?.character_name || 'The Blight',
      prestige: typeof data.killer_main?.prestige === 'number' ? Math.max(1, Math.min(100, data.killer_main.prestige)) : 7,
      perkIds: [0, 1, 2, 3].map((i) => (typeof kPerks[i] === 'number' ? kPerks[i] : null)),
    },
  };
}

export function mapShowcaseStateToBackend(state: UserShowcaseState): Record<string, unknown> {
  return {
    player_title: state.playerTitle,
    devotion_level: state.devotionLevel,
    grade_rank: state.gradeRank,
    survivor_main: {
      character_name: state.survivorMain.characterName,
      prestige: state.survivorMain.prestige,
      perk_ids: state.survivorMain.perkIds,
    },
    killer_main: {
      character_name: state.killerMain.characterName,
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

  const res = await fetch(`${apiBase()}/api/v1/users/${userId}/showcase?_t=${Date.now()}`, {
    headers,
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
