// frontend/src/__tests__/unit/perks/perkFilters.test.ts
// When the filter bar counts as "changed" (the Reset button shows), and its short labels.
// The page layout itself is checked rendered by `npm run check:rendered`.
import test from 'node:test';
import assert from 'node:assert';
import { PerkFilters, computeHasActiveFilters } from '@/components/PerkFilters';
import * as locales from '@/locales';

test('PerkFilters is properly exported', () => {
  assert.strictEqual(typeof PerkFilters, 'function');
  assert.strictEqual(typeof computeHasActiveFilters, 'function');
});

test('computeHasActiveFilters is false for the exact default state (Reset button hidden)', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'all', ownershipFilter: 'all', order: 'asc' }),
    false
  );
});

test('computeHasActiveFilters is true when search text is present', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: 'sprint burst', scope: 'all', ownershipFilter: 'all', order: 'asc' }),
    true
  );
});

test('computeHasActiveFilters is true when the General Only checkbox is on', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'general', ownershipFilter: 'all', order: 'asc' }),
    true
  );
});

test('computeHasActiveFilters is true when the ownership switch is set to Owned', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'all', ownershipFilter: 'owned', order: 'asc' }),
    true
  );
});

test('computeHasActiveFilters is true for a non-default sort order', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'all', ownershipFilter: 'all', order: 'desc' }),
    true
  );
});

const LOCALE_CODES = ['en', 'es', 'pl', 'de', 'ja'] as const;

test('every locale uses the short sort-order labels PerkFilters renders (no "(A-Z)" qualifier)', () => {
  for (const code of LOCALE_CODES) {
    const filters = locales[code].filters;
    assert.ok(filters.orderAsc && !filters.orderAsc.includes('('), `${code}.filters.orderAsc: ${filters.orderAsc}`);
    assert.ok(filters.orderDesc && !filters.orderDesc.includes('('), `${code}.filters.orderDesc: ${filters.orderDesc}`);
  }
});
