// frontend/src/__tests__/unit/generatorHardeningAndStorage.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  safeGetJSON,
  safeSetJSON,
  safeRemoveItem,
  getDrawnPerksForRole,
  saveDrawnPerksForRole,
  clearDrawnPerksForRole,
  getActiveMutatorForRole,
  saveActiveMutatorForRole,
  getStoredGeneratorState,
  saveStoredGeneratorState,
  GENERATOR_STORAGE_KEY,
} from '@/components/generator/lib/generatorStorage';
import {
  computeEligiblePool,
  computePlayablePool,
  filterPerksByMutator,
  pickRandomLoadout,
  buildDrawnSlots,
  isExhaustionPerk,
  isHexOrBoonPerk,
} from '@/components/generator/lib/perkPicker';
import { Perk } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';

// In-memory localStorage mock for node environment
function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get _store() {
      return store;
    },
  };
}

const mockPerks: Perk[] = [
  {
    id: 1,
    name: 'Sprint Burst',
    category: 'Survivor',
    character: 'Meg Thomas',
    description: 'When starting to run, break into a sprint. Causes Exhausted for 40 seconds.',
    icon_url: '/icons/sprint_burst.png',
    icon_local_path: '/icons/sprint_burst.png',
    is_owned: true,
  },
  {
    id: 2,
    name: 'Adrenaline',
    category: 'Survivor',
    character: 'Meg Thomas',
    description: 'Instantly heal one health state and sprint away. Causes Exhausted for 40 seconds.',
    icon_url: '/icons/adrenaline.png',
    icon_local_path: '/icons/adrenaline.png',
    is_owned: true,
  },
  {
    id: 3,
    name: 'Bond',
    category: 'Survivor',
    character: 'Dwight Fairfield',
    description: 'See the aura of nearby allies.',
    icon_url: '/icons/bond.png',
    icon_local_path: '/icons/bond.png',
    is_owned: true,
  },
  {
    id: 4,
    name: 'Boon: Circle of Healing',
    category: 'Survivor',
    character: 'Mikaela Reid',
    description: 'Bless a dull or hex totem to create a Boon.',
    icon_url: '/icons/boon.png',
    icon_local_path: '/icons/boon.png',
    is_owned: true,
  },
  {
    id: 5,
    name: 'Hex: Ruin',
    category: 'Killer',
    character: 'The Hag',
    description: 'All generators automatically regress when not being repaired.',
    icon_url: '/icons/hex_ruin.png',
    icon_local_path: '/icons/hex_ruin.png',
    is_owned: true,
  },
  {
    id: 6,
    name: 'Barbecue & Chilli',
    category: 'Killer',
    character: 'The Cannibal',
    description: 'After hooking a survivor, see the auras of other survivors.',
    icon_url: '/icons/bbq.png',
    icon_local_path: '/icons/bbq.png',
    is_owned: true,
  },
];

test('generatorStorage: safe JSON handling and corruption recovery', async (t) => {
  const originalLocalStorage = globalThis.localStorage;
  const mockStorage = createMockLocalStorage();
  globalThis.localStorage = mockStorage as any;

  await t.test('safeGetJSON returns fallback when key is not found', () => {
    const res = safeGetJSON('non_existent_key', ['default_value']);
    assert.deepStrictEqual(res, ['default_value']);
  });

  await t.test('safeGetJSON gracefully handles malformed JSON without throwing', () => {
    mockStorage.setItem('corrupted_key', '{not valid json:');
    const res = safeGetJSON('corrupted_key', { fallback: true });
    assert.deepStrictEqual(res, { fallback: true });
  });

  await t.test('safeGetJSON returns fallback when type mismatch occurs', () => {
    // Stored a number, but fallback expects an array
    mockStorage.setItem('number_key', '12345');
    const arrayRes = safeGetJSON<string[]>('number_key', ['fallback_perk']);
    assert.deepStrictEqual(arrayRes, ['fallback_perk']);

    // Stored an array, but fallback expects an object
    mockStorage.setItem('array_key', '["item1", "item2"]');
    const objRes = safeGetJSON<Record<string, string>>('array_key', { mode: 'default' });
    assert.deepStrictEqual(objRes, { mode: 'default' });
  });

  await t.test('safeSetJSON returns false when localStorage throws (quota exceeded)', () => {
    const errorStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError: DOMException 22');
      },
      removeItem: () => {},
      clear: () => {},
    };
    globalThis.localStorage = errorStorage as any;

    const success = safeSetJSON('test_key', { some: 'data' });
    assert.strictEqual(success, false);

    globalThis.localStorage = mockStorage as any;
  });

  globalThis.localStorage = originalLocalStorage;
});

