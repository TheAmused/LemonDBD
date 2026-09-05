// frontend/src/__tests__/unit/characterOnboardingWizard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';
import { groupCharactersByChapter } from '@/components/onboarding/CharacterOnboardingWizard';
import type { OnboardingCharacter } from '@/components/onboarding/CharacterOnboardingWizard';

test('CharacterOnboardingWizard is exported as a function component', () => {
  assert.strictEqual(typeof CharacterOnboardingWizard, 'function');
});

test('groupCharactersByChapter groups and orders by release_number', () => {
  const chars: OnboardingCharacter[] = [
    { id: 3, name: 'C', chapter_name: 'Chapter Two', release_number: 2, is_owned: false, role: 'Killer', category: 'Killer' },
    { id: 1, name: 'A', chapter_name: 'Base Game', release_number: 1, is_owned: true, role: 'Survivor', category: 'Survivor' },
    { id: 2, name: 'B', chapter_name: 'Base Game', release_number: 1, is_owned: true, role: 'Killer', category: 'Killer' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 2);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[0].characters.length, 2);
  assert.strictEqual(groups[1].chapterName, 'Chapter Two');
});

test('groupCharactersByChapter falls back to "Base Game" for a null chapter_name', () => {
  const chars: OnboardingCharacter[] = [
    { id: 1, name: 'A', chapter_name: null, release_number: null, is_owned: true, role: 'Survivor', category: 'Survivor' },
  ];
  const groups = groupCharactersByChapter(chars);
  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[0].releaseNumber, 0);
});
