// frontend/src/__tests__/unit/authOnboarding.test.ts
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('AuthContext exposes onboarding fields and methods', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/context/AuthContext.tsx'),
    'utf-8'
  );
  assert.match(source, /onboarding_completed_at\?: string \| null;/);
  assert.match(source, /markOnboardingComplete: \(\) => Promise<boolean>;/);
  assert.match(
    source,
    /verifyEmail: \(email: string, code: string\) => Promise<\{ success: boolean; error\?: string; user\?: UserProfile \}>;/
  );
});
