// frontend/src/__tests__/unit/authModalVerificationFlow.test.ts
import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('AuthModal Email Verification Flow', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/AuthModal.tsx'),
    'utf-8'
  );

  it('checks if user is_verified after registration', () => {
    assert.ok(
      source.includes('!res.user.is_verified'),
      'AuthModal must check if res.user is unverified before setting verification notice'
    );
  });

  it('redirects auto-verified registered user to /welcome when onboarding is incomplete', () => {
    assert.ok(
      source.includes('!res.user.onboarding_completed_at') &&
      source.includes('router.push(`/${locale}/welcome`)'),
      'AuthModal must route auto-verified users to welcome page when onboarding is not completed'
    );
  });
});
