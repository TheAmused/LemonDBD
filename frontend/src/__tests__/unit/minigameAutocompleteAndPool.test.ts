// frontend/src/__tests__/unit/minigameAutocompleteAndPool.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { MinigameCatalog } from '@/types/minigame';

// Sample catalog mocking DB state with overlapping IDs between killers and survivors
const mockCatalog: MinigameCatalog = {
  characters: [
    {
      id: 43,
      name: 'Lara Croft',
      role: 'Survivor',
      chapter_name: 'Tomb Raider™',
      avatar_url: '/img/lara.png',
    } as any,
    {
      id: 32,
      name: 'The Singularity',
      role: 'Killer',
      chapter_name: 'End Transmission',
      avatar_url: '/img/singularity.png',
    } as any,
    {
      id: 14,
      name: 'The Legion',
      role: 'Killer',
      chapter_name: 'Darkness Among Us',
      avatar_url: '/img/legion.png',
    } as any,
    {
      id: 14,
      name: 'Adam Francis',
      role: 'Survivor',
      chapter_name: 'Shattered Bloodlines',
      avatar_url: '/img/adam.png',
    } as any,
    {
      id: 1,
      name: 'The Trapper',
      role: 'Killer',
      chapter_name: 'Base Game',
      avatar_url: '/img/trapper.png',
    } as any,
    {
      id: 1,
      name: 'Dwight Fairfield',
      role: 'Survivor',
      chapter_name: 'Base Game',
      avatar_url: '/img/dwight.png',
    } as any,
  ],
  killers: [
    {
      id: 32,
      name: 'The Singularity',
      role: 'Killer',
      chapter_name: 'End Transmission',
      avatar_url: '/img/singularity.png',
    } as any,
    {
      id: 14,
      name: 'The Legion',
      role: 'Killer',
      chapter_name: 'Darkness Among Us',
      avatar_url: '/img/legion.png',
    } as any,
    {
      id: 1,
      name: 'The Trapper',
      role: 'Killer',
      chapter_name: 'Base Game',
      avatar_url: '/img/trapper.png',
    } as any,
  ],
  survivors: [
    {
      id: 43,
      name: 'Lara Croft',
      role: 'Survivor',
      chapter_name: 'Tomb Raider™',
      avatar_url: '/img/lara.png',
    } as any,
    {
      id: 14,
      name: 'Adam Francis',
      role: 'Survivor',
      chapter_name: 'Shattered Bloodlines',
      avatar_url: '/img/adam.png',
    } as any,
    {
      id: 1,
      name: 'Dwight Fairfield',
      role: 'Survivor',
      chapter_name: 'Base Game',
      avatar_url: '/img/dwight.png',
    } as any,
  ],
  perks: [
    {
      id: 101,
      name: 'Sprint Burst',
      role: 'Survivor',
      icon_url: '/img/sb.png',
      character_name: 'Meg Thomas',
    } as any,
  ],
  realms: [
    {
      id: 5,
      name: 'MacMillan Estate',
      image_url: '/img/macmillan.png',
    } as any,
  ],
};

// Simulation of CharacterAutocomplete pool builder
function buildPool(
  catalog: MinigameCatalog,
  targetType: string = 'character',
  excludeKeys: string[] = []
) {
  const excludedKeySet = new Set(excludeKeys.map((k) => k.toLowerCase()));

  const isExcluded = (role: string, id: number | string, name: string) => {
    const lowerRole = (role || '').toLowerCase();
    const strId = String(id);
    return (
      excludedKeySet.has(`${lowerRole}:${strId}`) ||
      excludedKeySet.has(name.toLowerCase())
    );
  };

  const rawKillers = catalog.killers || [];
  const rawSurvivors = catalog.survivors || [];

  if (targetType === 'realm') {
    return (catalog.realms || [])
      .filter((r) => !isExcluded('realm', r.id, r.name))
      .map((r) => ({ id: r.id, name: r.name, role: 'Realm' }));
  }

  if (targetType === 'perk') {
    return (catalog.perks || [])
      .filter((p) => !isExcluded('perk', p.id, p.name))
      .map((p) => ({ id: p.id, name: p.name, role: p.role }));
  }

  if (targetType === 'killer') {
    return rawKillers
      .filter((k: any) => !isExcluded('killer', k.id, k.name))
      .map((k: any) => ({ id: k.id, name: k.name, role: 'Killer' }));
  }

  if (targetType === 'survivor') {
    return rawSurvivors
      .filter((s: any) => !isExcluded('survivor', s.id, s.name))
      .map((s: any) => ({ id: s.id, name: s.name, role: 'Survivor' }));
  }

  // Combined character pool
  const combined: any[] = [];
  rawKillers.forEach((k: any) => {
    if (!isExcluded('killer', k.id, k.name)) {
      combined.push({ id: k.id, name: k.name, role: 'Killer', subtitle: `Killer • ${k.chapter_name}` });
    }
  });
  rawSurvivors.forEach((s: any) => {
    if (!isExcluded('survivor', s.id, s.name)) {
      combined.push({ id: s.id, name: s.name, role: 'Survivor', subtitle: `Survivor • ${s.chapter_name}` });
    }
  });
  return combined.sort((a, b) => a.name.localeCompare(b.name));
}

