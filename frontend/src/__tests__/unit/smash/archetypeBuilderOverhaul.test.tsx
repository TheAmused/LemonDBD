// frontend/src/__tests__/unit/smash/archetypeBuilderOverhaul.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import { RomanceArchetypeBuilder } from '@/components/smash-or-pass/creator/RomanceArchetypeBuilder';
import type { CustomRomanceArchetype } from '@/types/smashOrPass';
import { genderLabel } from '@/utils/smashOrPass/terms';

const ab = enDict.smashOrPass.archetypeBuilder;

function archetype(patch: Partial<CustomRomanceArchetype> = {}): CustomRomanceArchetype {
  return {
    id: 'a1',
    title: 'Fog Lover',
    subtitle: 'A devoted romantic',
    description: 'Enjoys long walks in the realm',
    badge_color: 'from-accent-red to-bg-primary',
    rules: [
      { target: 'role_affinity', operator: '>=', value: 60, target_value: 'Survivor' },
      { target: 'gender_affinity', operator: '>=', value: 50, target_value: 'female' },
    ],
    ...patch,
  };
}

describe('archetype builder overhaul', () => {
  it('archetype and rule delete buttons use variant="danger"', () => {
    const view = render(
      <RomanceArchetypeBuilder
        archetypes={[archetype()]}
        onChange={() => undefined}
        availableRoles={['Survivor', 'Killer']}
        availableGenders={['female', 'male']}
      />,
      { wrapper: withDictionary() }
    );

    const archDeleteBtn = view.queryByLabelText(
      enDict.smashOrPass.creator.removeCandidateAria.replace('{name}', 'Fog Lover')
    );
    assert.ok(archDeleteBtn, 'archetype delete button exists');
    const isArchDanger =
      archDeleteBtn.className.includes('text-accent-red') && archDeleteBtn.className.includes('bg-accent-red/10');
    assert.equal(isArchDanger, true, 'archetype delete button has danger variant classes');

    const ruleDeleteBtns = view.container.querySelectorAll(`button[aria-label="${ab.removeRule}"]`);
    assert.ok(ruleDeleteBtns.length > 0, 'rule delete button exists');
    const isRuleDanger =
      ruleDeleteBtns[0].className.includes('text-accent-red') && ruleDeleteBtns[0].className.includes('bg-accent-red/10');
    assert.equal(isRuleDanger, true, 'rule delete button has danger variant classes');
  });

  it('the info banner <Surface> is removed', () => {
    const view = render(
      <RomanceArchetypeBuilder
        archetypes={[archetype()]}
        onChange={() => undefined}
        availableRoles={['Survivor', 'Killer']}
        availableGenders={['female', 'male']}
      />,
      { wrapper: withDictionary() }
    );

    const hasInfoIcon = Boolean(view.container.querySelector('svg.lucide-info'));
    assert.equal(hasInfoIcon, false, 'info banner icon should not be present');
  });

  it('CustomDropdown is used for role and gender targets instead of input/datalist', () => {
    const view = render(
      <RomanceArchetypeBuilder
        archetypes={[archetype()]}
        onChange={() => undefined}
        availableRoles={['Survivor', 'Killer']}
        availableGenders={['female', 'male']}
      />,
      { wrapper: withDictionary() }
    );

    // Datalist elements should not exist
    assert.equal(view.container.querySelectorAll('datalist').length, 0, 'no datalist elements should remain');

    // Role target dropdown trigger exists
    const hasRoleDropdown = Boolean(view.queryByText('Survivor'));
    assert.equal(hasRoleDropdown, true, 'CustomDropdown trigger for role should be rendered');

    // Gender target dropdown trigger exists
    const femaleLabel = genderLabel('female', enDict.smashOrPass.filters);
    const hasGenderDropdown = Boolean(view.queryByText(femaleLabel));
    assert.equal(hasGenderDropdown, true, 'CustomDropdown trigger for gender should be rendered');
  });

  it('expanded archetype renders a collapse / "Done" button that collapses the card', () => {
    let archetypes = [archetype()];
    const view = render(
      <RomanceArchetypeBuilder
        archetypes={archetypes}
        onChange={(next) => {
          archetypes = next;
        }}
        availableRoles={['Survivor', 'Killer']}
        availableGenders={['female', 'male']}
      />,
      { wrapper: withDictionary() }
    );

    // Done button is rendered inside expanded card
    const doneBtn = view.queryByText(ab.done);
    assert.equal(Boolean(doneBtn), true, 'Done button should exist');

    if (doneBtn) {
      fireEvent.click(doneBtn);
      assert.equal(Boolean(view.queryByPlaceholderText(ab.descriptionPlaceholder)), false, 'expanded card is collapsed');
    }
  });

  it('switching a rule target from role_affinity to gender_affinity resets target_value to availableGenders[0]', () => {
    let archetypes = [
      archetype({
        rules: [
          { target: 'role_affinity', operator: '>=', value: 60, target_value: 'Survivor' },
        ],
      }),
    ];

    const view = render(
      <RomanceArchetypeBuilder
        archetypes={archetypes}
        onChange={(next) => {
          archetypes = next;
        }}
        availableRoles={['Survivor', 'Killer']}
        availableGenders={['male', 'female']}
      />,
      { wrapper: withDictionary() }
    );

    // Target dropdown trigger has ariaLabel={ab.rulesTitle}
    const targetTrigger = view.getByRole('button', { name: ab.rulesTitle });
    fireEvent.click(targetTrigger);

    // Click gender affinity option
    const genderAffinityOption = view.getByText(ab.genderAffinity);
    fireEvent.click(genderAffinityOption);

    assert.equal(archetypes[0].rules[0].target, 'gender_affinity');
    assert.equal(archetypes[0].rules[0].target_value, 'male');
  });
});
