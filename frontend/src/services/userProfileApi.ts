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
import { ApiError, authHeaders, getAuthToken } from '@/utils/api';

export { ApiError };

function apiBase(): string {
  return getBackendBaseUrl();
}

async function parseJsonSafely(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export interface MyBugReportsPage {
  reports: UserBugReport[];
  total: number;
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

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to fetch bug reports.', res.status, data.error_code);
  }

  return {
    reports: data.reports || [],
    total: data.total ?? (data.reports || []).length,
    page: data.page ?? page,
    perPage: data.per_page ?? perPage,
    totalPages: data.total_pages ?? 1,
  };
}

export interface UpdateProfilePayload {
  email?: string;
  new_password?: string;
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<any> {
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

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to update profile.', res.status, data.error_code);
  }
  return data;
}

export async function uploadAvatar(file: File): Promise<any> {
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
  return data;
}

/** Permanently deletes the signed-in account; the server re-checks the password. */
export async function deleteAccount(password: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api/v1/auth/account`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password }),
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to delete account.', res.status, data.error_code);
  }
}
