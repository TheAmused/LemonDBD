// frontend/src/__tests__/unit/perkFilters.test.ts
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PerkFilters, computeHasActiveFilters } from '@/components/PerkFilters';

test('PerkFilters is properly exported', () => {
  assert.strictEqual(typeof PerkFilters, 'function');
  assert.strictEqual(typeof computeHasActiveFilters, 'function');
});

test('computeHasActiveFilters is false for the exact default state (Reset button hidden)', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'all', ownershipFilter: 'all', sortBy: 'name', order: 'asc' }),
    false
  );
});

test('computeHasActiveFilters is true when search text is present', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: 'sprint burst', scope: 'all', ownershipFilter: 'all', sortBy: 'name', order: 'asc' }),
    true
  );
});

test('computeHasActiveFilters is true when the General Only checkbox is on', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'general', ownershipFilter: 'all', sortBy: 'name', order: 'asc' }),
    true
  );
});

test('computeHasActiveFilters is true when the ownership switch is set to Owned', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'all', ownershipFilter: 'owned', sortBy: 'name', order: 'asc' }),
    true
  );
});

test('computeHasActiveFilters is true for a non-default sort field or order', () => {
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'all', ownershipFilter: 'all', sortBy: 'character', order: 'asc' }),
    true
  );
  assert.strictEqual(
    computeHasActiveFilters({ search: '', scope: 'all', ownershipFilter: 'all', sortBy: 'name', order: 'desc' }),
    true
  );
});

// --- Regression coverage for the redesign itself -------------------------
// These read the actual source files rather than rendering anything (this
// project's frontend unit tests don't mount a DOM), which is enough to pin
// down exactly what was demanded: the old stat banner is gone for good, the
// old two-button filter pairs are gone, and every locale's labels actually
// got shortened -- not just the English fallback strings.

const PERKS_PAGE_SRC = fs.readFileSync(
  path.join(__dirname, '../../app/[locale]/perks/page.tsx'),
  'utf-8'
);
const PERK_FILTERS_SRC = fs.readFileSync(path.join(__dirname, '../../components/PerkFilters.tsx'), 'utf-8');

test('the Perks Vault stat banner ("Vault Total" / stat pill row) is gone from the page', () => {
  assert.ok(!PERKS_PAGE_SRC.includes('stats?.vaultTotal'));
  assert.ok(!PERKS_PAGE_SRC.includes('stats?.ownedPerks'));
  assert.ok(!PERKS_PAGE_SRC.includes('perksVaultTitle'));
});

test('the perks page uses a fixed-viewport layout (h-dvh) instead of relying on page-level scroll', () => {
  assert.ok(PERKS_PAGE_SRC.includes('h-dvh'));
  assert.ok(PERKS_PAGE_SRC.includes('overflow-y-auto'));
});

test('the old "Every Perk" ownership button is no longer rendered by PerkFilters', () => {
  assert.ok(!PERK_FILTERS_SRC.includes('everyPerk'));
});

test('PerkFilters renders the role/ownership/sort controls as ToggleSwitch instances, not raw button pairs', () => {
  const toggleSwitchUsageCount = (PERK_FILTERS_SRC.match(/<ToggleSwitch/g) || []).length;
  // Role, Ownership, Sort field, Sort order = 4 real switches, rendered
  // twice: once inside the mobile "Filters" dropdown panel (stacked
  // vertically, below sm) and once in the desktop inline row (hidden
  // below sm, shown at sm+) -- same 4 controls, two physical instances so
  // each layout can be shown/hidden independently with plain CSS.
  assert.strictEqual(toggleSwitchUsageCount, 8);
});

test('General Only is a checkbox, not a second two-way toggle', () => {
  assert.ok(PERK_FILTERS_SRC.includes('type="checkbox"'));
  assert.ok(PERK_FILTERS_SRC.includes("scope === 'general'"));
});

const LOCALE_CODES = ['en', 'es', 'pl', 'de', 'ja'] as const;

test('every locale shortened the specific keys PerkFilters renders (orderAsc/orderDesc, not the unrelated legacy asc/desc keys)', () => {
  for (const code of LOCALE_CODES) {
    const src = fs.readFileSync(path.join(__dirname, `../../locales/${code}/filters.ts`), 'utf-8');
    const orderAscLine = src.match(/orderAsc:\s*"([^"]*)"/);
    const orderDescLine = src.match(/orderDesc:\s*"([^"]*)"/);
    assert.ok(orderAscLine, `${code}/filters.ts is missing orderAsc`);
    assert.ok(orderDescLine, `${code}/filters.ts is missing orderDesc`);
    // Short means short: neither label should carry the old parenthetical
    // "(A-Z)"/"(Z-A)" qualifier anymore, in any locale.
    assert.ok(!orderAscLine![1].includes('('), `${code}/filters.ts orderAsc is still long-form: ${orderAscLine![1]}`);
    assert.ok(!orderDescLine![1].includes('('), `${code}/filters.ts orderDesc is still long-form: ${orderDescLine![1]}`);
  }
});

