// frontend/src/__tests__/unit/smash/candidateEditingAndVibe.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import { CandidateFormInputs, emptyDraftEntity } from '@/components/smash-or-pass/creator/EntityEditor';
import { CardBackFace } from '@/components/smash-or-pass/card/CardBackFace';
import { FloatingLoreScattered } from '@/components/smash-or-pass/FloatingLoreScattered';
import type { EntityItem, EntityProfile } from '@/types/smashOrPass';

const c = enDict.smashOrPass.creator;

const baseEntityItem: EntityItem = {
  id: 'cand-1',
  roster_id: 'test-roster',
  slug: 'test-cand',
  name: 'Test Candidate',
  role: 'Survivor',
  gender: 'female',
  metadata: {
    archetype: 'Lone Wolf',
    bio: 'Test bio',
    tagline: 'Test tagline',
    quote: 'Test quote',
    meme: 'Test meme',
    turn_on: 'Campfires',
    dealbreaker: 'Jump scares',
    dating_vibe: '',
    red_flags: [],
    green_flags: [],
  },
  order_index: 0,
  stat: null,
};

const baseProfile: EntityProfile = {
  archetype: 'Lone Wolf',
  bio: 'Test bio',
  tagline: 'Test tagline',
  quote: 'Test quote',
  meme: 'Test meme',
  turn_on: 'Campfires',
  dealbreaker: 'Jump scares',
  dating_vibe: '',
  red_flags: [],
  green_flags: [],
};

