// frontend/src/__tests__/unit/onboarding/nsfwOnboardingFlow.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_NSFW_KEY,
  getGlobalNsfwPreference,
  setGlobalNsfwPreference,
  hasSeenNsfwOnboarding,
  markNsfwOnboardingComplete,
} from '@/utils/nsfwAck';

describe('NSFW Onboarding & Global Sync Flow', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (globalThis as Record<string, unknown>).window = {
      dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });

  it('initially reports onboarding incomplete when no preference or onboarding flag exists', () => {
    assert.equal(hasSeenNsfwOnboarding(), false);
    assert.equal(getGlobalNsfwPreference(), false);
  });

  it('marks onboarding complete when setting global preference', () => {
    setGlobalNsfwPreference(true);
    assert.equal(getGlobalNsfwPreference(), true);
    assert.equal(hasSeenNsfwOnboarding(), true);
  });

  it('respects existing global nsfw preference from prior sessions without re-prompting', () => {
    store.set(GLOBAL_NSFW_KEY, 'false');
    assert.equal(hasSeenNsfwOnboarding(), true);
  });

  it('markNsfwOnboardingComplete explicitly flags onboarding as completed', () => {
    markNsfwOnboardingComplete();
    assert.equal(hasSeenNsfwOnboarding(), true);
  });
});
