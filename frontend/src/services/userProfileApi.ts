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

const TOKEN_KEY = 'lemondbd_token';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || '';
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
  const token = getToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const res = await fetch(
    `${apiBase()}/api/v1/bug-reports/my?page=${page}&per_page=${perPage}&_t=${Date.now()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
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
  const token = getToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const res = await fetch(`${apiBase()}/api/v1/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  const token = getToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch(`${apiBase()}/api/v1/auth/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to upload avatar.', res.status, data.error_code);
  }
  return data;
}

export async function resetAvatar(): Promise<any> {
  const token = getToken();
  if (!token) {
    throw new ApiError('Authentication token missing.', 401, 'authTokenMissing');
  }

  const res = await fetch(`${apiBase()}/api/v1/auth/avatar`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data.error || 'Failed to reset avatar.', res.status, data.error_code);
  }
  return data;
}
