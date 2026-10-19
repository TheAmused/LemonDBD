// frontend/src/__tests__/unit/nsfwOnboardingFlow.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_NSFW_KEY,
  getGlobalNsfwPreference,
  setGlobalNsfwPreference,
  hasSeenNsfwOnboarding,
  markNsfwOnboardingComplete,
} from '@/utils/nsfwAck';
import fs from 'node:fs';
import path from 'node:path';

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

  it('TierListCreator uses Switch components instead of Checkbox for official and published options', () => {
    const creatorPath = path.resolve(__dirname, '../../components/tier-lists/creator/TierListCreator.tsx');
    const source = fs.readFileSync(creatorPath, 'utf8');
    assert.ok(!source.includes('Checkbox'), 'TierListCreator should not import or use Checkbox');
    assert.ok(source.includes("ariaLabel={c.official}"), 'Official switch must be present');
    assert.ok(source.includes("ariaLabel={c.publishedLabel}"), 'Published switch must be present');
  });

  it('ItemSources catalog container allows natural multi-line wrapping and page scroll with no horizontal scroll', () => {
    const itemSourcesPath = path.resolve(__dirname, '../../components/tier-lists/creator/ItemSources.tsx');
    const source = fs.readFileSync(itemSourcesPath, 'utf8');
    assert.ok(source.includes('overflow-x-hidden'), 'Catalog container must enforce overflow-x-hidden');
    assert.ok(!source.includes('max-h-120'), 'Fixed max-height clamping must be removed');
  });

  it('EffectsPreferenceModal includes global NSFW switch row', () => {
    const modalPath = path.resolve(__dirname, '../../components/smash-or-pass/prefs/EffectsPreferenceModal.tsx');
    const source = fs.readFileSync(modalPath, 'utf8');
    assert.ok(source.includes('useGlobalNsfwPreference'), 'EffectsPreferenceModal must use useGlobalNsfwPreference');
    assert.ok(source.includes('label={text.nsfw'), 'EffectsPreferenceModal must render NSFW choice row');
  });

  it('NsfwOnboardingModal is wired with shared primitives and global NSFW preference', () => {
    const modalPath = path.resolve(__dirname, '../../components/common/NsfwOnboardingModal.tsx');
    const source = fs.readFileSync(modalPath, 'utf8');
    assert.ok(source.includes('useGlobalNsfwPreference'), 'NsfwOnboardingModal must use useGlobalNsfwPreference');
    assert.ok(source.includes('markNsfwOnboardingComplete'), 'NsfwOnboardingModal must call markNsfwOnboardingComplete');
  });
});
