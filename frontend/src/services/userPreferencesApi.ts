// frontend/src/services/userPreferencesApi.ts
import { getBackendBaseUrl, authHeaders } from '@/utils/api';

export interface RemoteUserPreferences {
  effects: boolean;
  sounds: boolean;
  music: boolean;
  nsfw: boolean;
  background_animation: 'on' | 'eco' | 'off';
  chosen_at: number;
}

/**
 * Fetches user preferences from the database.
 * Returns null if the user is unauthenticated, network fails, or no preferences are saved yet.
 */
export async function fetchUserPreferences(token?: string | null): Promise<RemoteUserPreferences | null> {
  try {
    const base = getBackendBaseUrl();
    const res = await fetch(`${base}/api/v1/user/preferences`, {
      method: 'GET',
      credentials: 'include',
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: RemoteUserPreferences | null };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Saves user preferences to the database via PUT /api/v1/user/preferences.
 */
export async function saveUserPreferences(
  prefs: RemoteUserPreferences,
  token?: string | null
): Promise<void> {
  try {
    const base = getBackendBaseUrl();
    await fetch(`${base}/api/v1/user/preferences`, {
      method: 'PUT',
      credentials: 'include',
      headers: authHeaders(token, { json: true }),
      body: JSON.stringify(prefs),
    });
  } catch {
    // Network or storage failure ignored on background sync
  }
}
