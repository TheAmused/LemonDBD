'use client';
// frontend/src/services/moderationApi.ts
//
// Client for the moderation endpoints: the admin's decisions about a user, and the account
// holder's acknowledgement of a warning. Errors are normalised into ApiError.

import { getBackendBaseUrl } from '@/utils/perkUtils';
import { ApiError, authHeaders, type ApiErrorBody } from '@/utils/api';
import {
  sanctionRequestBody,
  type AdminSanction,
  type SanctionDraft,
  type UserSanctions,
} from '@/types/moderation';

async function call<T extends object>(path: string, method: 'GET' | 'POST', body?: object): Promise<T> {
  const res = await fetch(`${getBackendBaseUrl()}/api/v1${path}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: authHeaders(undefined, { json: body !== undefined }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: (ApiErrorBody & Partial<T>) | undefined;
  try {
    data = (await res.json()) as ApiErrorBody & Partial<T>;
  } catch {
    data = undefined;
  }
  if (!res.ok) throw new ApiError(data?.error ?? 'Moderation request failed.', res.status, data?.error_code);
  return (data ?? {}) as T;
}

export const fetchUserSanctions = (userId: number) => call<UserSanctions>(`/admin/users/${userId}/sanctions`, 'GET');

export async function issueSanction(userId: number, draft: SanctionDraft): Promise<AdminSanction> {
  const data = await call<{ sanction: AdminSanction }>(`/admin/users/${userId}/sanctions`, 'POST', sanctionRequestBody(draft));
  return data.sanction;
}

export const revokeSanction = (sanctionId: number, reason: string) =>
  call<object>(`/admin/sanctions/${sanctionId}/revoke`, 'POST', { reason });

export const restoreAccount = (userId: number, reason: string) =>
  call<object>(`/admin/users/${userId}/restore`, 'POST', { reason });

/** The signed-in account holder confirms they have read one of their warnings. */
export const acknowledgeWarning = (sanctionId: number) =>
  call<object>(`/auth/sanctions/${sanctionId}/acknowledge`, 'POST');