test('generatorStorage: role-isolated drawn perk persistence', async (t) => {
  const originalLocalStorage = globalThis.localStorage;
  const mockStorage = createMockLocalStorage();
  globalThis.localStorage = mockStorage as any;

  await t.test('saves and loads drawn perks strictly isolated by role', () => {
    saveDrawnPerksForRole('Survivor', ['Sprint Burst', 'Adrenaline']);
    saveDrawnPerksForRole('Killer', ['Hex: Ruin']);

    assert.deepStrictEqual(getDrawnPerksForRole('Survivor'), ['Sprint Burst', 'Adrenaline']);
    assert.deepStrictEqual(getDrawnPerksForRole('Killer'), ['Hex: Ruin']);
  });

  await t.test('deduplicates perk names and strips empty strings', () => {
    saveDrawnPerksForRole('Survivor', ['Bond', 'Bond', '', '  ', 'Sprint Burst']);
    const loaded = getDrawnPerksForRole('Survivor');
    assert.deepStrictEqual(loaded, ['Bond', 'Sprint Burst']);
  });

  await t.test('clearDrawnPerksForRole clears only targeted role', () => {
    clearDrawnPerksForRole('Survivor');
    assert.deepStrictEqual(getDrawnPerksForRole('Survivor'), []);
    assert.deepStrictEqual(getDrawnPerksForRole('Killer'), ['Hex: Ruin']);
  });

  await t.test('mutator state is isolated and persists across roles', () => {
    const survivorMutator: ChaosMutator = {
      id: 'no_exhaustion',
      name: 'No Exhaustion',
      description: 'Exhaustion perks are forbidden',
      type: 'curse',
      icon: 'no_exhaustion',
      badgeBg: 'bg-red-500',
      borderColor: 'border-red-500',
      textColor: 'text-red-500',
    };

    saveActiveMutatorForRole('Survivor', survivorMutator);
    assert.deepStrictEqual(getActiveMutatorForRole('Survivor')?.id, 'no_exhaustion');
    assert.strictEqual(getActiveMutatorForRole('Killer'), null);

    saveActiveMutatorForRole('Survivor', null);
    assert.strictEqual(getActiveMutatorForRole('Survivor'), null);
  });

  await t.test('persists full generator state cleanly to storage key', () => {
    const state = {
      role: 'Survivor' as const,
      genMode: 'wheel' as const,
      noRepeatPerks: true,
      spinDurationSec: 4,
      loadout: [null, null, null, null],
      activeSlotIdx: 1,
      blindMode: false,
      activeMutator: null,
    };

    saveStoredGeneratorState(state);
    const loaded = getStoredGeneratorState();
    assert.strictEqual(loaded?.role, 'Survivor');
    assert.strictEqual(loaded?.genMode, 'wheel');
    assert.strictEqual(loaded?.spinDurationSec, 4);
    assert.strictEqual(loaded?.activeSlotIdx, 1);
  });

  globalThis.localStorage = originalLocalStorage;
});

