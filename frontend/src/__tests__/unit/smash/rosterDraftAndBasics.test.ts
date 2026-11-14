// frontend/src/__tests__/unit/smash/rosterDraftAndBasics.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { freshDraft, type Draft } from '@/components/smash-or-pass/creator/SmashRosterCreatorParts';
import { RosterTaxonomyBlock } from '@/components/smash-or-pass/creator/RosterTaxonomyBlock';
import { RosterBasicsSection } from '@/components/smash-or-pass/creator/RosterBasicsSection';
import { emptyDraftEntity } from '@/components/smash-or-pass/creator/EntityEditor';

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
});
