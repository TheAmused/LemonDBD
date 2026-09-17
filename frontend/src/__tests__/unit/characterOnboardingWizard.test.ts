// frontend/src/__tests__/unit/characterOnboardingWizard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';
import {
  groupCharactersByChapter,
  normalizeChapterKey,
  detectDefaultLanguage,
  resolveOnboardingResume,
} from '@/components/onboarding/CharacterOnboardingWizard';
import type { OnboardingCharacter } from '@/components/onboarding/CharacterOnboardingWizard';

test('CharacterOnboardingWizard is exported as a function component', () => {
  assert.strictEqual(typeof CharacterOnboardingWizard, 'function');
});

test('groupCharactersByChapter groups and orders by release_date', () => {
  const chars: OnboardingCharacter[] = [
    { id: 3, name: 'C', chapter_name: 'Chapter Two', release_number: 2, release_date: '2 June 2018', is_owned: false, is_free: false, role: 'Killer', category: 'Killer' },
    { id: 1, name: 'A', chapter_name: 'Base Game', release_number: 1, release_date: '14 June 2016', is_owned: true, is_free: true, role: 'Survivor', category: 'Survivor' },
    { id: 2, name: 'B', chapter_name: 'Base Game', release_number: 1, release_date: '14 June 2016', is_owned: true, is_free: true, role: 'Killer', category: 'Killer' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 2);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[0].characters.length, 2);
  assert.strictEqual(groups[1].chapterName, 'Chapter Two');
});

test('groupCharactersByChapter sorts by the latest release_date seen in the chapter, not just the first character encountered', () => {
  const chars: OnboardingCharacter[] = [
    // The killer (first in list) is missing release_date -- only the
    // survivor listed after it carries the real value.
    { id: 1, name: 'Missing Killer', chapter_name: 'Newest Chapter', release_number: null, release_date: null, is_owned: false, is_free: false, role: 'Killer', category: 'Killer' },
    { id: 2, name: 'Real Survivor', chapter_name: 'Newest Chapter', release_number: 30, release_date: '30 January 2024', is_owned: false, is_free: false, role: 'Survivor', category: 'Survivor' },
    { id: 3, name: 'Old Killer', chapter_name: 'Base Game', release_number: 1, release_date: '14 June 2016', is_owned: true, is_free: true, role: 'Killer', category: 'Killer' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 2);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[1].chapterName, 'Newest Chapter');
});

test('groupCharactersByChapter handles the scraper\'s year-only release_date fallback', () => {
  // parse_date_and_year (backend) falls back to a bare 4-digit year string
  // when it can't find a full day-month-year date on the wiki page.
  const chars: OnboardingCharacter[] = [
    { id: 1, name: 'Old Killer', chapter_name: 'Base Game', release_number: 1, release_date: '2016', is_owned: true, is_free: true, role: 'Killer', category: 'Killer' },
    { id: 2, name: 'Newer Survivor', chapter_name: 'Later Chapter', release_number: 10, release_date: '20 May 2019', is_owned: false, is_free: false, role: 'Survivor', category: 'Survivor' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 2);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[1].chapterName, 'Later Chapter');
});

test('groupCharactersByChapter sorts by release_date even when a misleading release_number disagrees', () => {
  // Regression case: Chucky's release_number (34) ties with Forged in Fog's,
  // even though Chucky's release_date is a full year later -- release_number
  // isn't reliable across chapters, release_date is what must win.
  const chars: OnboardingCharacter[] = [
    { id: 1, name: 'Vittorio Toscano', chapter_name: 'Forged in Fog', release_number: 34, release_date: '22 November 2022', is_owned: false, is_free: false, role: 'Survivor', category: 'Survivor' },
    { id: 2, name: 'The Good Guy', chapter_name: 'Chucky', release_number: 34, release_date: '28 November 2023', is_owned: false, is_free: false, role: 'Killer', category: 'Killer' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 2);
  assert.strictEqual(groups[0].chapterName, 'Forged in Fog');
  assert.strictEqual(groups[1].chapterName, 'Chucky');
});

test('groupCharactersByChapter falls back to "Base Game" for a null chapter_name', () => {
  const chars: OnboardingCharacter[] = [
    { id: 1, name: 'A', chapter_name: null, release_number: null, release_date: null, is_owned: true, is_free: false, role: 'Survivor', category: 'Survivor' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[0].releaseTimestamp, 0);
});

test('groupCharactersByChapter, called with free characters already filtered out, drops a chapter whose entire cast was free', () => {
  const chars: OnboardingCharacter[] = [
    { id: 1, name: 'The Nurse', chapter_name: 'Last Breath Chapter', release_number: 5, release_date: '14 June 2016', is_owned: true, is_free: true, role: 'Killer', category: 'Killer' },
    { id: 2, name: 'Ace Visconti', chapter_name: 'Shattered Bloodline', release_number: 6, release_date: '11 April 2017', is_owned: false, is_free: false, role: 'Survivor', category: 'Survivor' },
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

test('resolveOnboardingResume starts a fresh visit on the intro step', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { language: 'pl-PL' }, configurable: true });
  try {
    assert.deepStrictEqual(resolveOnboardingResume(null, 'en'), { view: 'intro', language: 'pl' });
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
  }
});

test('resolveOnboardingResume keeps the picked language selected after a locale redirect', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { language: 'pl-PL' }, configurable: true });
  try {
    // The browser language is Polish, but German is what was just picked, so
    // the locale in the URL has to win over the browser guess.
    assert.deepStrictEqual(resolveOnboardingResume('language', 'de'), { view: 'language', language: 'de' });
    assert.deepStrictEqual(resolveOnboardingResume('roster', 'de'), { view: 'roster', language: 'de' });
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
  }
});

test('resolveOnboardingResume ignores an unrecognised stored step', () => {
  assert.strictEqual(resolveOnboardingResume('nonsense', 'en').view, 'intro');
});
