'use client';
// frontend/src/services/moderationApi.ts
//
// Client for the moderation endpoints: the admin's decisions about a user, and the account
// holder's acknowledgement of a warning. Errors are normalised into ApiError.

import { apiRequest } from '@/utils/api';
import {
  sanctionPreviewBody,
  sanctionRequestBody,
  type AdminSanction,
  type SanctionDraft,
  type SanctionPreview,
  type SanctionTarget,
  type UserSanctions,
} from '@/types/moderation';

export const fetchUserSanctions = (userId: number) => apiRequest<UserSanctions>(`/admin/users/${userId}/sanctions`, 'GET');

export async function issueSanction(userId: number, draft: SanctionDraft): Promise<AdminSanction> {
  const data = await apiRequest<{ sanction: AdminSanction }>(`/admin/users/${userId}/sanctions`, 'POST', sanctionRequestBody(draft));
  return data.sanction;
}

/** What the decision would tell its account holder (the email, in their language); nothing is saved. */
export const previewSanction = (draft: SanctionDraft, target: SanctionTarget) =>
  apiRequest<SanctionPreview>('/admin/sanctions/preview', 'POST', sanctionPreviewBody(draft, target));

export const revokeSanction = (sanctionId: number, reason: string) =>
  apiRequest<object>(`/admin/sanctions/${sanctionId}/revoke`, 'POST', { reason });

export const restoreAccount = (userId: number, reason: string) =>
  apiRequest<object>(`/admin/users/${userId}/restore`, 'POST', { reason });

/** The signed-in account holder confirms they have read one of their warnings. */
export const acknowledgeWarning = (sanctionId: number) =>
  apiRequest<object>(`/auth/sanctions/${sanctionId}/acknowledge`, 'POST');
