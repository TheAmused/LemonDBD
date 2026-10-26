// frontend/src/__tests__/guards/passwordRuleParity.test.ts
//
// The minimum password length the forms ask for is the one the server enforces. The server's number is now an
// admin setting (Settings > Limits) that can only go up from this floor, and the register check reads it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MIN_PASSWORD_LENGTH } from '@/constants/validation';

const AUTH_SERVICE = path.resolve(__dirname, '../../../../backend/app/services/user/auth.py');
const SETTINGS_SPEC = path.resolve(__dirname, '../../../../backend/app/utils/site_settings_spec.py');

describe('password rule', () => {
  const source = fs.existsSync(AUTH_SERVICE) ? fs.readFileSync(AUTH_SERVICE, 'utf8') : null;
  const spec = fs.existsSync(SETTINGS_SPEC) ? fs.readFileSync(SETTINGS_SPEC, 'utf8') : null;

  it('is the floor of the backend setting', { skip: spec === null ? 'backend not present' : false }, () => {
    assert.match(spec as string, new RegExp(`_int_spec\\("password_min_length", "limits", ${MIN_PASSWORD_LENGTH},`));
  });

  it('is checked against the setting when registering and resetting', { skip: source === null ? 'backend not present' : false }, () => {
    assert.match(source as string, /len\(password\) < min_length\b/);
    assert.match(source as string, /len\(new_password\) < min_length\b/);
  });
});
