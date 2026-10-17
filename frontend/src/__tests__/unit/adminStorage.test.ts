// frontend/src/__tests__/unit/adminStorage.test.ts
// The admin panel's remembered choices live in one list (components/admin/adminStorage.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ADMIN_STORAGE,
  BUG_REPORT_FILTERS,
  CONTENT_REPORT_FILTERS,
  USER_ROLE_FILTERS,
  USER_STANDING_FILTERS,
  adminQueueDrawerKey,
  adminToolDrawerKey,
  oneOf,
} from '@/components/admin/adminStorage';

const ADMIN_DIR = path.join(process.cwd(), 'src/components/admin');

test('admin storage: every key is unique and namespaced', () => {
  const keys = Object.values(ADMIN_STORAGE);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) assert.match(key, /^lemondbd_(admin|moderation)_[a-z_]+$/);
  assert.notEqual(adminQueueDrawerKey('bugs', 'list'), adminQueueDrawerKey('bugs', 'case'));
  assert.notEqual(adminToolDrawerKey('a'), adminToolDrawerKey('b'));
});

test('admin storage: a stale stored value is ignored by the validators', () => {
  const isRole = oneOf(USER_ROLE_FILTERS);
  assert.ok(isRole('admin'));
  assert.ok(!isRole('moderator'));
  assert.ok(oneOf(USER_STANDING_FILTERS)('banned'));
  assert.ok(oneOf(BUG_REPORT_FILTERS)('in_progress'));
  assert.ok(!oneOf(BUG_REPORT_FILTERS)('expired'));
  assert.ok(oneOf(CONTENT_REPORT_FILTERS)('expired'));
});

test('admin storage: no component types a storage key of its own', () => {
  const offenders = fs
    .readdirSync(ADMIN_DIR)
    .filter((f) => /\.(ts|tsx)$/.test(f) && f !== 'adminStorage.ts')
    .filter((f) => /['"`]lemondbd_(admin|moderation)_/.test(fs.readFileSync(path.join(ADMIN_DIR, f), 'utf8')));
  assert.deepEqual(offenders, []);
});

test('admin storage: sensitive choices are not remembered', () => {
  const keys = Object.keys(ADMIN_STORAGE).join(' ');
  assert.doesNotMatch(keys, /search|selected|images|email/i);
});
