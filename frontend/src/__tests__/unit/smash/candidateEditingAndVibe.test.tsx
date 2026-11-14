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
import { OFFICIAL_GENDERS } from '@/utils/smashOrPass/terms';

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
    it('verifies OFFICIAL_GENDERS taxonomy constants', () => {
      assert.deepEqual(OFFICIAL_GENDERS, ['female', 'male', 'monster_other']);
    });

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
      const roleLabels = view.getAllByText(c.entityRoleLabel);
      const requiredRoleLabel = roleLabels.find((l) => l.parentElement?.textContent?.includes('*'));
      assert.ok(requiredRoleLabel, 'Role label should have RequiredMark');

      const genderLabels = view.getAllByText(c.entityGenderLabel);
      const requiredGenderLabel = genderLabels.find((l) => l.parentElement?.textContent?.includes('*'));
      assert.ok(requiredGenderLabel, 'Gender label should have RequiredMark');

      // Verify no raw text input exists for role or gender
      const inputs = view.container.querySelectorAll('input:not([type="hidden"]):not([type="file"])');
      const inputPlaceholders = Array.from(inputs).map((i) => i.getAttribute('placeholder') || '');
      assert.ok(!inputPlaceholders.includes(c.rolePlaceholder), 'Raw role input should not exist');
      assert.ok(!inputPlaceholders.includes(c.genderPlaceholder), 'Raw gender input should not exist');
    });

    it('restricts role and gender selection to available options and fires onChange via CustomDropdown', () => {
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

      // Open Role dropdown
      const roleDropdown = view.getByRole('button', { name: c.entityRoleLabel });
      assert.ok(roleDropdown, 'Role dropdown trigger should be present');
      assert.ok(roleDropdown.textContent?.includes('Survivor'));
      fireEvent.click(roleDropdown);

      // Select Killer
      const killerOption = view.getByText('Killer');
      assert.ok(killerOption);
      fireEvent.click(killerOption);
      assert.deepEqual(patches[patches.length - 1], { role: 'Killer' });

      // Open Gender dropdown
      const genderDropdown = view.getByRole('button', { name: c.entityGenderLabel });
      assert.ok(genderDropdown, 'Gender dropdown trigger should be present');
      assert.ok(genderDropdown.textContent?.includes('Female'));
      fireEvent.click(genderDropdown);

      // Select Male
      const maleOption = view.getByText('Male');
      assert.ok(maleOption);
      fireEvent.click(maleOption);
      assert.deepEqual(patches[patches.length - 1], { gender: 'male' });
    });

    it('uses CustomDropdown for role and gender selection across few and many options', () => {
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
          availableGenders={['female', 'male', 'monster_other', 'custom_gender']}
        />,
        { wrapper: withDictionary() }
      );

      // Verify CustomDropdown button for role is rendered with current value
      const roleDropdown = view.getByRole('button', { name: c.entityRoleLabel });
      assert.ok(roleDropdown, 'CustomDropdown trigger for role should be present');
      assert.ok(roleDropdown.textContent?.includes('Role A'));

      // Verify CustomDropdown button for gender is rendered with current value
      const genderDropdown = view.getByRole('button', { name: c.entityGenderLabel });
      assert.ok(genderDropdown, 'CustomDropdown trigger for gender should be present');
      assert.ok(genderDropdown.textContent?.includes('Male'));
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

    it('renders dating_vibe in scrollable container without viewport-gating classes', () => {
      const view = render(
        <CardBackFace
          character={baseEntityItem}
          profile={{ ...baseProfile, dating_vibe: 'Eternal Flame Lover' }}
          isFlipped={true}
          onFlip={() => {}}
          onVote={() => {}}
        />,
        { wrapper: withDictionary() }
      );

      const vibeEl = view.getByText('Eternal Flame Lover');
      assert.ok(vibeEl);
      assert.ok(!vibeEl.closest('.\\@hub-lg\\/hub\\:hidden'), 'Dating vibe must not be hidden on desktop');
      const scrollContainer = view.container.querySelector('[data-card-lore]');
      assert.ok(scrollContainer?.classList.contains('overflow-y-auto'), 'Card back lore container must be overflow-y-auto');
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