describe('Candidate Editing and Dating Vibe', () => {
  describe('EntityEditor Role and Gender taxonomy restriction', () => {
    it('renders RequiredMark for Role and Gender labels', () => {
      const entity = emptyDraftEntity('k1');
      const view = render(
        <CandidateFormInputs
          entity={entity}
          index={0}
          onChange={() => {}}
          onRemove={() => {}}
          showTranslations={false}
          translations={{}}
          onTranslationChange={() => {}}
          locale="en"
          availableRoles={['Survivor', 'Killer']}
          availableGenders={['female', 'male']}
        />,
        { wrapper: withDictionary() }
      );

      // Verify role and gender labels are present
      const roleLabel = view.getByText(c.entityRoleLabel);
      assert.ok(roleLabel);
      assert.ok(roleLabel.parentElement?.textContent?.includes('*'), 'Role label should have RequiredMark');

      const genderLabel = view.getByText(c.entityGenderLabel);
      assert.ok(genderLabel);
      assert.ok(genderLabel.parentElement?.textContent?.includes('*'), 'Gender label should have RequiredMark');

      // Verify no raw text input exists for role or gender
      const inputs = view.container.querySelectorAll('input:not([type="hidden"]):not([type="file"])');
      const inputPlaceholders = Array.from(inputs).map((i) => i.getAttribute('placeholder') || '');
      assert.ok(!inputPlaceholders.includes(c.rolePlaceholder), 'Raw role input should not exist');
      assert.ok(!inputPlaceholders.includes(c.genderPlaceholder), 'Raw gender input should not exist');
    });

    it('restricts role and gender selection to available options and fires onChange', () => {
      const patches: Array<Record<string, unknown>> = [];
      const entity = { ...emptyDraftEntity('k1'), role: 'Survivor', gender: 'female' };
      const view = render(
        <CandidateFormInputs
          entity={entity}
          index={0}
          onChange={(patch) => patches.push(patch)}
          onRemove={() => {}}
          showTranslations={false}
          translations={{}}
          onTranslationChange={() => {}}
          locale="en"
          availableRoles={['Survivor', 'Killer']}
          availableGenders={['female', 'male']}
        />,
        { wrapper: withDictionary() }
      );

      // Click on Killer chip
      const killerChip = view.getByText('Killer');
      assert.ok(killerChip);
      fireEvent.click(killerChip);
      assert.deepEqual(patches[patches.length - 1], { role: 'Killer' });

      // Click on Male chip (exact text 'Male')
      const maleChip = view.getByRole('button', { name: 'Male' });
      assert.ok(maleChip);
      fireEvent.click(maleChip);
      assert.deepEqual(patches[patches.length - 1], { gender: 'male' });
    });

    it('uses CustomDropdown when available options exceed 4', () => {
      const patches: Array<Record<string, unknown>> = [];
      const entity = { ...emptyDraftEntity('k1'), role: 'Role A', gender: 'male' };
      const view = render(
        <CandidateFormInputs
          entity={entity}
          index={0}
          onChange={(patch) => patches.push(patch)}
          onRemove={() => {}}
          showTranslations={false}
          translations={{}}
          onTranslationChange={() => {}}
          locale="en"
          availableRoles={['Role A', 'Role B', 'Role C', 'Role D', 'Role E']}
          availableGenders={['female', 'male']}
        />,
        { wrapper: withDictionary() }
      );

      // Verify CustomDropdown button for role is rendered with current value
      const roleDropdown = view.getByRole('button', { name: c.entityRoleLabel });
      assert.ok(roleDropdown, 'CustomDropdown trigger should be present');
      assert.ok(roleDropdown.textContent?.includes('Role A'));
    });
  });

  describe('Focal point framing selector', () => {
    it('shows 9-point focal selector when media_url is present and updates media_display', () => {
      const patches: Array<Record<string, unknown>> = [];
      const entity = {
        ...emptyDraftEntity('k1'),
        media_url: 'https://example.com/avatar.png',
      };
      const view = render(
        <CandidateFormInputs
          entity={entity}
          index={0}
          onChange={(patch) => patches.push(patch)}
          onRemove={() => {}}
          showTranslations={false}
          translations={{}}
          onTranslationChange={() => {}}
          locale="en"
        />,
        { wrapper: withDictionary() }
      );

      // Top-Left focal point
      const topLeftBtn = view.container.querySelector('[aria-label="Top Left"]');
      assert.ok(topLeftBtn, 'Top Left focal button should be present');
      fireEvent.click(topLeftBtn);

      assert.deepEqual(patches[patches.length - 1], {
        media_display: { position: 'left top', fit: 'cover' },
      });
    });
  });

  describe('CardBackFace dating_vibe rendering', () => {
    it('displays charTitle when dating_vibe is empty', () => {
      const view = render(
        <CardBackFace
          character={baseEntityItem}
          profile={baseProfile}
          isFlipped={true}
          onFlip={() => {}}
          onVote={() => {}}
        />,
        { wrapper: withDictionary() }
      );

      assert.ok(view.getByText('Lone Wolf'));
    });

    it('displays profile.dating_vibe when present', () => {
      const view = render(
        <CardBackFace
          character={baseEntityItem}
          profile={{ ...baseProfile, dating_vibe: 'Spooky Hopeless Romantic' }}
          isFlipped={true}
          onFlip={() => {}}
          onVote={() => {}}
        />,
        { wrapper: withDictionary() }
      );

      assert.ok(view.getByText('Spooky Hopeless Romantic'));
    });
  });

  describe('FloatingLoreScattered dating_vibe rendering', () => {
    it('displays charTitle when dating_vibe is empty', () => {
      const view = render(
        <FloatingLoreScattered
          character={baseEntityItem}
          locale="en"
        />,
        { wrapper: withDictionary() }
      );

      assert.ok(view.getByText('Lone Wolf'));
    });

    it('displays profile.dating_vibe when present', () => {
      const itemWithVibe: EntityItem = {
        ...baseEntityItem,
        metadata: {
          ...baseProfile,
          dating_vibe: 'Chaotic Good Flirt',
        },
      };

      const view = render(
        <FloatingLoreScattered
          character={itemWithVibe}
          locale="en"
        />,
        { wrapper: withDictionary() }
      );

      assert.ok(view.getByText('Chaotic Good Flirt'));
    });
  });
});
