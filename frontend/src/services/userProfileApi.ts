'use client';
// frontend/src/services/userProfileApi.ts
//
// Centralizes the fetch calls the /user page makes (bug reports, profile
// update, avatar upload/reset) so the page component stays focused on
// rendering. Every function:
//  - reads the auth token consistently
//  - accepts an AbortSignal so in-flight requests can be cancelled
//    (prevents a slow stale response from clobbering a newer one)
//  - normalizes errors into a small ApiError so callers can map
//    `error_code` to a localized dictionary string.

import type { UserBugReport } from '@/types/userProfile';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { ApiError, authHeaders, getAuthToken, type ApiErrorBody } from '@/utils/api';
import { downloadFile } from '@/utils/download';

export { ApiError };

function apiBase(): string {
  return getBackendBaseUrl();
}

async function parseJsonSafely<T extends object = object>(res: Response): Promise<ApiErrorBody & Partial<T>> {
  try {
    return (await res.json()) as ApiErrorBody & Partial<T>;
  } catch {
    return {};
  }
}

export interface MyBugReportsPage {
  reports: UserBugReport[];
  total: number;
  unreadCount: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function fetchMyBugReports(
  page = 1,
  perPage = 10,
  signal?: AbortSignal
): Promise<MyBugReportsPage> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const res = await fetch(
    `${apiBase()}/api/v1/bug-reports/my?page=${page}&per_page=${perPage}&_t=${Date.now()}`,
    {
      headers: {
        ...authHeaders(token),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      signal,
    }
  );

  const data = await parseJsonSafely<{
    reports: UserBugReport[];
    total: number;
    unread_count: number;
    page: number;
    per_page: number;
    total_pages: number;
  }>(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to fetch bug reports.', res.status, data.error_code);
  }

  return {
    reports: data.reports || [],
    total: data.total ?? (data.reports || []).length,
    unreadCount: data.unread_count ?? 0,
    page: data.page ?? page,
    perPage: data.per_page ?? perPage,
    totalPages: data.total_pages ?? 1,
  };
}

export async function markBugReportSeen(reportId: number): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const res = await fetch(`${apiBase()}/api/v1/bug-reports/${reportId}/seen`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await parseJsonSafely(res);
    throw new ApiError(data.error || 'Failed to mark the bug report as seen.', res.status, data.error_code);
  }
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
  new_password?: string;
  /** Required by the server whenever `email` changes or `new_password` is set. */
  current_password?: string;
  /** Needed as well when the account has two-factor sign-in on (the server answers `two_factor_required`). */
  two_factor_code?: string;
}

export interface UpdateProfileResult {
  /** An email change left the account unverified: a code was sent to the new address. */
  verificationRequired: boolean;
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResult> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const res = await fetch(`${apiBase()}/api/v1/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafely<{ verification_required: boolean }>(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to update profile.', res.status, data.error_code);
  }
  return { verificationRequired: data.verification_required === true };
}

export async function uploadAvatar(file: File): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch(`${apiBase()}/api/v1/auth/avatar`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to upload avatar.', res.status, data.error_code);
  }
}

/**
 * Downloads everything the server holds about one account as a JSON file.
 *
 * One function, two targets: with no `userId` it is the signed-in user's own
 * data (`/auth/account/export`); with a `userId` it is an admin fetching that
 * user's data (`/users/<id>/export`). The server builds the same file for both
 * and never includes password hashes or one-time codes.
 */
export async function downloadAccountData(userId?: number): Promise<void> {
  const path = userId === undefined ? '/api/v1/auth/account/export' : `/api/v1/users/${userId}/export`;
  const res = await fetch(`${apiBase()}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) {
    const data = await parseJsonSafely(res);
    throw new ApiError(data.error || 'Failed to export data.', res.status, data.error_code);
  }
  // The server names the file; the fallback covers a cross-origin API that does not expose the header.
  const serverName = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1];
  const filename = serverName ?? (userId === undefined ? 'lemondbd-my-data.json' : `lemondbd-user-${userId}-data.json`);
  downloadFile(await res.blob(), filename, 'application/json');
}

/** Permanently deletes the signed-in account; the server re-checks the password. */
export async function deleteAccount(
  password: string,
  twoFactorCode?: string,
  googleCredential?: string
): Promise<void> {
  const res = await fetch(`${apiBase()}/api/v1/auth/account`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      password,
      ...(twoFactorCode ? { two_factor_code: twoFactorCode } : {}),
      ...(googleCredential ? { google_credential: googleCredential } : {}),
    }),
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to delete account.', res.status, data.error_code);
  }
}
