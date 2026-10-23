'use client';
// frontend/src/components/admin/ReauthFields.tsx
//
// The acting admin's own password, plus a code from their authenticator app when their account has
// two-factor sign-in. The server asks for both before anything that grants admin rights or rewrites
// the database in bulk (backend core/reauth.py): a stolen session cookie has neither.
import React, { useId } from 'react';
import { FormField, Input } from '@/components/common/Field';
import { useOptionalAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import type { Reauth } from '@/types/admin';

export const EMPTY_REAUTH: Reauth = { current_password: '' };

/** True once everything the server will ask for is filled in. */
export function useReauthReady(value: Reauth): boolean {
  const user = useOptionalAuth()?.user;
  return value.current_password !== '' && (!user?.two_factor_enabled || (value.two_factor_code ?? '').trim() !== '');
}

/** The request fields, without an empty code. */
export function reauthBody(value: Reauth): Reauth {
  const code = (value.two_factor_code ?? '').trim();
  return code ? { current_password: value.current_password, two_factor_code: code } : { current_password: value.current_password };
}

interface ReauthFieldsProps {
  value: Reauth;
  onChange: (next: Reauth) => void;
  /** Why the password is asked for, shown under the field. */
  hint: string;
  disabled?: boolean;
}

export function ReauthFields({ value, onChange, hint, disabled }: ReauthFieldsProps) {
  const t = useDictionary().admin;
  const user = useOptionalAuth()?.user;
  const ids = useId();
  return (
    <div className="space-y-3 text-left">
      <FormField label={t.confirmOwnPasswordLabel} htmlFor={`${ids}-password`} hint={hint}>
        <Input
          id={`${ids}-password`}
          type="password"
          required
          autoComplete="current-password"
          value={value.current_password}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, current_password: e.target.value })}
        />
      </FormField>
      {user?.two_factor_enabled && (
        <FormField label={t.confirmOwnTwoFactorLabel} htmlFor={`${ids}-code`}>
          <Input
            id={`${ids}-code`}
            inputMode="numeric"
            required
            autoComplete="one-time-code"
            maxLength={64}
            value={value.two_factor_code ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, two_factor_code: e.target.value })}
          />
        </FormField>
      )}
    </div>
  );
}
