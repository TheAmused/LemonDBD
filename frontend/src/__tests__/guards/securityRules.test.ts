// frontend/src/__tests__/guards/securityRules.test.ts
//
// Source rules with a security reason: what must never be written into the code.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('security rules', () => {
  it('the sign-in modal holds no demo credentials: they come from the backend, in development only', () => {
    const modal = read('components/AuthModal.tsx');
    assert.ok(!/['"]lemon['"]/.test(modal), 'no hardcoded lemon login');
    assert.ok(!/setPassword\(['"][^'"]/.test(modal), 'no hardcoded password');
  });

  it('the 2FA QR code is drawn locally: the secret is never sent anywhere', () => {
    assert.doesNotMatch(read('components/auth/QrCode.tsx'), /fetch\(|XMLHttpRequest|https?:\/\//);
  });
});
