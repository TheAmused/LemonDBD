// frontend/src/__tests__/unit/onboardingStorage.test.ts
import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  getOnboardingStorageKey,
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  OnboardingStoredDraft,
} from '@/utils/onboardingStorage';

// Mock in-memory localStorage for node test runner
const memoryStore: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, val: string) => {
    memoryStore[key] = String(val);
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  },
  key: (i: number) => Object.keys(memoryStore)[i] ?? null,
  length: 0,
} as unknown as Storage;

describe('Onboarding LocalStorage Draft Persistence', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('generates user-scoped storage key and guest fallback', () => {
    assert.strictEqual(getOnboardingStorageKey(42), 'lemondbd_onboarding_draft_42');
    assert.strictEqual(getOnboardingStorageKey('user-abc'), 'lemondbd_onboarding_draft_user-abc');
    assert.strictEqual(getOnboardingStorageKey(undefined), 'lemondbd_onboarding_draft_guest');
    assert.strictEqual(getOnboardingStorageKey(null as any), 'lemondbd_onboarding_draft_guest');
  });

  it('saves and loads onboarding drafts faithfully', () => {
    const draft: Omit<OnboardingStoredDraft, 'updatedAt'> = {
      ownershipDraft: { 'survivor:1': true, 'killer:2': false },
      perkUnlockDraft: { 101: true, 102: false },
    };

    saveOnboardingDraft(123, draft);
    const loaded = loadOnboardingDraft(123);

    assert.ok(loaded);
    assert.deepStrictEqual(loaded.ownershipDraft, draft.ownershipDraft);
    assert.deepStrictEqual(loaded.perkUnlockDraft, draft.perkUnlockDraft);
    assert.ok(typeof loaded.updatedAt === 'number');
  });

  it('returns null when draft does not exist', () => {
    const loaded = loadOnboardingDraft(999);
    assert.strictEqual(loaded, null);
  });

  it('handles corrupted JSON in localStorage gracefully without throwing', () => {
    const key = getOnboardingStorageKey(555);
    localStorage.setItem(key, '{not valid json');
    const loaded = loadOnboardingDraft(555);
    assert.strictEqual(loaded, null);
  });

  it('clears saved draft on completion or skip', () => {
    saveOnboardingDraft(777, {
      ownershipDraft: { 'killer:1': true },
      perkUnlockDraft: {},
    });
    assert.ok(loadOnboardingDraft(777) !== null);

    clearOnboardingDraft(777);
    assert.strictEqual(loadOnboardingDraft(777), null);
  });
});
