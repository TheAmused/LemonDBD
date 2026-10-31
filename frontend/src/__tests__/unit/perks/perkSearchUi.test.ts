// frontend/src/__tests__/unit/perks/perkSearchUi.test.ts
//
// Server-rendered smoke checks for the perk-type search UI: SearchInput's token
// variant, CustomDropdown's multi-select variant and the perk type badges
// (the Perks header itself is covered by perkFiltersBar.test.ts).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { PerkTypeBadges } from '@/components/perks/PerkTypeBadges';
import { SearchInput } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import type { Perk } from '@/types/perks';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';

const noop = () => {};

const DEJA_VU: Perk = {
  name: 'Déjà Vu',
  perk_types: ['generator', 'tracking'],
  character: 'General',
  category: 'Survivor',
  description: 'See generators.',
  icon_url: '',
  icon_local_path: '',
};

describe('perk type search UI', () => {
  it('SearchInput without tokens renders exactly as before', () => {
    const html = renderWithDictionary(React.createElement(SearchInput, { value: 'x', onChange: noop }));
    assert.ok(!html.includes('<label'));
    assert.match(html, /type="search"/);
  });

  it('SearchInput token variant puts removable chips inside the field frame', () => {
    const html = renderWithDictionary(
      React.createElement(SearchInput, {
        value: '',
        onChange: noop,
        tokens: [{ key: 'healing', label: 'Healing', removeLabel: 'Remove Healing filter' }],
        onRemoveToken: noop,
      })
    );
    const label = html.indexOf('<label');
    assert.ok(label >= 0 && html.indexOf('Remove Healing filter') > label && html.indexOf('<input') > html.indexOf('Healing'));
  });

  it('CustomDropdown multi-select variant shows how many are chosen', () => {
    const html = renderWithDictionary(
      React.createElement(CustomDropdown<'a' | 'b' | 'c'>, {
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
        values: ['a', 'c'],
        onValuesChange: noop,
        label: 'Types',
        ariaLabel: 'Filter',
      })
    );
    assert.match(html, />Types</);
    assert.match(html, />2</);
    assert.match(html, /aria-haspopup="true"/);
  });

  it('a perk card lists the perk\'s types, primary first, as plain labels', () => {
    const html = renderWithDictionary(React.createElement(PerkTypeBadges, { perk: DEJA_VU }));
    assert.ok(html.indexOf('Generator') < html.indexOf('Tracking'));
    assert.ok(!html.includes('<button'));
  });
});
