// frontend/src/services/smashApi.ts
import {
  RosterItem,
  FeedResponse,
  VoteType,
  VoteResponse,
  LeaderboardItem,
  SmashFilterOptions,
  SmashLeaderboardOptions,
} from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';

const SESSION_KEY = 'smash_session_id';

/**
 * Retrieves the persistent unique session ID for the current client,
 * or generates and stores a new one in localStorage if not already present.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'ssr_smash_session';
  }

  try {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        sessionId = `sess_${crypto.randomUUID()}`;
      } else {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return 'fallback_smash_session';
  }
}

/**
 * Standardized response handler with JSON parsing and error propagation.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.error ||
      errorData.message ||
      `HTTP Error ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
}

/**
 * Fetch all available active rosters from the backend database.
 */
export async function fetchRosters(activeOnly: boolean = true): Promise<RosterItem[]> {
  const backendBase = getBackendBaseUrl();
  const url = `${backendBase}/api/v1/smash-or-pass/rosters?active_only=${activeOnly}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Session-ID': getSessionId(),
    },
    cache: 'no-store',
  });
  const data = await handleResponse<{ data: RosterItem[]; count: number }>(response);
  return data.data || [];
}

/**
 * Fetch the unvoted candidate feed for a specific roster and session.
 */
export async function fetchRosterFeed(
  slug: string,
  options?: SmashFilterOptions
): Promise<FeedResponse> {
  const backendBase = getBackendBaseUrl();
  const sessionId = getSessionId();

  const params = new URLSearchParams();
  params.set('session_id', sessionId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.role && options.role !== 'all') params.set('role', options.role);
  if (options?.gender && options.gender !== 'all') params.set('gender', options.gender);

  const url = `${backendBase}/api/v1/smash-or-pass/rosters/${encodeURIComponent(slug)}/feed?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Session-ID': sessionId,
    },
    cache: 'no-store',
  });

  const data = await handleResponse<{ data: FeedResponse }>(response);
  return data.data;
}

/**
 * Cast a vote (smash, pass, super_smash) for an entity.
 */
export async function castVote(
  entityId: string,
  voteType: VoteType,
  characterSlug?: string
): Promise<VoteResponse> {
  const backendBase = getBackendBaseUrl();
  const sessionId = getSessionId();

  const payload: Record<string, any> = {
    entity_id: entityId,
    vote_type: voteType,
    session_id: sessionId,
  };
  if (characterSlug) {
    payload.character_slug = characterSlug;
  }

  const response = await fetch(`${backendBase}/api/v1/smash-or-pass/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<VoteResponse>(response);
}

/**
 * Fetch ranked leaderboard statistics for a specific roster.
 */
export async function fetchLeaderboard(
  slug: string,
  options?: SmashLeaderboardOptions
): Promise<LeaderboardItem[]> {
  const backendBase = getBackendBaseUrl();
  const params = new URLSearchParams();
  params.set('sort_by', options?.sortBy || 'smash_rate');
  params.set('limit', String(options?.limit || 100));
  if (options?.role && options.role !== 'all') params.set('role', options.role);
  if (options?.gender && options.gender !== 'all') params.set('gender', options.gender);

  const url = `${backendBase}/api/v1/smash-or-pass/rosters/${encodeURIComponent(slug)}/leaderboard?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Session-ID': getSessionId(),
    },
    cache: 'no-store',
  });

  const data = await handleResponse<{ data: LeaderboardItem[]; count: number; roster: string }>(response);
  return data.data || [];
}

/**
 * Reset and unwind votes cast within the current session.
 */
export async function resetSessionVotes(
  slug?: string
): Promise<{ status: string; reset_count: number }> {
  const backendBase = getBackendBaseUrl();
  const sessionId = getSessionId();

  const payload: Record<string, any> = {
    session_id: sessionId,
  };
  if (slug) {
    payload.roster_slug = slug;
  }

  const response = await fetch(`${backendBase}/api/v1/smash-or-pass/session/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify(payload),
  });

  const result = await handleResponse<{ status: string; data?: { status: string; reset_count: number }; reset_count?: number }>(response);
  if (result.data) {
    return result.data;
  }
  return {
    status: result.status || 'success',
    reset_count: result.reset_count ?? 0,
  };
}

/**
 * Reset votes for an authenticated user account across all or a specific roster.
 */
export async function resetUserVotes(
  slug?: string
): Promise<{ status: string; reset_count: number }> {
  const backendBase = getBackendBaseUrl();
  const payload: Record<string, any> = {};
  if (slug) {
    payload.roster_slug = slug;
  }

  const response = await fetch(`${backendBase}/api/v1/smash-or-pass/user-votes/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Session-ID': getSessionId(),
    },
    body: JSON.stringify(payload),
  });

  const result = await handleResponse<{ status: string; data?: { status: string; reset_count: number }; reset_count?: number }>(response);
  if (result.data) {
    return result.data;
  }
  return {
    status: result.status || 'success',
    reset_count: result.reset_count ?? 0,
  };
}

/**
 * Fetch dynamic key-value translations dictionary from the backend for the given locale.
 */
export async function fetchDynamicTranslations(locale: string): Promise<Record<string, string>> {
  const backendBase = getBackendBaseUrl();
  const url = `${backendBase}/api/v1/smash-or-pass/translations?locale=${encodeURIComponent(locale)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    const data = await handleResponse<{ data: Record<string, string>; locale: string }>(response);
    return data.data || {};
  } catch (err) {
    console.warn(`Could not fetch dynamic translations for locale '${locale}':`, err);
    return {};
  }
}
