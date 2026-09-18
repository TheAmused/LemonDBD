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
import { getMutatorDisplayLines, CHAOS_MUTATORS } from '@/components/ChaosWheelModal';
import { getAudioEnabled, setAudioEnabled } from '@/utils/perkAudio';

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
    curse_category: 'exhaustion',
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
    curse_category: 'exhaustion',
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
    curse_category: 'aura_reading',
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
    curse_category: 'boon',
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
    curse_category: 'hex',
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
    curse_category: 'aura_reading',
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

test('ChaosWheelModal: text and icon geometry & display line splitting', async (t) => {
  await t.test('getMutatorDisplayLines splits standard mutators into balanced 2-line pairs', () => {
    const expectedMappings: Record<string, [string, string]> = {
      no_exhaustion: ['No Exhaustion', 'Perks'],
      blindness: ['Curse of', 'Blindness'],
      solo_queue: ['Curse of', 'Solitude'],
      meme_loadout: ['Meme / Off-Meta', 'Loadout'],
      hex_boon_only: ['Hex & Boon', 'Ritual'],
      negative_only: ['Curse of', 'Sacrifice'],
    };

    for (const m of CHAOS_MUTATORS) {
      const result = getMutatorDisplayLines(m);
      assert.deepStrictEqual(result, expectedMappings[m.id], `Failed for mutator id "${m.id}"`);
      // Also supports passing id string directly
      assert.deepStrictEqual(getMutatorDisplayLines(m.id), expectedMappings[m.id]);
    }
  });

  await t.test('getMutatorDisplayLines handles single-word, multi-word, and edge-case inputs gracefully', () => {
    assert.deepStrictEqual(getMutatorDisplayLines('Curse'), ['Curse', '']);
    assert.deepStrictEqual(getMutatorDisplayLines('Fatal Wound'), ['Fatal', 'Wound']);
    assert.deepStrictEqual(getMutatorDisplayLines('No Items Allowed'), ['No Items', 'Allowed']);
    assert.deepStrictEqual(getMutatorDisplayLines('One Two Three Four'), ['One Two', 'Three Four']);
    assert.deepStrictEqual(getMutatorDisplayLines('A B C D E'), ['A B C', 'D E']);
    assert.deepStrictEqual(getMutatorDisplayLines(''), ['', '']);
    assert.deepStrictEqual(getMutatorDisplayLines('   '), ['', '']);
    assert.deepStrictEqual(getMutatorDisplayLines(null), ['', '']);
    assert.deepStrictEqual(getMutatorDisplayLines(undefined), ['', '']);
  });

  await t.test('slice gondola center coordinates remain within wheel bounds and upright across 360 deg spins', () => {
    const outerRadius = 240;
    const innerRadius = 38;
    const contentRadius = 145;
    const center = 250;
    const totalSlices = CHAOS_MUTATORS.length;
    const sliceAngle = (2 * Math.PI) / totalSlices;

    const testAngles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 2, Math.PI, 1.5 * Math.PI, 2 * Math.PI, 7.35 * Math.PI];

    for (const spinAngle of testAngles) {
      for (let i = 0; i < totalSlices; i++) {
        const midAngle = spinAngle + i * sliceAngle + sliceAngle / 2;
        const cx = center + contentRadius * Math.cos(midAngle);
        const cy = center + contentRadius * Math.sin(midAngle);

        // Assert coordinates are strictly finite real numbers
        assert.ok(Number.isFinite(cx), `cx is not finite at spin ${spinAngle}, slice ${i}`);
        assert.ok(Number.isFinite(cy), `cy is not finite at spin ${spinAngle}, slice ${i}`);

        // Distance from center must equal contentRadius exactly
        const distFromCenter = Math.hypot(cx - center, cy - center);
        assert.ok(Math.abs(distFromCenter - contentRadius) < 1e-6);

        // Content orbit is safely between inner hub and outer rim
        assert.ok(distFromCenter > innerRadius + 20, 'Content center overlaps inner hub');
        assert.ok(distFromCenter < outerRadius - 20, 'Content center overlaps outer rim');
      }
    }
  });
});

