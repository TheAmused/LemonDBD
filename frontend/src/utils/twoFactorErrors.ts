// frontend/src/utils/twoFactorErrors.ts
//
// Maps the backend's two-factor `error_code`s to the dictionary's localized messages.
import type { Dictionary } from '@/locales/types';

export function twoFactorErrorMessage(t: Dictionary['twoFactor'], code?: string): string {
  switch (code) {
    case 'invalid_two_factor_code':
      return t.errInvalidCode;
    case 'two_factor_locked':
      return t.errLocked;
    case 'two_factor_challenge_invalid':
    case 'auth_required':
      return t.errChallengeExpired;
    case 'incorrect_password':
      return t.errIncorrectPassword;
    case 'two_factor_unavailable':
      return t.errUnavailable;
    default:
      return t.errGeneric;
  }
}
