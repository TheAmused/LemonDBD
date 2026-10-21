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
    assert.ok(source.includes("<LabeledSwitch checked={official} onChange={setOfficial} label={c.official} />"), 'Official switch must be present');
    assert.ok(source.includes("label={c.publishedLabel}"), 'Published switch must be present');
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

  it('ItemSources implements enlarged catalog items, bounded vertical scroll container, and lazy chunk rendering', () => {
    const itemSourcesPath = path.resolve(__dirname, '../../components/tier-lists/creator/ItemSources.tsx');
    const source = fs.readFileSync(itemSourcesPath, 'utf8');
    assert.ok(source.includes('size="lg"'), 'Catalog tiles must use size="lg"');
    assert.ok(source.includes('overflow-y-auto'), 'Catalog container must scroll down inside its block');
    assert.ok(source.includes('overflow-x-hidden'), 'Catalog container must not allow horizontal scroll');
    assert.ok(source.includes('IntersectionObserver'), 'Catalog items must be lazy loaded via IntersectionObserver');
    assert.ok(source.includes('CHUNK_SIZE'), 'Catalog items must render in manageable chunks');
  });

  it('TierItemTile supports size="lg" with enlarged shapes and readable text', () => {
    const tilePath = path.resolve(__dirname, '../../components/tier-lists/TierItemTile.tsx');
    const source = fs.readFileSync(tilePath, 'utf8');
    assert.ok(source.includes('LG_SHAPE_CLASSES'), 'TierItemTile must define LG_SHAPE_CLASSES');
    assert.ok(source.includes('LG_IMAGE_CLASSES'), 'TierItemTile must define LG_IMAGE_CLASSES');
    assert.ok(source.includes("size?: 'sm' | 'md' | 'lg'"), 'TierItemTile must accept size="lg"');
  });

  it('TierListCards disables dragging and right-click on cover banner thumbnails', () => {
    const cardsPath = path.resolve(__dirname, '../../components/tier-lists/TierListCards.tsx');
    const source = fs.readFileSync(cardsPath, 'utf8');
    assert.ok(source.includes('draggable={false}'), 'Card images must not be draggable');
    assert.ok(source.includes('onContextMenu='), 'Card images must prevent context menu');
  });
});
