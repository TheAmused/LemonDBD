// frontend/src/__tests__/unit/profileFormPayload.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import en from '@/locales/en';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), 'src', rel), 'utf8');

describe('UserProfileForm request body', () => {
  const form = read('components/user/UserProfileForm.tsx');

  it('sends the new password under the key the API reads (new_password), never `password`', () => {
    assert.match(form, /payload\.new_password\s*=\s*newPassword/);
    assert.doesNotMatch(form, /payload\.password\b/);
  });

  it('always attaches the current password to a change and refuses to send one without it', () => {
    assert.match(form, /payload\.current_password\s*=\s*currentPassword/);
    assert.match(form, /if \(!currentPassword\)/);
  });

  it('types the body with the shared UpdateProfilePayload so a wrong key fails the type-check', () => {
    assert.match(form, /const payload: UpdateProfilePayload = \{\}/);
    assert.match(read('services/userProfileApi.ts'), /current_password\?: string/);
  });

  it('has copy for the current-password field', () => {
    for (const key of ['currentPassword', 'currentPasswordHint', 'currentPasswordRequired', 'currentPasswordIncorrect'] as const) {
      assert.ok(en.user[key], `en.user.${key} is missing`);
    }
  });
});
