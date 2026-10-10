// frontend/src/__tests__/unit/demoAccounts.test.ts
//
// The demo logins (lemon / user) are development-only: the backend lists them when it runs with
// FLASK_ENV=development, and the sign-in modal renders its quick-fill buttons only from that list.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseDemoAccounts } from '../../hooks/useDemoAccounts';

const authModal = fs.readFileSync(path.join(process.cwd(), 'src/components/AuthModal.tsx'), 'utf-8');

describe('parseDemoAccounts', () => {
  const account = { role: 'admin', username: 'a', password: 'b' };

  it('returns the accounts when the backend enables them', () => {
    assert.deepEqual(parseDemoAccounts({ enabled: true, accounts: [account] }), [account]);
  });

  it('returns nothing when disabled (production)', () => {
    assert.deepEqual(parseDemoAccounts({ enabled: false, accounts: [] }), []);
    assert.deepEqual(parseDemoAccounts({ enabled: false, accounts: [account] }), []);
  });

  it('ignores malformed bodies and malformed entries', () => {
    assert.deepEqual(parseDemoAccounts(null), []);
    assert.deepEqual(parseDemoAccounts('nope'), []);
    assert.deepEqual(parseDemoAccounts({ enabled: true }), []);
    assert.deepEqual(
      parseDemoAccounts({ enabled: true, accounts: [{ role: 'root', username: 'x', password: 'y' }, account, 5] }),
      [account]
    );
  });
});

describe('AuthModal demo shortcuts', () => {
  it('has no credentials in the source', () => {
    assert.ok(!/['"]lemon['"]/.test(authModal), 'no hardcoded lemon login');
    assert.ok(!/setPassword\(['"]/.test(authModal), 'no hardcoded password');
  });

  it('renders the quick-fill block only when the backend returned demo accounts', () => {
    assert.ok(authModal.includes('demoAccounts.length > 0'));
    assert.ok(authModal.includes('useDemoAccounts(isOpen)'));
  });
});
