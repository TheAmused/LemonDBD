'use client';
// frontend/src/services/adminApi.ts
//
// The one client for the admin endpoints, on top of `apiRequest` (session cookie, no cache, ApiError
// carrying the server's own message so the admin toast shows what actually went wrong).

import { apiRequest } from '@/utils/api';
import type {
  AdminAuditLogPage,
  AdminBugReport,
  AdminBugReportList,
  AdminCharacterRow,
  AdminContentReportDetail,
  AdminContentReportList,
  AdminOverview,
  AdminPerkRow,
  AdminSiteSetting,
  ChallengeMode,
  ChallengeModeSetting,
  ContentReportAction,
  MaintenanceJob,
  MaintenanceRun,
  NewUser,
  Reauth,
  SystemCheck,
  UserChallengeProgress,
  UserPatch,
  UserRow,
} from '@/types/admin';

/* Overview */
export const fetchOverview = () => apiRequest<AdminOverview>('/admin/stats');

/* Users */
export const listUsers = (query: { page: number; per_page: number; search?: string; role?: string; standing?: string }) =>
  apiRequest<{ users: UserRow[]; total: number }>('/users', 'GET', undefined, query);
export const createUser = (user: NewUser) => apiRequest<{ user: UserRow }>('/users', 'POST', user);
export const updateUser = (id: number, patch: UserPatch) => apiRequest<{ user: UserRow }>(`/users/${id}`, 'PUT', patch);
export const deleteUser = (id: number) => apiRequest<object>(`/users/${id}`, 'DELETE');
/** `reauth` (the acting admin's own password and 2FA code) is required when the target is another admin. */
export const resetTwoFactor = (id: number, reauth?: Reauth) => apiRequest<object>(`/users/${id}/two-factor/reset`, 'POST', reauth);

export const listUserChallenges = (id: number) => apiRequest<{ challenges: UserChallengeProgress[] }>(`/users/${id}/challenges`);
/** Deletes the player's run and completions in one challenge (cheating) and emails them, with the admin's optional
 *  `note`; audited server-side. `emailed` is false when the reset went through but the email could not be sent. */
export const resetUserChallenge = (id: number, challenge: Pick<UserChallengeProgress, 'mode' | 'variant'>, note?: string) =>
  apiRequest<{ emailed: boolean }>(`/users/${id}/challenges/reset`, 'POST', { ...challenge, ...(note ? { note } : {}) });

/* Bug reports */
export const listBugReports = (query: { page: number; per_page: number; status?: string; search?: string }) =>
  apiRequest<AdminBugReportList>('/admin/bug-reports', 'GET', undefined, query);
export const updateBugReport = (id: number, patch: { status?: string; admin_notes?: string }) =>
  apiRequest<{ report: AdminBugReport }>(`/admin/bug-reports/${id}`, 'PUT', patch);
export const deleteBugReport = (id: number) => apiRequest<object>(`/admin/bug-reports/${id}`, 'DELETE');

/* Content reports */
export const listContentReports = (query: { page: number; per_page: number; status: string }) =>
  apiRequest<AdminContentReportList>('/admin/content-reports', 'GET', undefined, query);
export const fetchContentReport = (id: number) => apiRequest<AdminContentReportDetail>(`/admin/content-reports/${id}/preview`);
export const resolveContentReport = (id: number, action: ContentReportAction, extra: object) =>
  apiRequest<object>(`/admin/content-reports/${id}/resolve`, 'POST', { action, ...extra });

/* Availability */
export const listChallengeModes = () => apiRequest<{ modes: ChallengeModeSetting[] }>('/admin/challenge-modes');
export const setChallengeModeEnabled = (mode: ChallengeMode, isEnabled: boolean, reason: string | null) =>
  apiRequest<object>(`/admin/challenge-modes/${mode}`, 'PUT', { is_enabled: isEnabled, reason });
export const listCharacters = (role: 'Survivor' | 'Killer', search: string) =>
  apiRequest<{ data: AdminCharacterRow[] }>('/admin/characters', 'GET', undefined, { role, search });
export const listPerks = (role: 'Survivor' | 'Killer', search: string) =>
  apiRequest<{ data: AdminPerkRow[] }>('/admin/perks', 'GET', undefined, { category: role, search });
/** `role` is required: survivor 7 and killer 7 are different characters. */
export const setCharacterDisabled = (character: AdminCharacterRow, isDisabled: boolean, reason: string | null) =>
  apiRequest<object>(`/admin/characters/${character.id}/disable`, 'PUT', { is_disabled: isDisabled, role: character.role, reason });
export const setPerkDisabled = (perk: AdminPerkRow, isDisabled: boolean, reason: string | null) =>
  apiRequest<object>(`/admin/perks/${perk.id}/disable`, 'PUT', { is_disabled: isDisabled, reason });

/* Audit log */
export const listAuditLogs = (query: { page: number; per_page: number; target_type?: string }) =>
  apiRequest<AdminAuditLogPage>('/admin/audit-logs', 'GET', undefined, query);

/* Settings */
export const listSettings = () => apiRequest<{ settings: AdminSiteSetting[] }>('/admin/settings');
export interface SaveSettingsOptions {
  /** Required, with a reason, for a change that lowers a protection. */
  confirmRisky?: boolean;
  reason?: string;
}
export const saveSettings = (changes: Record<string, string | number | boolean | null>, options: SaveSettingsOptions = {}) =>
  apiRequest<{ settings: AdminSiteSetting[] }>('/admin/settings', 'PUT', {
    settings: changes,
    ...(options.confirmRisky ? { confirm_risky: true, reason: options.reason ?? '' } : {}),
  });

/* Tools */
export const fetchSystemChecks = () => apiRequest<{ checks: SystemCheck[] }>('/admin/system');
export const listMaintenanceJobs = () => apiRequest<{ jobs: MaintenanceJob[] }>('/admin/maintenance');
export const runMaintenanceJob = (key: string) =>
  apiRequest<{ key: string; affected: number; last_run: MaintenanceRun | null }>(`/admin/maintenance/${key}`, 'POST');
export const sendTestEmail = () => apiRequest<{ sent_to: string }>('/admin/diagnostics/email', 'POST');
export const sendTestDiscord = () => apiRequest<{ status: number }>('/admin/diagnostics/discord', 'POST');
