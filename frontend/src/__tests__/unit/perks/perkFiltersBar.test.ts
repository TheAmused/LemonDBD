// frontend/src/__tests__/unit/perks/perkFiltersBar.test.ts
//
// The Perks header, one row: role switch on the left, the plain search in the middle, a "Filters" popover
// (closed on first render) and the sort menu on the right. The result count sits above the grid. Also covers
// the CustomDropdown children mode the popover is built on, and the numbered pager the grid uses.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import pl from '@/locales/pl';
import type { Dictionary } from '@/locales/types';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkResultsCount } from '@/components/perks/PerkResultsCount';
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

  it('the header holds no count, and its sort menu shows just the current order', () => {
    const html = renderFilters();
    assert.ok(!html.includes('<output'), 'the result count lives above the grid, not in the search');
    assert.match(html, />Name A-Z</);
    assert.ok(!html.includes('Sort By: '));
    assert.ok(!html.includes('aria-pressed="true"'), 'no chips for the active filters: the Filters button counts them');
  });

  it('the line above the grid shows the page range', () => {
    const count = renderWithDictionary(React.createElement(PerkResultsCount, { page: 2, limit: 15, totalResults: 176 }));
    assert.match(count.replace(/<[^>]+>/g, ''), /Showing 16 to 30 of 176 perks/);
  });

  it('the Filters button counts every filter that is on, Owned and General together once', () => {
    assert.ok(!renderFilters().includes('data-text='));
    assert.match(renderFilters({ activeTypes: ['healing', 'chase'] }), /data-text="2"/);
    assert.match(renderFilters({ activeTypes: ['tracking'], scope: 'general' }), /data-text="2"/);
    assert.match(renderFilters({ activeTypes: ['tracking'], ownershipFilter: 'owned', scope: 'general' }), /data-text="2"/);
  });

  it('labels are localized', () => {
    const html = renderWithDictionary(
      React.createElement(PerkFilters, {
        search: '', setSearch: () => {}, role: 'Killer', setRole: () => {}, scope: 'all', setScope: () => {},
        ownershipFilter: 'all', setOwnershipFilter: () => {}, sortBy: 'name', setSortBy: () => {}, order: 'asc', setOrder: () => {},
        activeTypes: ['totem'],
      }),
      { dict: pl as Dictionary, locale: 'pl' }
    );
    assert.ok(html.includes('Filtry'));
    assert.match(html, /data-text="1"/);
  });
});

describe('role switch keeps only the types the new role has', () => {
  const typesByRole = {
    Survivor: new Set(['healing', 'chase'] as const),
    Killer: new Set(['totem', 'chase'] as const),
  };

  it('drops a Killer-only type when switching to Survivor and keeps shared ones', () => {
    assert.deepEqual(typesForRole(['totem', 'chase'], 'Survivor', typesByRole), ['chase']);
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
