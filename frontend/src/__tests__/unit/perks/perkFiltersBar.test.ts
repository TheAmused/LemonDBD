// frontend/src/__tests__/unit/perks/perkFiltersBar.test.ts
//
// The Perks header: title, role switch, plain search, a "Filters" popover (closed on first render),
// and the results strip with removable chips and the sort menu. Also covers the CustomDropdown
// children mode the popover is built on, and the numbered pager the grid uses.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import pl from '@/locales/pl';
import type { Dictionary } from '@/locales/types';
import { PerkFilters } from '@/components/PerkFilters';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { Pagination } from '@/components/common/Pagination';
import { pageWindow } from '@/constants/pagination';
import { typesForRole } from '@/utils/perkSearch/match';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';

function renderFilters(overrides: Partial<React.ComponentProps<typeof PerkFilters>> = {}) {
  return renderWithDictionary(
    React.createElement(PerkFilters, {
      search: '',
      setSearch: () => {},
      role: 'Survivor',
      setRole: () => {},
      scope: 'all',
      setScope: () => {},
      ownershipFilter: 'all',
      setOwnershipFilter: () => {},
      sortBy: 'name',
      setSortBy: () => {},
      order: 'asc',
      setOrder: () => {},
      ...overrides,
    })
  );
}

describe('PerkFilters header', () => {
  it('shows one role switch; the ownership switch lives in the closed Filters popover', () => {
    const html = renderFilters();
    assert.equal((html.match(/role="radiogroup"/g) || []).length, 1);
    assert.match(html, /aria-label="Filters"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*aria-label="Filters"/);
  });

  it('the search is a plain field: no Types button and no type chips inside it', () => {
    const html = renderFilters({ activeTypes: ['healing', 'chase'] });
    assert.match(html, /placeholder="Search perks, characters or types\.\.\."/);
    assert.ok(!html.includes('aria-label="Filter by perk type"'));
  });

  it('the strip shows the result count, one removable chip per active type, and the sort menu', () => {
    const html = renderFilters({ activeTypes: ['healing', 'chase'], totalResults: 7 });
    assert.match(html, /<output[^>]*>7 perks<\/output>/);
    assert.match(html, /aria-label="Remove Healing filter"/);
    assert.match(html, /aria-label="Remove Chase filter"/);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 2);
    assert.match(html, /Sort By: Name A-Z/);
  });

  it('ownership and general-only filters get chips too, and the Filters button counts all three kinds', () => {
    const html = renderFilters({ activeTypes: ['aura'], ownershipFilter: 'owned', scope: 'general' });
    assert.match(html, /aria-label="Remove Owned filter"/);
    assert.match(html, /aria-label="Remove General Only filter"/);
  });

  it('labels are localized', () => {
    const html = renderWithDictionary(
      React.createElement(PerkFilters, {
        search: '', setSearch: () => {}, role: 'Killer', setRole: () => {}, scope: 'all', setScope: () => {},
        ownershipFilter: 'all', setOwnershipFilter: () => {}, sortBy: 'name', setSortBy: () => {}, order: 'asc', setOrder: () => {},
        activeTypes: ['hex'],
      }),
      { dict: pl as Dictionary, locale: 'pl' }
    );
    assert.ok(html.includes('Usuń filtr Klątwa'));
    assert.ok(html.includes('Filtry'));
  });
});

describe('role switch keeps only the types the new role has', () => {
  const typesByRole = {
    Survivor: new Set(['healing', 'chase'] as const),
    Killer: new Set(['hex', 'chase'] as const),
  };

  it('drops a Killer-only type when switching to Survivor and keeps shared ones', () => {
    assert.deepEqual(typesForRole(['hex', 'chase'], 'Survivor', typesByRole), ['chase']);
  });

  it('keeps everything when the new role has all of them', () => {
    assert.deepEqual(typesForRole(['chase'], 'Killer', typesByRole), ['chase']);
  });
});

describe('CustomDropdown backward compatibility + new children mode', () => {
  const options: DropdownOption<'a' | 'b'>[] = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('classic value/onChange/options mode renders exactly as before (existing callers unaffected)', () => {
    const html = renderWithDictionary(
      React.createElement(CustomDropdown, {
        value: 'b',
        onChange: () => {},
        options,
        ariaLabel: 'Pick one',
      })
    );
    // A disclosure of plain buttons (the current one aria-current), not a listbox it could not drive
    // from the keyboard.
    assert.match(html, /aria-expanded="false"/, 'classic mode is a disclosure');
    assert.doesNotMatch(html, /aria-haspopup/, 'classic mode claims no popup role');
    assert.match(html, />Option B</, 'the trigger must show the selected option label, same as before');
  });

  it('new children + label mode renders a static label and arbitrary panel content, with no options required', () => {
    const html = renderWithDictionary(
      React.createElement(
        CustomDropdown,
        { label: 'Settings', ariaLabel: 'Settings' },
        React.createElement('div', { 'data-testid': 'custom-panel-content' }, 'hello from children')
      )
    );
    assert.match(html, />Settings</, 'the trigger must show the static label when no options/value are given');
    assert.match(html, /aria-haspopup="true"/, 'children mode opens a panel of arbitrary content');
  });
});

describe('Pagination count text on very small screens', () => {
  it('the "X-Y / Z" count is sr-only below the phone breakpoint but still present for screen readers', () => {
    const html = renderWithDictionary(
      React.createElement(Pagination, {
        page: 1,
        totalPages: 12,
        totalResults: 176,
        limit: 15,
        onPageChange: () => {},
        onLimitChange: () => {},
      })
    );
    assert.match(html, /class="sr-only phone:not-sr-only/, 'the count text must be sr-only by default and restored from the phone breakpoint up');
    assert.match(html, />1</);
    assert.match(html, />176</);
  });
});

describe('numbered pagination', () => {
  it('pageWindow keeps first, last and the current page with one neighbour each side', () => {
    assert.deepEqual(pageWindow(1, 1), [1]);
    assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
    assert.deepEqual(pageWindow(5, 20), [1, 'gap', 4, 5, 6, 'gap', 20]);
    assert.deepEqual(pageWindow(2, 20), [1, 2, 3, 'gap', 20]);
    assert.deepEqual(pageWindow(20, 20), [1, 'gap', 19, 20]);
  });

  it('the numbered variant renders page buttons and marks the current one, with no page field', () => {
    const html = renderWithDictionary(
      React.createElement(Pagination, {
        variant: 'numbered', page: 5, totalPages: 20, totalResults: 300, limit: 15, onPageChange: () => {}, onLimitChange: () => {},
      })
    );
    assert.match(html, /aria-current="page"[^>]*>5</);
    assert.match(html, />20</);
    assert.ok(!html.includes('current-page-input'));
  });
});
