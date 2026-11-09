// frontend/src/__tests__/unit/analytics/analyticsPerks.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Perk } from '@/types/perks';
import {
  buildPerkOpenProps,
  buildPerkSearchProps,
  isSearchWorthReporting,
  normalizeSearchTerm,
  perkEnglishName,
  roleTag,
} from '@/components/perks/perkTracking';

function perk(overrides: Partial<Perk>): Perk {
  return {
    id: 7,
    name: 'Zdecydowany Cios',
    raw_name: 'Decisive Strike',
    character: 'General',
    category: 'Survivor',
    description: '',
    icon_url: '',
    icon_local_path: '',
    ...overrides,
  };
}

describe('perkEnglishName', () => {
  it('prefers the English name over the shown one', () => {
    assert.equal(perkEnglishName(perk({})), 'Decisive Strike');
  });

  it('falls back to the shown name on cached data without raw_name', () => {
    assert.equal(perkEnglishName(perk({ raw_name: undefined })), 'Zdecydowany Cios');
    assert.equal(perkEnglishName(perk({ raw_name: '' })), 'Zdecydowany Cios');
  });
});

describe('buildPerkOpenProps', () => {
  it('describes a perk opened from the grid', () => {
    assert.deepEqual(buildPerkOpenProps(perk({}), 'Survivor', false), {
      perk_id: 7,
      perk: 'Decisive Strike',
      role: 'survivor',
      via: 'grid',
    });
  });

  it('marks a perk opened while a search is active', () => {
    assert.equal(buildPerkOpenProps(perk({}), 'Killer', true)?.via, 'search');
    assert.equal(buildPerkOpenProps(perk({}), 'Killer', true)?.role, 'killer');
  });

  it('sends nothing for a perk without an id', () => {
    assert.equal(buildPerkOpenProps(perk({ id: undefined }), 'Survivor', false), null);
  });
});

describe('normalizeSearchTerm', () => {
  it('lowercases, trims and collapses spaces so spellings count as one term', () => {
    assert.equal(normalizeSearchTerm('  Dead   HARD '), 'dead hard');
  });

  it('cuts a long text to 40 characters', () => {
    assert.equal(normalizeSearchTerm('a'.repeat(100)).length, 40);
  });
});

describe('buildPerkSearchProps', () => {
  it('names the perk when the search narrowed to exactly one', () => {
    assert.deepEqual(buildPerkSearchProps('Survivor', [perk({})], 'Decisive'), {
      role: 'survivor',
      query: 'decisive',
      results: 1,
      perk_id: 7,
      perk: 'Decisive Strike',
    });
  });

  it('only counts results when several perks matched', () => {
    assert.deepEqual(buildPerkSearchProps('Killer', [perk({}), perk({ id: 8 })], 'ds'), {
      role: 'killer',
      query: 'ds',
      results: 2,
    });
  });

  it('keeps the term of a search that found nothing, so missing aliases show up', () => {
    assert.deepEqual(buildPerkSearchProps('Killer', [], 'Deadhard'), { role: 'killer', query: 'deadhard', results: 0 });
  });
});

describe('isSearchWorthReporting', () => {
  it('needs at least three characters once trimmed', () => {
    assert.equal(isSearchWorthReporting('de'), false);
    assert.equal(isSearchWorthReporting('  de  '), false);
    assert.equal(isSearchWorthReporting('ded'), true);
  });
});

describe('roleTag', () => {
  it('lowercases the page role for the event props', () => {
    assert.equal(roleTag('Killer'), 'killer');
    assert.equal(roleTag('Survivor'), 'survivor');
  });
});