test('en/filters.ts uses the new short labels', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../locales/en/filters.ts'), 'utf-8');
  assert.ok(src.includes('allPerks: "All",'));
  assert.ok(src.includes('ownedOnly: "Owned",'));
  assert.ok(src.includes('sortByName: "Name",'));
  assert.ok(src.includes('orderAsc: "A-Z",'));
  assert.ok(src.includes('orderDesc: "Z-A",'));
});

// --- Regression coverage for the "one inline row, no truncation, fixed
// 5x3 grid" follow-up redesign ---------------------------------------------

test('PerkFilters no longer hides controls behind a horizontal scrollbar', () => {
  // The old layout split into two stacked rows separated by a top border
  // divider -- that's still gone.
  assert.ok(!PERK_FILTERS_SRC.includes('border-t border-slate-100'));
  // A prior redesign crammed every control into one non-wrapping row with
  // overflow-x-auto. That measured as still hiding controls off-screen at
  // mobile widths AND at very common desktop/laptop widths (1024, 1366px),
  // not just tiny phones -- a scrollbar with no visible affordance read as
  // "the filters are missing". The container now wraps instead of hiding.
  assert.ok(!PERK_FILTERS_SRC.includes('overflow-x-auto'));
  assert.ok(PERK_FILTERS_SRC.includes('flex-wrap'));
});

test('PerkFilters no longer forces a fixed/min width on any ToggleSwitch (labels size to their own content)', () => {
  assert.ok(!PERK_FILTERS_SRC.includes('min-w-56'));
  assert.ok(!PERK_FILTERS_SRC.includes('min-w-40'));
  assert.ok(!PERK_FILTERS_SRC.includes('min-w-36'));
});

const TOGGLE_SWITCH_SRC = fs.readFileSync(
  path.join(__dirname, '../../components/common/ToggleSwitch.tsx'),
  'utf-8'
);

test('ToggleSwitch never truncates its label text', () => {
  assert.ok(!TOGGLE_SWITCH_SRC.includes('className="truncate"'));
  assert.ok(TOGGLE_SWITCH_SRC.includes('whitespace-nowrap'));
});

const PERK_CARD_SRC = fs.readFileSync(path.join(__dirname, '../../components/PerkCard.tsx'), 'utf-8');

test('the Perks Vault grid uses a breakpoint-driven column count (fewer, wider columns on mobile) instead of a fixed 5 columns', () => {
  // Regression: a hardcoded 5-column grid on a narrow/tall phone viewport
  // produced ~60px-wide columns with a JS-computed row height still sized
  // for a wide desktop layout (available height / 3), leaving the perk
  // icons tiny and surrounded by huge empty space. Fewer columns on
  // narrow screens keeps each cell close to the intended square/diamond
  // aspect ratio at any width.
  assert.ok(PERKS_PAGE_SRC.includes('grid-cols-3'));
  assert.ok(PERKS_PAGE_SRC.includes('sm:grid-cols-5'));
  // No more hardcoded 3-row template -- row count is now derived from the
  // actual (responsive) column count and item count at runtime.
  assert.ok(!PERKS_PAGE_SRC.includes('grid-rows-3'));
});

test('the Perks Vault grid derives its row count/height from the live column count instead of assuming 5 columns', () => {
  assert.ok(PERKS_PAGE_SRC.includes('gridTemplateColumns'));
  assert.ok(PERKS_PAGE_SRC.includes('Math.ceil(count / colCount)'));
  // The computed row height is capped relative to the column width so a
  // narrow, tall viewport can't stretch rows far beyond a roughly
  // square/diamond aspect ratio.
  assert.ok(PERKS_PAGE_SRC.includes('maxRowFromWidth'));
});

test('PerkCard exposes a "fill" size variant that scales via container query units instead of fixed breakpoints', () => {
  assert.ok(PERK_CARD_SRC.includes("'default' | 'large' | 'fill'"));
  assert.ok(PERK_CARD_SRC.includes('cqh'));
  assert.ok(PERK_CARD_SRC.includes('[container-type:size]'));
});

test('the perks page always renders perks with size="fill" now that the list view has been removed', () => {
  assert.ok(PERKS_PAGE_SRC.includes('size="fill"'));
  assert.ok(!PERKS_PAGE_SRC.includes('setViewMode'));
  assert.ok(!PERKS_PAGE_SRC.includes('ViewDisplayMode'));
  assert.ok(!PERKS_PAGE_SRC.includes("'list'"));
});