test('perkPicker: boundary conditions & extreme cases', async (t) => {
  await t.test('empty perk list returns empty array safely across all picker functions', () => {
    const emptyPool: Perk[] = [];

    assert.deepStrictEqual(computeEligiblePool(emptyPool, 'Survivor', false), []);
    assert.deepStrictEqual(computePlayablePool(emptyPool, true, ['Sprint Burst']), []);
    assert.deepStrictEqual(computePlayablePool(emptyPool, false, []), []);
    assert.deepStrictEqual(pickRandomLoadout(emptyPool, null, 4), []);
    assert.deepStrictEqual(buildDrawnSlots([], emptyPool, 15), []);
  });


  await t.test('pool smaller than requested loadout count returns available perks without duplicating or throwing', () => {
    const smallPool: Perk[] = [mockPerks[0], mockPerks[1]]; // Only 2 perks
    const loadout = pickRandomLoadout(smallPool, null, 4);

    assert.strictEqual(loadout.length, 2);
    assert.strictEqual(new Set(loadout.map((p) => p.name)).size, 2);
  });

  await t.test('perks with unicode and accented characters handle deduplication and sorting correctly', () => {
    const unicodePerks: Perk[] = [
      {
        id: 101,
        name: 'Déjà Vu',
        category: 'Survivor',
        character: 'General',
        description: 'Shows aura of 3 generators close to each other.',
        icon_url: '/icons/deja_vu.png',
        icon_local_path: '/icons/deja_vu.png',
        is_owned: true,
      },
      {
        id: 102,
        name: 'Coup de Grâce',
        category: 'Killer',
        character: 'The Twins',
        description: 'Increases lunge distance.',
        icon_url: '/icons/coup.png',
        icon_local_path: '/icons/coup.png',
        is_owned: true,
      },
      {
        id: 103,
        name: 'Autodidact 🎯',
        category: 'Survivor',
        character: 'Adam Francis',
        description: 'Starts with progression penalty on skill checks.',
        icon_url: '/icons/autodidact.png',
        icon_local_path: '/icons/autodidact.png',
        is_owned: true,
      },
    ];

    const drawn = ['Déjà Vu', 'Autodidact 🎯'];
    const playable = computePlayablePool(unicodePerks, true, drawn);
    assert.strictEqual(playable.length, 1);
    assert.strictEqual(playable[0].name, 'Coup de Grâce');
  });

  await t.test('mutator filtering when no matching perks exist returns graceful fallback', () => {
    // Survivor pool has no hex perks
    const pureSurvivorPerks = mockPerks.filter((p) => p.category === 'Survivor' && !p.name.includes('Boon'));
    const hexOnlyMutator: ChaosMutator = {
      id: 'hex_boon_only',
      name: 'Hexes & Boons Only',
      description: 'Only hexes and boons',
      type: 'curse',
      icon: 'hex',
      badgeBg: 'bg-purple-500',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-500',
    };

    const filtered = filterPerksByMutator(pureSurvivorPerks, hexOnlyMutator);
    // Gracefully returns full survivor pool fallback instead of crashing with 0 perks
    assert.strictEqual(filtered.length, pureSurvivorPerks.length);
  });
});

test('generatorStorage: corrupted data & edge-case resilience', async (t) => {
  const originalWindow = globalThis.window;

  t.afterEach(() => {
    globalThis.window = originalWindow;
  });

  await t.test('safeGetJSON returns fallback on corrupted/malformed JSON strings', () => {
    const mock = createMockLocalStorage();
    globalThis.window = { localStorage: mock } as any;

    mock.setItem('corrupted_key', '{ invalid json [');
    const result = safeGetJSON('corrupted_key', { fallback: true });
    assert.deepStrictEqual(result, { fallback: true });
  });

  await t.test('getStoredGeneratorState handles null, empty string, and primitive values safely', () => {
    const mock = createMockLocalStorage();
    globalThis.window = { localStorage: mock } as any;

    mock.setItem(GENERATOR_STORAGE_KEY, '');
    assert.deepStrictEqual(getStoredGeneratorState(), null);

    mock.setItem(GENERATOR_STORAGE_KEY, '"just a string"');
    // Primitive string is not a valid object shape, returns null safely
    const state = getStoredGeneratorState();
    assert.strictEqual(state, null);

    mock.setItem(GENERATOR_STORAGE_KEY, '42');
    assert.deepStrictEqual(getStoredGeneratorState(), null);
  });

  await t.test('getDrawnPerksForRole sanitizes non-array or mixed-type storage entries', () => {
    const mock = createMockLocalStorage();
    globalThis.window = { localStorage: mock } as any;

    // Put a non-array structure
    mock.setItem('lemon_drawn_perks_Survivor', '{"invalid":"structure"}');
    assert.deepStrictEqual(getDrawnPerksForRole('Survivor'), []);

    // Put mixed values in array
    mock.setItem('lemon_drawn_perks_Survivor', JSON.stringify(['Sprint Burst', null, 123, 'Bond']));
    const drawn = getDrawnPerksForRole('Survivor');
    // Only valid strings preserved
    assert.deepStrictEqual(drawn, ['Sprint Burst', 'Bond']);
  });


  await t.test('audio settings getter and setter handle corrupted storage without exceptions', () => {
    const mock = createMockLocalStorage();
    globalThis.window = { localStorage: mock } as any;

    // Default without storage is true
    assert.strictEqual(getAudioEnabled(), true);

    setAudioEnabled(false);
    assert.strictEqual(getAudioEnabled(), false);

    setAudioEnabled(true);
    assert.strictEqual(getAudioEnabled(), true);

    // Corrupt the key with garbage text
    mock.setItem('lemon_dbd_audio_enabled_v1', 'unparseable');
    // Should safely fallback to true
    assert.strictEqual(getAudioEnabled(), true);
  });

  await t.test('GENERATOR_STORAGE_KEY uses v9 to isolate pristine wheel generator state', () => {
    assert.strictEqual(GENERATOR_STORAGE_KEY, 'lemon_dbd_generator_v9');
  });
});

