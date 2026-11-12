// frontend/src/__tests__/unit/analytics/analyticsOnboarding.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { OnboardingCharacter } from '@/components/onboarding/CharacterOnboardingWizardParts';
import { buildOnboardingCompleteProps } from '@/components/onboarding/onboardingTracking';
import { ownershipKey } from '@/utils/characterUtils';

function character(overrides: Partial<OnboardingCharacter>): OnboardingCharacter {
  return {
    id: 1,
    name: 'Dwight',
    role: 'Survivor',
    category: 'Survivor',
    chapter_name: null,
    release_number: null,
    release_date: null,
    is_owned: false,
    is_free: false,
    ...overrides,
  };
}

describe('buildOnboardingCompleteProps', () => {
  it('counts nothing for a visitor who owns no paid character', () => {
    assert.deepEqual(buildOnboardingCompleteProps([character({}), character({ id: 2 })], {}), { characters_owned: 0 });
  });

  it('leaves out free characters, which everyone owns', () => {
    const free = character({ id: 3, is_free: true, is_owned: true });
    assert.deepEqual(buildOnboardingCompleteProps([free], {}), { characters_owned: 0 });
  });

  it('counts a character marked as owned in the draft', () => {
    const picked = character({ id: 4 });
    const draft = { [ownershipKey(4, 'Survivor')]: true };
    assert.deepEqual(buildOnboardingCompleteProps([picked, character({ id: 5 })], draft), { characters_owned: 1 });
  });

  it('lets the draft take a character back, and falls back to the saved state without a draft entry', () => {
    const wasOwned = character({ id: 6, is_owned: true });
    const kept = character({ id: 7, is_owned: true });
    const draft = { [ownershipKey(6, 'Survivor')]: false };
    assert.deepEqual(buildOnboardingCompleteProps([wasOwned, kept], draft), { characters_owned: 1 });
  });
});
