// frontend/src/__tests__/unit/skipOnboardingModal.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { SkipOnboardingModal } from '@/components/onboarding/SkipOnboardingModal';

test('SkipOnboardingModal is exported as a function component', () => {
  assert.strictEqual(typeof SkipOnboardingModal, 'function');
});
