// frontend/src/__tests__/unit/characterOnboardingWizard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';
import {
  groupCharactersByChapter,
  normalizeChapterKey,
  resolveOnboardingView,
  isDefaultUnlockedPerk,
} from '@/components/onboarding/CharacterOnboardingWizard';
import type { OnboardingCharacter, OnboardingPerk } from '@/components/onboarding/CharacterOnboardingWizard';

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

test('resolveOnboardingView resumes the step a locale redirect left behind', () => {
  assert.strictEqual(resolveOnboardingView('language'), 'language');
  assert.strictEqual(resolveOnboardingView('roster'), 'roster');
});

test('resolveOnboardingView starts a fresh visit on the intro step', () => {
  assert.strictEqual(resolveOnboardingView(null), 'intro');
  assert.strictEqual(resolveOnboardingView('nonsense'), 'intro');
});

test('isDefaultUnlockedPerk protects free characters, generic counterparts, and Halloween/Hellraiser perks', () => {
  const characters: OnboardingCharacter[] = [
    { id: 1, name: 'Dwight Fairfield', chapter_name: 'Base Game', release_number: 1, release_date: '14 June 2016', is_owned: true, is_free: true, role: 'Survivor', category: 'Survivor' },
    { id: 6, name: 'Laurie Strode', chapter_name: 'The HALLOWEEN® Chapter', release_number: 6, release_date: '25 October 2016', is_owned: false, is_free: false, role: 'Survivor', category: 'Survivor' },
    { id: 5, name: 'The Shape', chapter_name: 'The HALLOWEEN® Chapter', release_number: 5, release_date: '25 October 2016', is_owned: false, is_free: false, role: 'Killer', category: 'Killer' },
    { id: 25, name: 'The Cenobite', chapter_name: 'Hellraiser™', release_number: 25, release_date: '7 September 2021', is_owned: false, is_free: false, role: 'Killer', category: 'Killer' },
    { id: 10, name: 'The Ghost Face', chapter_name: 'Ghost Face®', release_number: 10, release_date: '18 June 2019', is_owned: false, is_free: false, role: 'Killer', category: 'Killer' },
  ];

  // 1. Free base game character perk (Dwight)
  const dwightPerk: OnboardingPerk = {
    perk_id: 10,
    name: 'Bond',
    character_id: 1,
    survivor_id: 1,
    is_teachable: true,
    is_unlocked: true,
  };
  assert.strictEqual(isDefaultUnlockedPerk(dwightPerk, characters), true, 'Free character perks must be default-unlocked');

  // 2. Generic counterpart perk
  const genericPerk: OnboardingPerk = {
    perk_id: 99,
    name: 'Some Generic',
    character_id: 10,
    killer_id: 10,
    is_generic_counterpart: true,
    is_teachable: true,
    is_unlocked: true,
  };
  assert.strictEqual(isDefaultUnlockedPerk(genericPerk, characters), true, 'Generic counterpart perks must be default-unlocked');

  // 3. Halloween perks (Laurie Strode & The Shape)
  const decisiveStrike: OnboardingPerk = {
    perk_id: 53,
    name: 'Decisive Strike',
    character_id: 6,
    survivor_id: 6,
    is_teachable: true,
    is_unlocked: true,
    is_generic_counterpart: true,
  };
  assert.strictEqual(isDefaultUnlockedPerk(decisiveStrike, characters), true, 'Decisive Strike (Halloween) must be default-unlocked');

  const saveTheBestForLast: OnboardingPerk = {
    perk_id: 284,
    name: 'Save the Best for Last',
    character_id: 5,
    killer_id: 5,
    is_teachable: true,
    is_unlocked: true,
    is_generic_counterpart: true,
  };
  assert.strictEqual(isDefaultUnlockedPerk(saveTheBestForLast, characters), true, 'Save the Best for Last (The Shape / Halloween generic counterpart) must be default-unlocked');

  // 4. Hellraiser perk (The Cenobite)
  const deadlock: OnboardingPerk = {
    perk_id: 201,
    name: 'Deadlock',
    character_id: 25,
    killer_id: 25,
    is_teachable: true,
    is_unlocked: true,
    is_generic_counterpart: true,
  };
  assert.strictEqual(isDefaultUnlockedPerk(deadlock, characters), true, 'Deadlock (The Cenobite / Hellraiser is_generic_counterpart) must be default-unlocked');

  // 5. Standard non-free DLC character perk (Ghost Face)
  const iAmAllEars: OnboardingPerk = {
    perk_id: 300,
    name: "I'm All Ears",
    character_id: 10,
    killer_id: 10,
    is_teachable: true,
    is_unlocked: false,
    is_generic_counterpart: false,
  };
  assert.strictEqual(isDefaultUnlockedPerk(iAmAllEars, characters), false, 'Normal paid DLC perk must NOT be default-unlocked');
});
