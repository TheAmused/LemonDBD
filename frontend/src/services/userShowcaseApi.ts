// frontend/src/services/userShowcaseApi.ts
'use client';

import { PLAYER_TITLES, type UserShowcaseState } from '@/types/userShowcase';
import { getBackendBaseUrl } from '@/utils/perkUtils';

const TOKEN_KEY = 'lemondbd_token';

export class ShowcaseApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ShowcaseApiError';
    this.status = status;
    this.code = code;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function apiBase(): string {
  return getBackendBaseUrl();
}

export function mapBackendToShowcaseState(data: any): UserShowcaseState {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid showcase data payload');
  }

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

export function mapShowcaseStateToBackend(state: UserShowcaseState): Record<string, any> {
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
  const token = getToken();
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiBase()}/api/v1/users/${userId}/showcase?_t=${Date.now()}`, {
    headers,
    signal,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // Empty or non-JSON body
  }

  if (!res.ok) {
    throw new ShowcaseApiError(data.error || 'Failed to fetch showcase', res.status, data.error_code);
  }

  return mapBackendToShowcaseState(data.data);
}

export async function updateUserShowcaseApi(
  userId: number | string,
  state: UserShowcaseState,
  signal?: AbortSignal
): Promise<UserShowcaseState> {
  const token = getToken();
  if (!token) {
    throw new ShowcaseApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const payload = mapShowcaseStateToBackend(state);

  const res = await fetch(`${apiBase()}/api/v1/users/${userId}/showcase`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // Empty or non-JSON body
  }

  if (!res.ok) {
    throw new ShowcaseApiError(data.error || 'Failed to update showcase', res.status, data.error_code);
  }

  return mapBackendToShowcaseState(data.data);
}