test('perkPicker: pool computation and No-Repeat mode rules', async (t) => {
  const survivorPerks = mockPerks.filter((p) => p.category === 'Survivor');

  await t.test('when noRepeatPerks is false, full eligible pool is always returned', () => {
    const pool = computePlayablePool(survivorPerks, false, ['Sprint Burst', 'Adrenaline']);
    assert.strictEqual(pool.length, survivorPerks.length);
    assert.ok(pool.some((p) => p.name === 'Sprint Burst'));
    assert.ok(pool.some((p) => p.name === 'Adrenaline'));
  });

  await t.test('when noRepeatPerks is true, drawn perks are excluded', () => {
    const pool = computePlayablePool(survivorPerks, true, ['Sprint Burst']);
    assert.strictEqual(pool.length, survivorPerks.length - 1);
    assert.ok(!pool.some((p) => p.name === 'Sprint Burst'));
    assert.ok(pool.some((p) => p.name === 'Bond'));
  });

  await t.test('when all perks are drawn in no-repeat mode, falls back safely to eligible pool', () => {
    const allNames = survivorPerks.map((p) => p.name);
    const pool = computePlayablePool(survivorPerks, true, allNames);
    // Graceful fallback prevents blank wheels and stage crashes
    assert.strictEqual(pool.length, survivorPerks.length);
  });

  await t.test('toggling noRepeatPerks off restores all perks, toggling on restores exclusion', () => {
    const drawn = ['Sprint Burst', 'Adrenaline'];
    // No repeat OFF: full pool
    const poolOff = computePlayablePool(survivorPerks, false, drawn);
    assert.strictEqual(poolOff.length, 4);

    // No repeat ON: only remaining 2 perks
    const poolOn = computePlayablePool(survivorPerks, true, drawn);
    assert.strictEqual(poolOn.length, 2);
    assert.deepStrictEqual(poolOn.map((p) => p.name).sort(), ['Bond', 'Boon: Circle of Healing'].sort());
  });
});

test('perkPicker: mutator pool filtering across modes', async (t) => {
  const survivorPerks = mockPerks.filter((p) => p.category === 'Survivor');

  await t.test('no_exhaustion mutator filters out exhaustion perks', () => {
    const mutator: ChaosMutator = {
      id: 'no_exhaustion',
      name: 'No Exhaustion',
      description: 'Ban exhaustion',
      type: 'curse',
      icon: 'no_exhaustion',
      badgeBg: 'bg-red-500',
      borderColor: 'border-red-500',
      textColor: 'text-red-500',
    };

    const filtered = filterPerksByMutator(survivorPerks, mutator);
    assert.ok(!filtered.some((p) => p.name === 'Sprint Burst'));
    assert.ok(!filtered.some((p) => p.name === 'Adrenaline'));
    assert.ok(filtered.some((p) => p.name === 'Bond'));
  });

  await t.test('hex_boon_only mutator isolates hex and boon perks', () => {
    const mutator: ChaosMutator = {
      id: 'hex_boon_only',
      name: 'Hexes & Boons',
      description: 'Totems only',
      type: 'buff',
      icon: 'hex_boon_only',
      badgeBg: 'bg-indigo-500',
      borderColor: 'border-indigo-500',
      textColor: 'text-indigo-500',
    };

    const filtered = filterPerksByMutator(survivorPerks, mutator);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].name, 'Boon: Circle of Healing');
  });

  await t.test('pickRandomLoadout selects requested count and no duplicates', () => {
    const loadout = pickRandomLoadout(survivorPerks, null, 3);
    assert.strictEqual(loadout.length, 3);
    const names = new Set(loadout.map((p) => p.name));
    assert.strictEqual(names.size, 3);
  });

  await t.test('buildDrawnSlots computes page and index accurately', () => {
    const sorted = [...survivorPerks].sort((a, b) => a.name.localeCompare(b.name));
    const slots = buildDrawnSlots([sorted[0]], sorted, 15);
    assert.strictEqual(slots.length, 1);
    assert.strictEqual(slots[0].page, 1);
    assert.strictEqual(slots[0].slot, 1);
  });
});
