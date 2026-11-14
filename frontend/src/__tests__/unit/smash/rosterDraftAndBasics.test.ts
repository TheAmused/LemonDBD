// frontend/src/__tests__/unit/smash/rosterDraftAndBasics.test.ts
import { act, renderHook } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { freshDraft, DRAFT_KEY, type Draft } from '@/components/smash-or-pass/creator/SmashRosterCreatorParts';
import { RosterTaxonomyBlock } from '@/components/smash-or-pass/creator/RosterTaxonomyBlock';
import { RosterBasicsSection } from '@/components/smash-or-pass/creator/RosterBasicsSection';
import { emptyDraftEntity } from '@/components/smash-or-pass/creator/EntityEditor';
import { useRosterDraft } from '@/components/smash-or-pass/creator/useRosterDraft';

function isSimpleSwitchDisabled(html: string): boolean {
  // Matches <button ... role="switch" ... disabled ...>
  // Simple switch is the switch preceding c.simpleVersion label
  const match = html.match(/<button[^>]*role="switch"[^>]*>[\s\S]*?Simple Version/i);
  if (!match) return false;
  return /\sdisabled(\s|=|>)/.test(match[0]);
}

describe('Roster Draft and Basics Section', () => {
  it('1. freshDraft() does not contain category', () => {
    const draft = freshDraft();
    assert.equal('category' in draft, false, 'freshDraft should not have category property');
  });

  it('2. RosterTaxonomyBlock renders red accents for both Roles and Genders', () => {
    const html = renderWithDictionary(
      React.createElement(RosterTaxonomyBlock, {
        roles: ['Survivor'],
        genders: ['Female'],
        onChangeRoles: () => {},
        onChangeGenders: () => {},
      })
    );

    assert.equal(html.includes('text-accent-green'), false, 'No green accent icon in taxonomy block');
    assert.equal(html.includes('tone-green'), false, 'No green tone badge in taxonomy block');
    assert.ok(html.includes('text-accent-red'), 'Has red accent icon in taxonomy block');
  });

  it('3. RosterBasicsSection disables the simple version toggle when candidates exist with names or images', () => {
    const createDraft = (entities: Draft['entities']): Draft => ({
      ...freshDraft(),
      entities,
    });

    const defaultProps = {
      patch: () => {},
      attempted: false,
      nameMissing: false,
      coverInvalid: false,
      isUserAdmin: false,
      official: false,
      onOfficialChange: () => {},
      onOpenCrop: () => {},
    };

    // Case A: Fresh/empty draft (single candidate with empty fields) -> not disabled
    const emptyHtml = renderWithDictionary(
      React.createElement(RosterBasicsSection, {
        ...defaultProps,
        draft: createDraft([emptyDraftEntity('seed-0')]),
      })
    );
    assert.equal(isSimpleSwitchDisabled(emptyHtml), false, 'Switch is enabled for empty candidate list');

    // Case B: Candidate has name -> switch is disabled
    const namedHtml = renderWithDictionary(
      React.createElement(RosterBasicsSection, {
        ...defaultProps,
        draft: createDraft([{ ...emptyDraftEntity('seed-0'), name: 'Trapper' }]),
      })
    );
    assert.equal(isSimpleSwitchDisabled(namedHtml), true, 'Switch is disabled when candidate has name');

    // Case C: Candidate has media_url -> switch is disabled
    const mediaHtml = renderWithDictionary(
      React.createElement(RosterBasicsSection, {
        ...defaultProps,
        draft: createDraft([{ ...emptyDraftEntity('seed-0'), media_url: 'https://example.com/pic.png' }]),
      })
    );
    assert.equal(isSimpleSwitchDisabled(mediaHtml), true, 'Switch is disabled when candidate has media_url');

    // Case D: Multiple candidates -> switch is disabled
    const multiHtml = renderWithDictionary(
      React.createElement(RosterBasicsSection, {
        ...defaultProps,
        draft: createDraft([emptyDraftEntity('seed-0'), emptyDraftEntity('seed-1')]),
      })
    );
    assert.equal(isSimpleSwitchDisabled(multiHtml), true, 'Switch is disabled when multiple candidates exist');
  });

  it('4. calling setIsSubmitting(true) prevents localStorage.setItem(DRAFT_KEY) on subsequent draft mutations or timeouts', async () => {
    localStorage.clear();
    const setItemCalls: Array<{ key: string; value: string }> = [];
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      setItemCalls.push({ key, value });
      return origSetItem(key, value);
    };

    try {
      const { result } = renderHook(() =>
        useRosterDraft({
          storeHydrated: true,
        })
      );

      // Part A: Mutate draft to trigger autosave debounce, then immediately setIsSubmitting(true)
      act(() => {
        result.current.patch({ name: 'Pending Submit Roster' });
      });
      act(() => {
        result.current.setIsSubmitting(true);
      });

      // Wait past the 400ms debounce
      await act(() => new Promise((resolve) => setTimeout(resolve, 500)));

      assert.equal(
        setItemCalls.filter((c) => c.key === DRAFT_KEY).length,
        0,
        'Autosave timeout should not commit to localStorage when setIsSubmitting(true) was called'
      );
      assert.equal(localStorage.getItem(DRAFT_KEY), null);

      // Part B: Mutate draft again while isSubmitting is true
      act(() => {
        result.current.patch({ description: 'Mutated after submitting' });
      });

      await act(() => new Promise((resolve) => setTimeout(resolve, 500)));

      assert.equal(
        setItemCalls.filter((c) => c.key === DRAFT_KEY).length,
        0,
        'Subsequent mutations should not trigger localStorage.setItem when submitting'
      );
      assert.equal(localStorage.getItem(DRAFT_KEY), null);
    } finally {
      localStorage.setItem = origSetItem;
      localStorage.clear();
    }
  });
});
