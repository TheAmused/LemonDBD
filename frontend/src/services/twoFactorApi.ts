'use client';
// frontend/src/services/twoFactorApi.ts
//
// Client for the optional two-factor sign-in endpoints. Errors are normalised into ApiError
// (status + the backend's `error_code`) so callers can show a localized message.

import { getBackendBaseUrl } from '@/utils/perkUtils';
import { ApiError, authHeaders, type ApiErrorBody } from '@/utils/api';

export interface TwoFactorStatus {
  /** False when the server has no encryption key configured. */
  available: boolean;
  enabled: boolean;
  enabled_at: string | null;
  recovery_codes_remaining: number;
}

export interface TwoFactorSetup {
  /** Base32 key to type into an authenticator app by hand. */
  secret: string;
  /** otpauth:// URI that goes into the QR code. */
  otpauth_uri: string;
}

async function call<T extends object>(path: string, method: 'GET' | 'POST', body?: object): Promise<T> {
  const res = await fetch(`${getBackendBaseUrl()}/api/v1/auth/two-factor${path}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: { ...authHeaders(undefined, { json: body !== undefined }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: (ApiErrorBody & Partial<T>) | undefined;
  try {
    data = (await res.json()) as ApiErrorBody & Partial<T>;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    throw new ApiError(data?.error ?? 'Two-factor request failed.', res.status, data?.error_code);
  }
  return (data ?? {}) as T;
}

export const fetchTwoFactorStatus = () => call<TwoFactorStatus>('', 'GET');

export const startTwoFactorSetup = (password: string) => call<TwoFactorSetup>('/setup', 'POST', { password });

export async function enableTwoFactor(code: string): Promise<string[]> {
  const data = await call<{ recovery_codes: string[] }>('/enable', 'POST', { code });
  return data.recovery_codes;
}

export const disableTwoFactor = (password: string, code: string) =>
  call<object>('/disable', 'POST', { password, code });

export async function regenerateRecoveryCodes(password: string, code: string): Promise<string[]> {
  const data = await call<{ recovery_codes: string[] }>('/recovery-codes', 'POST', { password, code });
  return data.recovery_codes;
}
