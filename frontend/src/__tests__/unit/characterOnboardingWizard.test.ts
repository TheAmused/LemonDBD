// frontend/src/__tests__/unit/characterOnboardingWizard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';
import {
  groupCharactersByChapter,
  normalizeChapterKey,
  detectDefaultLanguage,
} from '@/components/onboarding/CharacterOnboardingWizard';
import type { OnboardingCharacter } from '@/components/onboarding/CharacterOnboardingWizard';

test('CharacterOnboardingWizard is exported as a function component', () => {
  assert.strictEqual(typeof CharacterOnboardingWizard, 'function');
});

test('groupCharactersByChapter groups and orders by release_number', () => {
  const chars: OnboardingCharacter[] = [
    { id: 3, name: 'C', chapter_name: 'Chapter Two', release_number: 2, is_owned: false, is_free: false, role: 'Killer', category: 'Killer' },
    { id: 1, name: 'A', chapter_name: 'Base Game', release_number: 1, is_owned: true, is_free: true, role: 'Survivor', category: 'Survivor' },
    { id: 2, name: 'B', chapter_name: 'Base Game', release_number: 1, is_owned: true, is_free: true, role: 'Killer', category: 'Killer' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 2);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[0].characters.length, 2);
  assert.strictEqual(groups[1].chapterName, 'Chapter Two');
});

test('groupCharactersByChapter falls back to "Base Game" for a null chapter_name', () => {
  const chars: OnboardingCharacter[] = [
    { id: 1, name: 'A', chapter_name: null, release_number: null, is_owned: true, is_free: false, role: 'Survivor', category: 'Survivor' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[0].releaseNumber, 0);
});

test('groupCharactersByChapter, called with free characters already filtered out, drops a chapter whose entire cast was free', () => {
  const chars: OnboardingCharacter[] = [
    { id: 1, name: 'The Nurse', chapter_name: 'Last Breath Chapter', release_number: 5, is_owned: true, is_free: true, role: 'Killer', category: 'Killer' },
    { id: 2, name: 'Ace Visconti', chapter_name: 'Shattered Bloodline', release_number: 6, is_owned: false, is_free: false, role: 'Survivor', category: 'Survivor' },
  ];
  const groups = groupCharactersByChapter(chars.filter((c) => !c.is_free));
  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].chapterName, 'Shattered Bloodline');
});

test('normalizeChapterKey matches names that differ only by a leading "The " or a "(Chapter)"/"Chapter" suffix', () => {
  assert.strictEqual(normalizeChapterKey('SAW™ Chapter'), normalizeChapterKey('The SAW™ Chapter'));
  assert.strictEqual(normalizeChapterKey('Alan Wake® (Chapter)'), normalizeChapterKey('Alan Wake®'));
  assert.strictEqual(normalizeChapterKey('Life Road'), normalizeChapterKey('The Life Road'));
  assert.notStrictEqual(normalizeChapterKey('Chucky'), normalizeChapterKey('Jason'));
});

test('detectDefaultLanguage prefers a supported browser language over the current locale', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'pl-PL' },
    configurable: true,
  });
  try {
    assert.strictEqual(detectDefaultLanguage('en'), 'pl');
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
  }
});

test('detectDefaultLanguage falls back to the current locale when the browser language is unsupported', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'xx-XX' },
    configurable: true,
  });
  try {
    assert.strictEqual(detectDefaultLanguage('en'), 'en');
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
  }
});
