// frontend/src/__tests__/unit/perks/perkSearchUi.test.ts
//
// Server-rendered smoke checks for the perk-type search UI: SearchInput's token
// variant, CustomDropdown's multi-select variant, the Perks filter bar using
// both, and the perk type badges -- in English and Polish.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import pl from '@/locales/pl';
import type { Dictionary } from '@/locales/types';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkTypeBadges } from '@/components/perks/PerkTypeBadges';
import { SearchInput } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import type { Perk } from '@/types/perks';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';

const noop = () => {};

const filters = (overrides: Partial<React.ComponentProps<typeof PerkFilters>> = {}) =>
  React.createElement(PerkFilters, {
    search: '',
    setSearch: noop,
    role: 'Survivor',
    setRole: noop,
    scope: 'all',
    setScope: noop,
    ownershipFilter: 'all',
    setOwnershipFilter: noop,
    sortBy: 'name',
    setSortBy: noop,
    order: 'asc',
    setOrder: noop,
    onReset: noop,
    ...overrides,
  });

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

  it('the filter bar shows the new placeholder, the Types dropdown, and one chip per active type inside the field', () => {
    const empty = renderWithDictionary(filters());
    assert.match(empty, /placeholder="Search perks, characters or types\.\.\."/);
    assert.match(empty, /aria-label="Filter by perk type"/);
    assert.ok(!empty.includes('Remove '));
    const html = renderWithDictionary(filters({ activeTypes: ['healing', 'chase'] }));
    assert.match(html, /aria-label="Remove Healing filter"/);
    assert.match(html, /aria-label="Remove Chase filter"/);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 2);
  });

  it('labels are localized', () => {
    const html = renderWithDictionary(filters({ role: 'Killer', activeTypes: ['totem'] }), { dict: pl as Dictionary, locale: 'pl' });
    assert.ok(html.includes('Usuń filtr Totem'));
    assert.ok(html.includes('>Typy<'));
  });

  it('the perk modal lists the perk\'s types, primary first, as buttons only when they can filter', () => {
    const plain = renderWithDictionary(React.createElement(PerkTypeBadges, { perk: DEJA_VU }));
    assert.ok(plain.indexOf('Generator') < plain.indexOf('Tracking'));
    assert.ok(!plain.includes('aria-pressed'));
    const clickable = renderWithDictionary(
      React.createElement(PerkTypeBadges, { perk: DEJA_VU, onSelectType: noop, activeTypes: ['tracking'] })
    );
    assert.equal((clickable.match(/aria-pressed="true"/g) || []).length, 1);
    assert.equal((clickable.match(/aria-pressed="false"/g) || []).length, 1);
  });
});
