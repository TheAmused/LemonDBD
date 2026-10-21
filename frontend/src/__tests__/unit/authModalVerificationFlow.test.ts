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
    const helper = source.slice(source.indexOf('const closeSignedIn ='), source.indexOf('const switchMode ='));
    assert.ok(
      helper.includes('!signedIn.onboarding_completed_at') &&
      helper.includes('router.push(`/${locale}/welcome`)'),
      'closeSignedIn must route users who have not finished onboarding to the welcome page'
    );
    const registerBranch = source.slice(source.indexOf('await register('), source.indexOf('registrationFailed'));
    assert.ok(registerBranch.includes('closeSignedIn(res.user)'), 'a verified sign-up goes through closeSignedIn');
  });
});
