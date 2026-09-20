// frontend/src/__tests__/unit/perkFiltersMobileSettings.test.ts
//
// Regression coverage for the "collapse the filter bar into a Settings
// dropdown on small screens" redesign: below sm (640px) the five inline
// toggles (role/ownership/general/sort field/sort order) are no longer
// shown directly -- they moved inside a "Filters" dropdown panel, stacked
// vertically, and the page itself shows only that trigger plus the search
// bar. The desktop inline row is unchanged and still renders at sm+.
//
// This also covers the CustomDropdown extension that made the panel
// possible: it gained an optional `children`/`label` mode for arbitrary
// panel content, while its original value/onChange/options listbox mode
// (used by ModeSwitcher, MapExplorer, SmashLeaderboardModal, CampfireHeader)
// must render exactly as before.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PerkFilters } from '@/components/PerkFilters';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { Pagination } from '@/components/Pagination';

function renderFilters(overrides: Partial<React.ComponentProps<typeof PerkFilters>> = {}) {
  return renderToStaticMarkup(
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
      onReset: () => {},
      dict: {
        filters: {
          survivor: 'Survivors',
          killer: 'Killers',
          allPerks: 'All',
          ownedOnly: 'Owned',
          generalOnly: 'General Only',
          sortByName: 'Name',
          sortByCharacter: 'Character',
          orderAsc: 'A-Z',
          orderDesc: 'Z-A',
          filtersTitle: 'Filters',
        },
      } as never,
      ...overrides,
    })
  );
}

describe('PerkFilters mobile Settings dropdown', () => {
  it('renders a mobile-only "Filters" dropdown trigger, hidden at sm+', () => {
    const html = renderFilters();
    assert.match(html, /class="w-full sm:hidden"/, 'expected a mobile-only (sm:hidden) wrapper around the Filters trigger');
    assert.match(html, />Filters</, 'expected the dropdown trigger to show the filters title as its label');
  });

  it('renders the desktop inline row hidden below sm, shown at sm+ via display:contents', () => {
    const html = renderFilters();
    assert.match(html, /class="hidden sm:contents"/, 'expected the desktop row to be display:none below sm and display:contents at sm+');
  });

  it('by default (dropdown closed) only the desktop row\'s 4 ToggleSwitch controls are mounted -- the mobile panel\'s copies do not exist in the DOM until opened, so there is no hidden duplicate work or a11y noise', () => {
    const html = renderFilters();
    const radiogroupCount = (html.match(/role="radiogroup"/g) || []).length;
    assert.strictEqual(radiogroupCount, 4, `expected 4 mounted ToggleSwitch radiogroups while the mobile dropdown is closed, found ${radiogroupCount}`);
  });

  it('the mobile "Filters" trigger starts collapsed', () => {
    const html = renderFilters();
    assert.match(html, /aria-haspopup="true"/, 'the Filters trigger uses the children-panel mode, not the listbox mode');
    assert.match(html, /aria-expanded="false"/, 'the Filters dropdown must start closed');
  });

  it('the General Only checkbox no longer renders a Sparkles icon', () => {
    const html = renderFilters();
    assert.ok(html.includes('type="checkbox"'), 'the General Only checkbox itself must still exist');
    assert.ok(!html.includes('sparkles'), 'a sparkles icon (lucide renders lowercase "sparkles" in its SVG class) should no longer appear');
  });

  it('search bar renders once (not duplicated between mobile and desktop layouts)', () => {
    const html = renderFilters({ search: 'UNIQUE_SEARCH_MARKER_VALUE' });
    const occurrences = (html.match(/UNIQUE_SEARCH_MARKER_VALUE/g) || []).length;
    assert.strictEqual(occurrences, 1, 'the search input value should appear exactly once -- a single shared <input>, not one per layout');
  });
});

describe('CustomDropdown backward compatibility + new children mode', () => {
  const options: DropdownOption<'a' | 'b'>[] = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('classic value/onChange/options mode renders exactly as before (existing callers unaffected)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CustomDropdown, {
        value: 'b',
        onChange: () => {},
        options,
        ariaLabel: 'Pick one',
      })
    );
    assert.match(html, /aria-haspopup="listbox"/, 'classic mode must keep aria-haspopup="listbox"');
    assert.match(html, />Option B</, 'the trigger must show the selected option label, same as before');
  });

  it('new children + label mode renders a static label and arbitrary panel content, with no options required', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        CustomDropdown,
        { label: 'Settings', ariaLabel: 'Settings' },
        React.createElement('div', { 'data-testid': 'custom-panel-content' }, 'hello from children')
      )
    );
    assert.match(html, />Settings</, 'the trigger must show the static label when no options/value are given');
    assert.match(html, /aria-haspopup="true"/, 'children mode should not claim aria-haspopup="listbox" since it is not a listbox');
  });
});

describe('Pagination count text on very small screens', () => {
  it('the "X-Y / Z" count is sr-only below 400px but still present for screen readers', () => {
    const html = renderToStaticMarkup(
      React.createElement(Pagination, {
        page: 1,
        totalPages: 12,
        totalResults: 176,
        limit: 15,
        onPageChange: () => {},
        onLimitChange: () => {},
      })
    );
    assert.match(html, /class="sr-only min-\[400px\]:not-sr-only/, 'the count text must be sr-only by default and restored at 400px+');
    assert.match(html, />1</);
    assert.match(html, />176</);
  });
});
