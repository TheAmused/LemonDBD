// frontend/src/__tests__/unit/smash/archetypeBuilder.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import { RomanceArchetypeBuilder } from '@/components/smash-or-pass/creator/RomanceArchetypeBuilder';
import type { CustomRomanceArchetype } from '@/types/smashOrPass';

const ab = enDict.smashOrPass.archetypeBuilder;

function archetype(patch: Partial<CustomRomanceArchetype> = {}): CustomRomanceArchetype {
  return {
    id: 'a1',
    title: 'Fog Lover',
    subtitle: '',
    description: '',
    badge_color: 'from-accent-red to-bg-primary',
    rules: [{ target: 'total_votes', operator: '>=', value: 500 }],
    ...patch,
  };
}

function mount(initial: CustomRomanceArchetype[]) {
  const state = { archetypes: initial };
  const view = render(
    <RomanceArchetypeBuilder
      archetypes={state.archetypes}
      onChange={(next) => {
        state.archetypes = next;
        view.rerender(<RomanceArchetypeBuilder archetypes={next} onChange={() => undefined} availableRoles={[]} availableGenders={[]} />);
      }}
      availableRoles={[]}
      availableGenders={[]}
    />,
    { wrapper: withDictionary() }
  );
  return { view, state };
}

describe('archetype builder', () => {
  it('"Add archetype" sits below the list and adds an archetype', () => {
    const { view, state } = mount([archetype()]);
    const add = view.getByText(ab.addArchetype);
    const list = view.getAllByText('Fog Lover')[0];
    assert.ok(list.compareDocumentPosition(add) & 4, 'the button follows the archetype list');
    fireEvent.click(add);
    assert.equal(state.archetypes.length, 2);
  });

  it('a rule target is picked from the styled dropdown, not a native select', () => {
    const { view, state } = mount([archetype()]);
    assert.equal(view.container.querySelector('select'), null);
    fireEvent.click(view.getByText(ab.totalVotes));
    fireEvent.click(view.getByText(ab.smashRate));
    assert.equal(state.archetypes[0].rules[0].target, 'smash_rate');
    assert.equal(state.archetypes[0].rules[0].value, 100, 'a count of 500 is re-capped to a percentage');
  });

  it('the fallback hint sits under the fallback checkbox, only while none is marked', () => {
    const { view } = mount([archetype()]);
    assert.ok(view.getByText(ab.noFallbackNote));
    view.unmount();
    const marked = mount([archetype({ is_fallback: true })]);
    assert.equal(marked.view.queryByText(ab.noFallbackNote), null);
  });

  it('"Custom" starts a gradient and offers a handle for each end', () => {
    const style = document.documentElement.style;
    // The CSS build shortens #ff0055 to #f05; a browser reports the shortened form.
    style.setProperty('--palette-neon-crimson', '#f05');
    style.setProperty('--palette-night-950', '#05070c');
    const { view, state } = mount([archetype()]);
    fireEvent.click(view.getByText(ab.gradientCustom));
    assert.equal(state.archetypes[0].badge_color, 'custom:#ff0055,#05070c');
    assert.ok(view.getByLabelText('From #ff0055'));
    assert.ok(view.getByLabelText('To #05070c'));
  });

  it('a custom gradient is edited on its preview: a handle per end, and a swap', () => {
    const { view, state } = mount([archetype({ badge_color: 'custom:#112233,#445566' })]);
    assert.ok(view.getByLabelText('From #112233'));
    assert.ok(view.getByLabelText('To #445566'));
    fireEvent.click(view.getByLabelText(ab.gradientSwap));
    assert.equal(state.archetypes[0].badge_color, 'custom:#445566,#112233');
  });
});