// Simulation of CharacterAutocomplete filter/ranking
function searchItems(pool: any[], query: string) {
  if (!query.trim()) return pool.slice(0, 12);
  const clean = query.toLowerCase().trim();
  return pool
    .filter(
      (item) =>
        item.name.toLowerCase().includes(clean) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(clean))
    )
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(clean);
      const bStarts = b.name.toLowerCase().startsWith(clean);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 15);
}

describe('Minigame Autocomplete & Search Pool Verification', () => {
  it('combines both killers and survivors when targetType is "character"', () => {
    const pool = buildPool(mockCatalog, 'character');
    assert.strictEqual(pool.length, 6, 'Pool must contain all 3 killers and 3 survivors');

    const hasLara = pool.some((c) => c.name === 'Lara Croft' && c.role === 'Survivor');
    const hasSingularity = pool.some((c) => c.name === 'The Singularity' && c.role === 'Killer');
    assert.ok(hasLara, 'Lara Croft must be present in character pool');
    assert.ok(hasSingularity, 'The Singularity must be present in character pool');
  });

  it('correctly returns both Lara Croft and The Singularity when querying "lar"', () => {
    const pool = buildPool(mockCatalog, 'character');
    const results = searchItems(pool, 'lar');

    assert.strictEqual(results.length, 2, 'Typing "lar" must return exactly 2 items');
    assert.strictEqual(results[0].name, 'Lara Croft', 'Lara Croft must be ranked #1 due to prefix match');
    assert.strictEqual(results[0].role, 'Survivor');
    assert.strictEqual(results[1].name, 'The Singularity', 'The Singularity must be ranked #2');
    assert.strictEqual(results[1].role, 'Killer');
  });

  it('restricts to killers only when targetType is "killer"', () => {
    const pool = buildPool(mockCatalog, 'killer');
    assert.strictEqual(pool.length, 3);
    assert.ok(pool.every((c) => c.role === 'Killer'));
    assert.ok(!pool.some((c) => c.name === 'Lara Croft'));
  });

  it('restricts to survivors only when targetType is "survivor"', () => {
    const pool = buildPool(mockCatalog, 'survivor');
    assert.strictEqual(pool.length, 3);
    assert.ok(pool.every((c) => c.role === 'Survivor'));
    assert.ok(pool.some((c) => c.name === 'Lara Croft'));
  });

  it('excludes items by role:id without collisions on identical IDs', () => {
    // Both The Trapper (killer:1) and Dwight Fairfield (survivor:1) share ID 1
    const pool1 = buildPool(mockCatalog, 'character', ['survivor:1']);
    const hasDwight = pool1.some((c) => c.name === 'Dwight Fairfield');
    const hasTrapper = pool1.some((c) => c.name === 'The Trapper');

    assert.strictEqual(hasDwight, false, 'Dwight Fairfield (survivor:1) must be excluded');
    assert.strictEqual(hasTrapper, true, 'The Trapper (killer:1) must NOT be excluded when survivor:1 is excluded');

    // Both The Legion (killer:14) and Adam Francis (survivor:14) share ID 14
    const pool2 = buildPool(mockCatalog, 'character', ['killer:14']);
    const hasLegion = pool2.some((c) => c.name === 'The Legion');
    const hasAdam = pool2.some((c) => c.name === 'Adam Francis');

    assert.strictEqual(hasLegion, false, 'The Legion (killer:14) must be excluded');
    assert.strictEqual(hasAdam, true, 'Adam Francis (survivor:14) must NOT be excluded when killer:14 is excluded');
  });
});
