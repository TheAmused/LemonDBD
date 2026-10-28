// frontend/src/__tests__/unit/auth/demoAccounts.test.ts
//
// The demo logins (lemon / user) are development-only: the backend lists them when it runs with
// FLASK_ENV=development, and the sign-in modal renders its quick-fill buttons only from that list.
// (No credential is typed into the source: guards/securityRules.test.ts.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDemoAccounts } from '../../../hooks/useDemoAccounts';

describe('parseDemoAccounts', () => {
  const account = { role: 'admin', login: 'a', password: 'b' };

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
      parseDemoAccounts({ enabled: true, accounts: [{ role: 'root', login: 'x', password: 'y' }, account, 5] }),
      [account]
    );
  });
});
