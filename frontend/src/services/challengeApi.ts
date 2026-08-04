import {
  Role,
  UserSettings,
  RunResponse,
  SubmitResultResponse,
  SettingsResponse,
  StatsResponse,
} from '../types/challenge';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/challenges`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchActiveRun(role?: Role): Promise<RunResponse> {
  const url = role ? `${API_BASE}/run?role=${role}` : `${API_BASE}/run`;
  const response = await fetch(url);
  return handleResponse<RunResponse>(response);
}

export async function rollChallenge(role?: Role): Promise<RunResponse> {
  const response = await fetch(`${API_BASE}/roll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(role ? { role } : {}),
  });
  return handleResponse<RunResponse>(response);
}

export async function submitMatchResult(
  runId: number,
  result: 'win' | 'loss',
  role?: Role
): Promise<SubmitResultResponse> {
  const response = await fetch(`${API_BASE}/result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      run_id: runId,
      result,
      ...(role ? { role } : {}),
    }),
  });
  return handleResponse<SubmitResultResponse>(response);
}

export async function updateUserSettings(
  settings: Partial<UserSettings>
): Promise<SettingsResponse> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  return handleResponse<SettingsResponse>(response);
}

export async function fetchChallengeStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE}/stats`);
  return handleResponse<StatsResponse>(response);
}

export async function invalidateMatch(
  runId: number,
  reason: 'dc_before_5_gens' | 'game_cancelled'
): Promise<RunResponse> {
  const response = await fetch(`${API_BASE}/invalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      run_id: runId,
      reason,
    }),
  });
  return handleResponse<RunResponse>(response);
}

export async function fetchCharacterPool(
  role: string
): Promise<{ role: string; disabled_characters: string[]; disabled_names: string[] }> {
  const response = await fetch(`${API_BASE}/pool?role=${role}`);
  return handleResponse<{ role: string; disabled_characters: string[]; disabled_names: string[] }>(response);
}

export async function updateCharacterPool(
  role: string,
  disabledCharacters: string[]
): Promise<{ role: string; disabled_characters: string[]; disabled_names: string[] }> {
  const response = await fetch(`${API_BASE}/pool`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role,
      disabled_characters: disabledCharacters,
    }),
  });
  return handleResponse<{ role: string; disabled_characters: string[]; disabled_names: string[] }>(response);
}
