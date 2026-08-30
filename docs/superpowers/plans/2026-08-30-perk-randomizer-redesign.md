# Perk Randomizer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Perk Randomizer tab (`/perks?tab=generator`) with a borderless, no-banner, single-responsive-layout design, and add three new animated draw mechanics (Slot Machine, Tarot Deck, Loot Crate) alongside a reskinned Wheel and Instant mode.

**Architecture:** A new `src/components/generator/` directory replaces the monolithic `PerkGenerator.tsx` + `WheelOfFortune.tsx`. A pure-logic module (`lib/perkPicker.ts`) centralizes pool filtering/random-pick/mutator logic used by every mode. Five `modes/*Stage.tsx` components each own their reveal animation and report a finished result through one shared callback shape (`DrawnSlot[]`), rendered inside a shared `StageFrame` ambient backdrop, with results always landing in one shared `LoadoutHotbar`.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind CSS v4 / lucide-react. New: `framer-motion` (animation), `canvas-confetti` (win-moment bursts). Reused as-is: `@tsparticles/react` + `@tsparticles/slim` (ambient particles, already used by `GauntletFireBackground.tsx`), `perkAudio.ts` (procedural Web Audio SFX, no new audio files).

## Global Constraints

- No backend changes. `gen_mode` persists as an unconstrained string column (`backend/app/services/db/raw_schema.py:119`) — new mode values need no schema/migration work.
- No changes outside the generator tab: Perks Vault page/header, `PerkCard.tsx`, `PerkModal.tsx`, `CharacterConfigModal.tsx`, `ChaosWheelModal.tsx`, and `CHAOS_MUTATORS` content are untouched (the two modals are only re-wired into the new toolbar).
- Perk icons and character avatars are borderless everywhere in the generator (drop-shadow + role-colored glow only, no ring/border circle).
- The `[P{page}/S{slot}]` coordinate tag is preserved on every perk display in every mode.
- No full-width gradient banner blocks anywhere in the generator.
- Single Stage Flow layout: identical structural order at every breakpoint (one centered column; desktop just gets more room, not a rearranged layout); the 4-slot loadout renders as a sticky bottom hotbar.
- All 5 modes (`wheel`, `instant`, `slot`, `tarot`, `crate`) produce results through one shared shape: `DrawnSlot = { page: number; slot: number; perk?: Perk }`.
- All animations respect `prefers-reduced-motion` via framer-motion's `useReducedMotion`.
- Card/crate/reel trigger controls are real `<button>` elements; every reveal fires an `aria-live="polite"` announcement.
- New user-facing copy is added to all 5 locale files (`en`, `de`, `es`, `ja`, `pl`) under `src/locales/<locale>/generator.ts` — the existing parity test (`src/__tests__/unit/i18nTranslations.test.ts`) fails the build if any locale is missing a key present in `en`.
- Test runner is Node's built-in `node:test` via `tsx --test` (see `package.json` `test:unit` script) — there is no component-render test harness (no jsdom/RTL) in this codebase. Unit tests in this plan target pure-logic modules (`lib/perkPicker.ts`, `utils/cn.ts`) only, matching existing convention (e.g. `perkUtils.test.ts`). UI component tasks are verified via `npx tsc --noEmit` (typecheck) and a manual dev-server check, not fabricated component tests.
- Follow existing fallback-string convention: every `dict?.x?.y` access has an inline English fallback literal (e.g. `dict?.generator?.modeSlot || 'Slot Machine'`).

---

## File Structure

```
frontend/src/
  utils/cn.ts                                   # new: clsx + tailwind-merge helper
  components/
    PerkGenerator.tsx                           # deleted (migrated into generator/GeneratorPage.tsx)
    WheelOfFortune.tsx                          # deleted (migrated into generator/modes/WheelStage.tsx)
    generator/
      GeneratorPage.tsx                         # new: orchestrator (was PerkGenerator.tsx)
      Toolbar.tsx                               # new: slim icon toolbar (role, no-repeat, characters, chaos, audio, reset)
      ModeSwitcher.tsx                          # new: 5-way mode pill selector
      LoadoutHotbar.tsx                         # new: sticky bottom 4-slot dock
      shared/
        SegmentedControl.tsx                    # new: generic pill-group primitive
        IconToggleButton.tsx                    # new: generic icon+tooltip toolbar button
        PerkSlot.tsx                            # new: canonical borderless perk display + coordinate tag
        StageFrame.tsx                          # new: ambient backdrop (tsparticles + fog)
        useJackpotCelebration.ts                # new: confetti + fanfare + flavor-line hook
      modes/
        WheelStage.tsx                          # new: migrated WheelOfFortune.tsx, reskinned
        InstantStage.tsx                        # new: reskinned Instant Roll
        SlotMachineStage.tsx                    # new: 4-reel slot machine
        TarotDeckStage.tsx                      # new: fanned card-flip deck
        LootCrateStage.tsx                      # new: shake-and-open crate
      lib/
        perkPicker.ts                           # new: shared pool/filter/random-pick logic
  types/
    perks.ts                                    # modified: GeneratorMode extended
    chaos.ts                                    # modified: WheelWinSlotPayload removed (unused after migration)
  app/[locale]/perks/page.tsx                    # modified: import GeneratorPage instead of PerkGenerator
  locales/{en,de,es,ja,pl}/generator.ts          # modified: new mode/flavor copy keys
  __tests__/unit/
    cn.test.ts                                  # new
    perkPicker.test.ts                          # new
```

---

### Task 1: `cn()` class-merging utility

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/utils/cn.ts`
- Test: `frontend/src/__tests__/unit/cn.test.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` — used by every shared component created in later tasks to compose conditional Tailwind class strings without manual ternary concatenation.

- [ ] **Step 1: Add the new dependencies**

Run:
```bash
cd frontend
npm install framer-motion canvas-confetti
npm install -D @types/canvas-confetti
```

Expected: `package.json` `dependencies` gains `framer-motion` and `canvas-confetti`; `devDependencies` gains `@types/canvas-confetti`. `clsx` and `tailwind-merge` are already present in `dependencies` (confirmed in `frontend/package.json`) — no install needed for those.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/__tests__/unit/cn.test.ts`:

```ts
// frontend/src/__tests__/unit/cn.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { cn } from '@/utils/cn';

test('cn: merges plain class strings in order', () => {
  assert.strictEqual(cn('a', 'b', 'c'), 'a b c');
});

test('cn: filters out falsy values', () => {
  assert.strictEqual(cn('a', false, undefined, null, '', 'b'), 'a b');
});

test('cn: resolves conflicting tailwind utility classes to the last one', () => {
  assert.strictEqual(cn('px-2 py-1', 'px-4'), 'py-1 px-4');
});

test('cn: supports conditional object syntax', () => {
  assert.strictEqual(cn('base', { active: true, hidden: false }), 'base active');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/cn.test.ts`
Expected: FAIL — `Cannot find module '@/utils/cn'` (or similar module-not-found error).

- [ ] **Step 4: Write the implementation**

Create `frontend/src/utils/cn.ts`:

```ts
// frontend/src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/cn.test.ts`
Expected: PASS (4 tests, 0 failures).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/utils/cn.ts frontend/src/__tests__/unit/cn.test.ts
git commit -m "feat(generator): add framer-motion/canvas-confetti deps and cn() utility"
```

---

### Task 2: Shared perk-picker logic (`lib/perkPicker.ts`)

**Files:**
- Create: `frontend/src/components/generator/lib/perkPicker.ts`
- Test: `frontend/src/__tests__/unit/perkPicker.test.ts`

**Interfaces:**
- Consumes: `Perk`, `RoleCategory`, `DrawnSlot` from `@/types/perks`; `ChaosMutator` from `@/types/chaos`; `EXHAUSTION_PERK_NAMES`, `MEME_PERK_NAMES` from `@/constants/chaosMutators`.
- Produces (used by every task from Task 12 onward):
  - `isExhaustionPerk(perk: Perk): boolean`
  - `isHexOrBoonPerk(perk: Perk): boolean`
  - `isMemePerk(perk: Perk): boolean`
  - `isPerkBlockedByMutator(perk: Perk, mutator?: ChaosMutator | null): boolean`
  - `filterPerksByMutator(perks: Perk[], mutator?: ChaosMutator | null): Perk[]`
  - `computeEligiblePool(allPerks: Perk[], role: RoleCategory, enabledCharacters: string[], isLoggedIn: boolean): Perk[]`
  - `computePlayablePool(eligiblePool: Perk[], noRepeatPerks: boolean, drawnPerkNames: string[]): Perk[]`
  - `pickRandomLoadout(pool: Perk[], mutator?: ChaosMutator | null, count?: number): Perk[]`
  - `buildDrawnSlots(pickedPerks: Perk[], sortedPool: Perk[], perksPerPage?: number): DrawnSlot[]`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/__tests__/unit/perkPicker.test.ts`:

```ts
// frontend/src/__tests__/unit/perkPicker.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  isExhaustionPerk,
  isHexOrBoonPerk,
  isMemePerk,
  isPerkBlockedByMutator,
  filterPerksByMutator,
  computeEligiblePool,
  computePlayablePool,
  pickRandomLoadout,
  buildDrawnSlots,
} from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

function makePerk(overrides: Partial<Perk>): Perk {
  return {
    name: 'Test Perk',
    character: 'General',
    category: 'Survivor',
    description: '',
    icon_url: '',
    icon_local_path: '',
    ...overrides,
  };
}

const noExhaustionMutator: ChaosMutator = {
  id: 'no_exhaustion',
  name: 'No Exhaustion Perks',
  description: '',
  type: 'curse',
  icon: '🚫',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

const hexBoonMutator: ChaosMutator = {
  id: 'hex_boon_only',
  name: 'Hex & Boon Ritual',
  description: '',
  type: 'curse',
  icon: '🔮',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

const memeMutator: ChaosMutator = {
  id: 'meme_loadout',
  name: 'Meme / Off-Meta Loadout',
  description: '',
  type: 'curse',
  icon: '🤡',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

test('isExhaustionPerk: matches known exhaustion perk names case/whitespace-insensitively', () => {
  assert.ok(isExhaustionPerk(makePerk({ name: '  Dead Hard  ' })));
  assert.ok(isExhaustionPerk(makePerk({ name: 'SPRINT BURST' })));
  assert.ok(!isExhaustionPerk(makePerk({ name: 'Iron Will' })));
});

test('isExhaustionPerk: matches perks whose description mentions exhaustion', () => {
  assert.ok(isExhaustionPerk(makePerk({ name: 'Made-Up Perk', description: 'You become Exhausted for 60 seconds.' })));
  assert.ok(isExhaustionPerk(makePerk({ name: 'Made-Up Perk', description: 'Suffer from the Exhaustion status effect.' })));
});

test('isHexOrBoonPerk: matches Hex:/Boon: prefixes in name or description', () => {
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Hex: Ruin' })));
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Boon: Circle of Healing' })));
  assert.ok(isHexOrBoonPerk(makePerk({ name: 'Made-Up', description: 'Applies a Hex: effect.' })));
  assert.ok(!isHexOrBoonPerk(makePerk({ name: 'Sprint Burst' })));
});

test('isMemePerk: matches names in the MEME_PERK_NAMES set', () => {
  assert.ok(isMemePerk(makePerk({ name: 'No Mither' })));
  assert.ok(isMemePerk(makePerk({ name: '  Plot Twist  ' })));
  assert.ok(!isMemePerk(makePerk({ name: 'Sprint Burst' })));
});

test('isPerkBlockedByMutator: only no_exhaustion blocks, and only exhaustion perks', () => {
  assert.ok(isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), noExhaustionMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Iron Will' }), noExhaustionMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), hexBoonMutator));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), null));
  assert.ok(!isPerkBlockedByMutator(makePerk({ name: 'Dead Hard' }), undefined));
});

test('filterPerksByMutator: returns all perks unchanged when mutator is null/undefined', () => {
  const perks = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  assert.deepStrictEqual(filterPerksByMutator(perks, null), perks);
  assert.deepStrictEqual(filterPerksByMutator(perks, undefined), perks);
});

test('filterPerksByMutator: no_exhaustion excludes exhaustion perks and keeps the rest', () => {
  const perks = [makePerk({ name: 'Dead Hard' }), makePerk({ name: 'Iron Will' }), makePerk({ name: 'Adrenaline' })];
  const result = filterPerksByMutator(perks, noExhaustionMutator);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].name, 'Iron Will');
});

test('filterPerksByMutator: hex_boon_only keeps only hex/boon perks among the pool', () => {
  const perks = [makePerk({ name: 'Hex: Ruin' }), makePerk({ name: 'Boon: Shadow Step' }), makePerk({ name: 'Iron Will' })];
  const result = filterPerksByMutator(perks, hexBoonMutator);
  assert.strictEqual(result.length, 2);
  assert.ok(result.every((p) => p.name.startsWith('Hex:') || p.name.startsWith('Boon:')));
});

test('filterPerksByMutator: hex_boon_only falls back to the full pool when no hex/boon perks exist', () => {
  const perks = [makePerk({ name: 'Iron Will' }), makePerk({ name: 'Sprint Burst' })];
  const result = filterPerksByMutator(perks, hexBoonMutator);
  assert.deepStrictEqual(result, perks);
});

test('filterPerksByMutator: meme_loadout keeps only meme perks, falling back when none exist', () => {
  const perksWithMeme = [makePerk({ name: 'No Mither' }), makePerk({ name: 'Iron Will' })];
  const resultWith = filterPerksByMutator(perksWithMeme, memeMutator);
  assert.strictEqual(resultWith.length, 1);
  assert.strictEqual(resultWith[0].name, 'No Mither');

  const perksWithoutMeme = [makePerk({ name: 'Iron Will' }), makePerk({ name: 'Sprint Burst' })];
  const resultWithout = filterPerksByMutator(perksWithoutMeme, memeMutator);
  assert.deepStrictEqual(resultWithout, perksWithoutMeme);
});

test('computeEligiblePool: filters by role, excludes unowned perks when logged in, includes General/generic-counterpart regardless of character toggle, sorts by name', () => {
  const allPerks: Perk[] = [
    makePerk({ name: 'Zebra Perk', category: 'Survivor', character: 'General', is_owned: true }),
    makePerk({ name: 'Alpha Perk', category: 'Survivor', character: 'Meg Thomas', is_owned: true }),
    makePerk({ name: 'Locked Perk', category: 'Survivor', character: 'Meg Thomas', is_owned: false }),
    makePerk({ name: 'Disabled Char Perk', category: 'Survivor', character: 'Claudette Morel', is_owned: true }),
    makePerk({ name: 'Killer Perk', category: 'Killer', character: 'General', is_owned: true }),
    makePerk({ name: 'Generic Counterpart', category: 'Survivor', character: 'Meg Thomas', is_owned: true, is_generic_counterpart: true }),
  ];

  const result = computeEligiblePool(allPerks, 'Survivor', ['Meg Thomas'], true);
  const names = result.map((p) => p.name);

  assert.deepStrictEqual(names, ['Alpha Perk', 'Generic Counterpart', 'Zebra Perk']);
  assert.ok(!names.includes('Locked Perk'), 'unowned perks must be excluded when logged in');
  assert.ok(!names.includes('Disabled Char Perk'), 'perks for disabled characters must be excluded');
  assert.ok(!names.includes('Killer Perk'), 'wrong-role perks must be excluded');
});

test('computeEligiblePool: does not filter by ownership when not logged in', () => {
  const allPerks: Perk[] = [
    makePerk({ name: 'Locked Perk', category: 'Survivor', character: 'General', is_owned: false }),
  ];
  const result = computeEligiblePool(allPerks, 'Survivor', [], false);
  assert.strictEqual(result.length, 1);
});

test('computePlayablePool: returns eligible pool unchanged when noRepeatPerks is false', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  assert.deepStrictEqual(computePlayablePool(pool, false, ['A']), pool);
});

test('computePlayablePool: excludes drawn perks when noRepeatPerks is true', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' }), makePerk({ name: 'C' })];
  const result = computePlayablePool(pool, true, ['A', 'C']);
  assert.deepStrictEqual(result.map((p) => p.name), ['B']);
});

test('computePlayablePool: falls back to the full eligible pool once everything has been drawn', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  const result = computePlayablePool(pool, true, ['A', 'B']);
  assert.deepStrictEqual(result, pool);
});

test('pickRandomLoadout: returns `count` distinct perks drawn from the pool', () => {
  const pool = Array.from({ length: 10 }, (_, i) => makePerk({ name: `Perk ${i}` }));
  const picked = pickRandomLoadout(pool, null, 4);
  assert.strictEqual(picked.length, 4);
  const uniqueNames = new Set(picked.map((p) => p.name));
  assert.strictEqual(uniqueNames.size, 4);
  picked.forEach((p) => assert.ok(pool.includes(p)));
});

test('pickRandomLoadout: returns at most pool.length perks when the pool is smaller than count', () => {
  const pool = [makePerk({ name: 'A' }), makePerk({ name: 'B' })];
  const picked = pickRandomLoadout(pool, null, 4);
  assert.strictEqual(picked.length, 2);
});

test('pickRandomLoadout: respects the active mutator filter before picking', () => {
  const pool = [makePerk({ name: 'Hex: Ruin' }), makePerk({ name: 'Boon: Shadow Step' }), makePerk({ name: 'Iron Will' })];
  const picked = pickRandomLoadout(pool, hexBoonMutator, 4);
  assert.ok(picked.every((p) => p.name.startsWith('Hex:') || p.name.startsWith('Boon:')));
});

test('buildDrawnSlots: computes page/slot coordinates from the perk\'s index in the sorted pool', () => {
  const sortedPool = Array.from({ length: 20 }, (_, i) => makePerk({ name: `Perk ${i}` }));
  const picked = [sortedPool[0], sortedPool[14], sortedPool[15], sortedPool[19]];

  const slots = buildDrawnSlots(picked, sortedPool, 15);

  assert.deepStrictEqual(slots[0], { page: 1, slot: 1, perk: sortedPool[0] });
  assert.deepStrictEqual(slots[1], { page: 1, slot: 15, perk: sortedPool[14] });
  assert.deepStrictEqual(slots[2], { page: 2, slot: 1, perk: sortedPool[15] });
  assert.deepStrictEqual(slots[3], { page: 2, slot: 5, perk: sortedPool[19] });
});

test('buildDrawnSlots: falls back to page 1 / slot 1 for a perk not found in the sorted pool', () => {
  const sortedPool = [makePerk({ name: 'A' })];
  const strayPerk = makePerk({ name: 'Not In Pool' });
  const slots = buildDrawnSlots([strayPerk], sortedPool, 15);
  assert.deepStrictEqual(slots[0], { page: 1, slot: 1, perk: strayPerk });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx tsx --test src/__tests__/unit/perkPicker.test.ts`
Expected: FAIL — `Cannot find module '@/components/generator/lib/perkPicker'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/generator/lib/perkPicker.ts`:

```ts
// frontend/src/components/generator/lib/perkPicker.ts
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { EXHAUSTION_PERK_NAMES, MEME_PERK_NAMES } from '@/constants/chaosMutators';

export function isExhaustionPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase().trim();
  const descLower = (perk.description || '').toLowerCase();
  return (
    EXHAUSTION_PERK_NAMES.has(nameLower) ||
    descLower.includes('exhausted') ||
    descLower.includes('exhaustion')
  );
}

export function isHexOrBoonPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  const descLower = (perk.description || '').toLowerCase();
  return (
    nameLower.includes('hex:') ||
    nameLower.includes('boon:') ||
    descLower.includes('hex:') ||
    descLower.includes('boon:')
  );
}

export function isMemePerk(perk: Perk): boolean {
  return MEME_PERK_NAMES.has(perk.name.toLowerCase().trim());
}

export function isPerkBlockedByMutator(
  perk: Perk,
  mutator?: ChaosMutator | null
): boolean {
  if (!mutator) return false;
  if (mutator.id === 'no_exhaustion') return isExhaustionPerk(perk);
  return false;
}

/**
 * Applies the active Chaos Mutator to a perk pool: first excludes any perk
 * explicitly blocked by the mutator (currently only `no_exhaustion`), then —
 * for inclusion-style mutators (`hex_boon_only`, `meme_loadout`) — narrows to
 * matching perks, falling back to the not-blocked list if that would empty
 * the pool. Shared by every draw mode so mutator behavior is identical
 * everywhere (previously only the Wheel applied hex_boon_only/meme_loadout).
 */
export function filterPerksByMutator(
  perks: Perk[],
  mutator?: ChaosMutator | null
): Perk[] {
  if (!mutator) return perks;

  const notBlocked = perks.filter((p) => !isPerkBlockedByMutator(p, mutator));

  let included: Perk[];
  if (mutator.id === 'hex_boon_only') {
    included = notBlocked.filter(isHexOrBoonPerk);
  } else if (mutator.id === 'meme_loadout') {
    included = notBlocked.filter(isMemePerk);
  } else {
    included = notBlocked;
  }

  return included.length > 0 ? included : notBlocked;
}

export function computeEligiblePool(
  allPerks: Perk[],
  role: RoleCategory,
  enabledCharacters: string[],
  isLoggedIn: boolean
): Perk[] {
  const rolePerks = allPerks.filter((p) => p.category === role);
  const enabledSet = new Set(enabledCharacters);

  const eligible = rolePerks.filter((p) => {
    if (isLoggedIn && p.is_owned === false) return false;
    const isGeneral =
      !p.character || p.character === 'General' || p.is_generic_counterpart;
    if (isGeneral) return true;
    return enabledSet.has(p.character);
  });

  return eligible.sort((a, b) => a.name.localeCompare(b.name));
}

export function computePlayablePool(
  eligiblePool: Perk[],
  noRepeatPerks: boolean,
  drawnPerkNames: string[]
): Perk[] {
  if (!noRepeatPerks) return eligiblePool;
  const drawnSet = new Set(drawnPerkNames);
  const remaining = eligiblePool.filter((p) => !drawnSet.has(p.name));
  return remaining.length > 0 ? remaining : eligiblePool;
}

export function pickRandomLoadout(
  pool: Perk[],
  mutator?: ChaosMutator | null,
  count: number = 4
): Perk[] {
  const candidates = [...filterPerksByMutator(pool, mutator)];
  const picked: Perk[] = [];
  const needed = Math.min(count, candidates.length);

  for (let i = 0; i < needed; i++) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    picked.push(candidates.splice(randomIndex, 1)[0]);
  }

  return picked;
}

export function buildDrawnSlots(
  pickedPerks: Perk[],
  sortedPool: Perk[],
  perksPerPage: number = 15
): DrawnSlot[] {
  return pickedPerks.map((perk) => {
    const indexInSorted = sortedPool.findIndex((p) => p.name === perk.name);
    const safeIndex = Math.max(0, indexInSorted);
    const page = Math.floor(safeIndex / perksPerPage) + 1;
    const slot = (safeIndex % perksPerPage) + 1;
    return { page, slot, perk };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx tsx --test src/__tests__/unit/perkPicker.test.ts`
Expected: PASS (all tests green, 0 failures).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/generator/lib/perkPicker.ts frontend/src/__tests__/unit/perkPicker.test.ts
git commit -m "feat(generator): extract shared perk-picker pool/filter/random-pick logic"
```

---

### Task 3: Locale copy for new modes

**Files:**
- Modify: `frontend/src/locales/en/generator.ts`
- Modify: `frontend/src/locales/de/generator.ts`
- Modify: `frontend/src/locales/es/generator.ts`
- Modify: `frontend/src/locales/ja/generator.ts`
- Modify: `frontend/src/locales/pl/generator.ts`

**Interfaces:**
- Produces: `dict.generator.modeSlot`, `modeTarot`, `modeCrate`, `modeSwitcherAriaLabel`, `audioTooltip`, `audioOnLabel`, `audioOffLabel`, `charactersTooltip`, `noRepeatTooltip`, `chaosMutatorTooltip`, `slotMachineSpinButton`, `slotMachineSpinning`, `slotMachinePrompt`, `tarotShuffleButton`, `tarotShuffling`, `tarotTapToFlip`, `tarotCardNames: string[]`, `crateTapToOpen`, `crateOpening`, `cratePrompt`, `jackpotLines: string[]` — consumed starting at Task 8 (Toolbar) through Task 16 (mode stages). Because `Dictionary` (`src/locales/types.ts`) is derived via `DeepString<typeof en>`, adding these keys to `en/generator.ts` automatically updates the `Dictionary` type for every consumer — no manual type edits needed.

- [ ] **Step 1: Add new keys to the English source of truth**

Edit `frontend/src/locales/en/generator.ts`, appending inside the exported object (before the closing `} as const;`):

```ts
  modeSlot: "Slot Machine",
  modeTarot: "Tarot Deck",
  modeCrate: "Loot Crate",
  modeSwitcherAriaLabel: "Select Draw Mode",
  audioTooltip: "Toggle Sound Effects",
  audioOnLabel: "Sound On",
  audioOffLabel: "Sound Muted",
  charactersTooltip: "Configure Characters",
  noRepeatTooltip: "Toggle No-Repeat Perks",
  chaosMutatorTooltip: "Chaos Mutator",
  slotMachineSpinButton: "Pull the Lever",
  slotMachineSpinning: "Reels Spinning...",
  slotMachinePrompt: "Pull the lever for a full 4-perk loadout.",
  tarotShuffleButton: "Shuffle & Draw",
  tarotShuffling: "Shuffling the Deck...",
  tarotTapToFlip: "Tap a card to reveal your perk",
  tarotCardNames: ["The Hex", "The Exhaustion", "The Obsession", "The Boon", "The Sacrifice", "The Chase", "The Hatch", "The Entity"],
  crateTapToOpen: "Tap the Trial Offering",
  crateOpening: "Cracking Open...",
  cratePrompt: "A Trial Offering awaits. Crack it open for your loadout.",
  jackpotLines: ["The Entity approves.", "Hooked. Lined. Sinkered.", "The Fog whispers your name.", "A trial worth writing home about.", "Four for four. The Entity is pleased.", "Somewhere, a Killer just sighed."],
```

- [ ] **Step 2: Add matching German keys**

Edit `frontend/src/locales/de/generator.ts`, appending before `} as const;`:

```ts
  modeSlot: "Spielautomat",
  modeTarot: "Tarot-Deck",
  modeCrate: "Beutekiste",
  modeSwitcherAriaLabel: "Zufallsmodus wählen",
  audioTooltip: "Soundeffekte umschalten",
  audioOnLabel: "Ton an",
  audioOffLabel: "Ton stumm",
  charactersTooltip: "Charaktere konfigurieren",
  noRepeatTooltip: "Talent-Wiederholung umschalten",
  chaosMutatorTooltip: "Chaos-Mutator",
  slotMachineSpinButton: "Hebel ziehen",
  slotMachineSpinning: "Walzen drehen sich...",
  slotMachinePrompt: "Ziehe den Hebel für ein komplettes 4-Talente-Loadout.",
  tarotShuffleButton: "Mischen & Ziehen",
  tarotShuffling: "Deck wird gemischt...",
  tarotTapToFlip: "Tippe eine Karte an, um dein Talent aufzudecken",
  tarotCardNames: ["Der Hexenzauber", "Die Erschöpfung", "Die Besessenheit", "Der Segen", "Das Opfer", "Die Verfolgungsjagd", "Die Falltür", "Die Entität"],
  crateTapToOpen: "Tippe die Prüfungsgabe an",
  crateOpening: "Wird geöffnet...",
  cratePrompt: "Eine Prüfungsgabe wartet. Öffne sie für dein Loadout.",
  jackpotLines: ["Die Entität ist zufrieden.", "Voller Erfolg.", "Der Nebel flüstert deinen Namen.", "Eine Prüfung für die Geschichtsbücher.", "Vier von vier. Die Entität ist erfreut.", "Irgendwo hat gerade ein Killer geseufzt."],
```

- [ ] **Step 3: Add matching Spanish keys**

Edit `frontend/src/locales/es/generator.ts`, appending before `} as const;`:

```ts
  modeSlot: "Tragamonedas",
  modeTarot: "Baraja de Tarot",
  modeCrate: "Caja de Botín",
  modeSwitcherAriaLabel: "Seleccionar modo de sorteo",
  audioTooltip: "Alternar efectos de sonido",
  audioOnLabel: "Sonido activado",
  audioOffLabel: "Sonido silenciado",
  charactersTooltip: "Configurar personajes",
  noRepeatTooltip: "Alternar habilidades sin repetir",
  chaosMutatorTooltip: "Mutador del Caos",
  slotMachineSpinButton: "Tirar de la palanca",
  slotMachineSpinning: "Girando los rodillos...",
  slotMachinePrompt: "Tira de la palanca para una build completa de 4 habilidades.",
  tarotShuffleButton: "Barajar y Sacar",
  tarotShuffling: "Barajando el mazo...",
  tarotTapToFlip: "Toca una carta para revelar tu habilidad",
  tarotCardNames: ["El Hex", "El Agotamiento", "La Obsesión", "La Bendición", "El Sacrificio", "La Persecución", "La Trampilla", "La Entidad"],
  crateTapToOpen: "Toca la Ofrenda del Juicio",
  crateOpening: "Abriendo...",
  cratePrompt: "Una Ofrenda del Juicio te espera. Ábrela para tu build.",
  jackpotLines: ["La Entidad aprueba.", "Cuatro de cuatro, impecable.", "La Niebla susurra tu nombre.", "Un juicio digno de recordar.", "Cuatro de cuatro. La Entidad está complacida.", "En algún lugar, un Asesino acaba de suspirar."],
```

- [ ] **Step 4: Add matching Japanese keys**

Edit `frontend/src/locales/ja/generator.ts`, appending before `} as const;`:

```ts
  modeSlot: "スロットマシン",
  modeTarot: "タロットデッキ",
  modeCrate: "ルートクレート",
  modeSwitcherAriaLabel: "抽選モードを選択",
  audioTooltip: "効果音の切り替え",
  audioOnLabel: "サウンドON",
  audioOffLabel: "サウンドミュート",
  charactersTooltip: "キャラクター設定",
  noRepeatTooltip: "パーク重複なしの切り替え",
  chaosMutatorTooltip: "カオス・ミューテーター",
  slotMachineSpinButton: "レバーを引く",
  slotMachineSpinning: "リール回転中...",
  slotMachinePrompt: "レバーを引いて4つのパークロードアウトを引こう。",
  tarotShuffleButton: "シャッフルして引く",
  tarotShuffling: "デッキをシャッフル中...",
  tarotTapToFlip: "カードをタップしてパークを公開",
  tarotCardNames: ["ヘックス", "疲弊", "妄執", "祝福", "生贄", "追跡", "ハッチ", "エンティティ"],
  crateTapToOpen: "供物箱をタップ",
  crateOpening: "開封中...",
  cratePrompt: "試練の供物が待っている。開けてロードアウトを手に入れよう。",
  jackpotLines: ["エンティティは満足した。", "見事な結果だ。", "霧があなたの名を囁く。", "語り継がれる試練だ。", "4つ全て的中。エンティティはお喜びだ。", "どこかでキラーがため息をついた。"],
```

- [ ] **Step 5: Add matching Polish keys**

Edit `frontend/src/locales/pl/generator.ts`, appending before `} as const;`:

```ts
  modeSlot: "Automat do Gier",
  modeTarot: "Talia Tarota",
  modeCrate: "Skrzynia Łupów",
  modeSwitcherAriaLabel: "Wybierz tryb losowania",
  audioTooltip: "Przełącz efekty dźwiękowe",
  audioOnLabel: "Dźwięk włączony",
  audioOffLabel: "Dźwięk wyciszony",
  charactersTooltip: "Konfiguruj postacie",
  noRepeatTooltip: "Przełącz brak powtórzeń umiejętności",
  chaosMutatorTooltip: "Mutator Chaosu",
  slotMachineSpinButton: "Pociągnij dźwignię",
  slotMachineSpinning: "Bębny się kręcą...",
  slotMachinePrompt: "Pociągnij dźwignię, aby wylosować pełny zestaw 4 umiejętności.",
  tarotShuffleButton: "Potasuj i Losuj",
  tarotShuffling: "Tasowanie talii...",
  tarotTapToFlip: "Dotknij kartę, aby odkryć swoją umiejętność",
  tarotCardNames: ["Hex", "Wyczerpanie", "Obsesja", "Błogosławieństwo", "Poświęcenie", "Pościg", "Właz", "Byt"],
  crateTapToOpen: "Dotknij Dar Próby",
  crateOpening: "Otwieranie...",
  cratePrompt: "Dar Próby czeka. Otwórz go, aby zdobyć swój zestaw.",
  jackpotLines: ["Byt jest zadowolony.", "Cztery na cztery, bez zarzutu.", "Mgła szepcze twoje imię.", "Próba godna zapamiętania.", "Cztery na cztery. Byt jest zachwycony.", "Gdzieś właśnie westchnął Zabójca."],
```

- [ ] **Step 6: Run the i18n parity and dictionary tests**

Run: `cd frontend && npx tsx --test src/__tests__/unit/i18nTranslations.test.ts`
Expected: PASS — all 5 locales still conform to the English dictionary shape (the new keys exist identically in all 5 files).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/locales/en/generator.ts frontend/src/locales/de/generator.ts frontend/src/locales/es/generator.ts frontend/src/locales/ja/generator.ts frontend/src/locales/pl/generator.ts
git commit -m "feat(generator): add localized copy for slot machine, tarot deck, and loot crate modes"
```

---

### Task 4: Shared control primitives (`SegmentedControl`, `IconToggleButton`)

**Files:**
- Create: `frontend/src/components/generator/shared/SegmentedControl.tsx`
- Create: `frontend/src/components/generator/shared/IconToggleButton.tsx`

**Interfaces:**
- Consumes: `cn` from `@/utils/cn`.
- Produces:
  - `SegmentedControl<T extends string>(props: { value: T; options: { value: T; label: string; icon?: React.ReactNode }[]; onChange: (value: T) => void; ariaLabel: string; className?: string }): JSX.Element` — consumed by `Toolbar.tsx` (Task 8, role toggle) and `ModeSwitcher.tsx` (Task 9).
  - `IconToggleButton(props: { icon: React.ReactNode; label: string; isActive?: boolean; badge?: string | number; onClick: () => void; className?: string }): JSX.Element` — consumed by `Toolbar.tsx` (Task 8).

- [ ] **Step 1: Create `SegmentedControl.tsx`**

```tsx
// frontend/src/components/generator/shared/SegmentedControl.tsx
'use client';

import React from 'react';
import { cn } from '@/utils/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1 rounded-2xl bg-slate-900/50 p-1 shadow-inner overflow-x-auto',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase transition-all duration-200 cursor-pointer',
              isActive
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-100'
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `IconToggleButton.tsx`**

```tsx
// frontend/src/components/generator/shared/IconToggleButton.tsx
'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface IconToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  onClick: () => void;
  className?: string;
}

export const IconToggleButton: React.FC<IconToggleButtonProps> = ({
  icon,
  label,
  isActive = false,
  badge,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        'relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-slate-400 transition-all duration-200 cursor-pointer hover:text-slate-100 hover:bg-slate-800/60',
        isActive && 'text-amber-400 bg-amber-500/10',
        className
      )}
    >
      {icon}
      {badge !== undefined && (
        <span className="text-[10px] font-black">{badge}</span>
      )}
    </button>
  );
};
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors introduced by these two files (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/generator/shared/SegmentedControl.tsx frontend/src/components/generator/shared/IconToggleButton.tsx
git commit -m "feat(generator): add SegmentedControl and IconToggleButton shared primitives"
```

---

### Task 5: `PerkSlot` — canonical borderless perk display

**Files:**
- Create: `frontend/src/components/generator/shared/PerkSlot.tsx`

**Interfaces:**
- Consumes: `Perk`, `RoleCategory` from `@/types/perks`; `Dictionary` from `@/locales/types`; `getPerkIconUrl`, `getCharacterAvatarUrl` from `@/utils/perkUtils`; `cn` from `@/utils/cn`; icons `Shield`, `Skull`, `ImageOff`, `EyeOff`, `Trash2` from `lucide-react`.
- Produces: `PerkSlot(props: PerkSlotProps): JSX.Element` — the single perk-display component consumed by `LoadoutHotbar.tsx` (Task 7) and every mode stage (Tasks 12–16).

```ts
export interface PerkSlotProps {
  perk?: Perk | null;
  role: RoleCategory;
  slotNumber?: number;
  isObscured?: boolean;
  isActive?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onClear?: (e: React.MouseEvent) => void;
  dict?: Dictionary;
  backendBase?: string;
}
```

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/shared/PerkSlot.tsx
'use client';

import React from 'react';
import { Shield, Skull, ImageOff, EyeOff, Trash2 } from 'lucide-react';
import { Perk, RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { getPerkIconUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { cn } from '@/utils/cn';

export interface PerkSlotProps {
  perk?: Perk | null;
  role: RoleCategory;
  slotNumber?: number;
  isObscured?: boolean;
  isActive?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onClear?: (e: React.MouseEvent) => void;
  dict?: Dictionary;
  backendBase?: string;
}

export const PerkSlot: React.FC<PerkSlotProps> = ({
  perk,
  role,
  slotNumber,
  isObscured = false,
  isActive = false,
  compact = false,
  onClick,
  onClear,
  dict,
  backendBase,
}) => {
  const isSurvivor = role === 'Survivor';
  const iconSrc = getPerkIconUrl(perk, backendBase);
  const avatarSrc = getCharacterAvatarUrl(perk, role, backendBase);

  const coordinate =
    perk && slotNumber !== undefined
      ? `${dict?.generator?.coordOpenPage || '[P'}${Math.floor((slotNumber - 1) / 15) + 1}${dict?.generator?.coordSlot || '/S'}${slotNumber}${dict?.generator?.coordClose || ']'}`
      : dict?.generator?.emptyCoordinate || '[-/-]';

  const glowClass = isSurvivor
    ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]'
    : 'drop-shadow-[0_0_10px_rgba(244,63,94,0.55)]';

  return (
    <div
      onClick={() => {
        if (isObscured) return;
        if (perk && onClick) onClick();
      }}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl bg-slate-900/40 backdrop-blur-md transition-all duration-200',
        compact ? 'p-2 gap-1.5' : 'p-3.5 gap-2.5',
        perk && !isObscured && 'cursor-pointer hover:bg-slate-900/70',
        isActive && 'ring-2 ring-amber-500/60'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-black text-amber-400/90">
          {coordinate}
        </span>
        {perk && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear(e);
            }}
            aria-label={dict?.generator?.clearSlotTooltip || 'Clear slot'}
            className="rounded-lg p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center',
            compact ? 'h-10 w-10' : 'h-14 w-14'
          )}
        >
          {isObscured ? (
            <EyeOff className="h-6 w-6 text-purple-400 animate-pulse" />
          ) : perk && iconSrc ? (
            <img
              src={iconSrc}
              alt={perk.name}
              className={cn(
                'h-full w-full object-contain transition-transform duration-300 group-hover:scale-110',
                glowClass
              )}
            />
          ) : (
            <ImageOff className="h-6 w-6 text-slate-600" />
          )}

          {avatarSrc && !isObscured && (
            <img
              src={avatarSrc}
              alt={perk?.character || ''}
              className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full object-cover shadow-md"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            aria-live="polite"
            className={cn(
              'font-black leading-tight text-slate-100 truncate',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {isObscured
              ? dict?.generator?.clickToReveal || '??? (Click to Reveal)'
              : perk?.name || dict?.generator?.emptySlot || 'Empty Slot'}
          </p>
          {!compact && (
            <p className="text-[11px] font-bold text-slate-500 truncate">
              {isObscured
                ? dict?.generator?.cursedBlindness || 'Cursed Blindness'
                : perk
                  ? perk.character || 'General Perk'
                  : dict?.generator?.spinOrRollPrompt || 'Awaiting a draw'}
            </p>
          )}
        </div>

        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            isSurvivor ? 'text-emerald-400' : 'text-rose-400'
          )}
          title={role}
        >
          {isSurvivor ? <Shield className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/shared/PerkSlot.tsx
git commit -m "feat(generator): add shared borderless PerkSlot component"
```

---

### Task 6: `StageFrame` — ambient backdrop

**Files:**
- Create: `frontend/src/components/generator/shared/StageFrame.tsx`

**Interfaces:**
- Consumes: `RoleCategory` from `@/types/perks`; `Particles`, `ParticlesProvider` from `@tsparticles/react`; `loadSlim` from `@tsparticles/slim`; `Engine`, `ISourceOptions` from `@tsparticles/engine` (same pattern as `frontend/src/components/streaks/gauntlet/GauntletFireBackground.tsx`).
- Produces: `StageFrame(props: { role: RoleCategory; children: React.ReactNode; className?: string }): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16) to wrap whichever mode stage is active.

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/shared/StageFrame.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';
import { RoleCategory } from '@/types/perks';
import { cn } from '@/utils/cn';

interface StageFrameProps {
  role: RoleCategory;
  children: React.ReactNode;
  className?: string;
}

async function registerEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

export const StageFrame: React.FC<StageFrameProps> = ({ role, children, className }) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const isSurvivor = role === 'Survivor';
  const particleColor = isSurvivor ? '#10b981' : '#f43f5e';

  const particleOptions: ISourceOptions = useMemo(
    () => ({
      fpsLimit: 60,
      detectRetina: true,
      fullScreen: { enable: false },
      particles: {
        number: { value: reduceMotion ? 0 : 28, density: { enable: true, width: 800, height: 800 } },
        color: { value: particleColor },
        shape: { type: 'circle' },
        opacity: { value: { min: 0.05, max: 0.25 } },
        size: { value: { min: 1, max: 2.5 } },
        move: {
          enable: !reduceMotion,
          speed: 0.6,
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'out' },
        },
      },
      interactivity: { events: { onHover: { enable: false }, onClick: { enable: false }, resize: true } },
      background: { color: 'transparent' },
    }),
    [particleColor, reduceMotion]
  );

  return (
    <div
      className={cn(
        'dbd-fog-overlay relative overflow-hidden rounded-3xl bg-slate-950/40 p-4 sm:p-6',
        className
      )}
    >
      <ParticlesProvider init={registerEngine}>
        <Particles
          id="generator-stage-particles"
          options={particleOptions}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
      </ParticlesProvider>
      <div className="relative z-10">{children}</div>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/shared/StageFrame.tsx
git commit -m "feat(generator): add StageFrame ambient backdrop using existing tsparticles pattern"
```

---

### Task 7: `useJackpotCelebration` hook

**Files:**
- Create: `frontend/src/components/generator/shared/useJackpotCelebration.ts`

**Interfaces:**
- Consumes: `confetti` from `canvas-confetti`; `playFanfare` from `@/utils/perkAudio`; `Dictionary` from `@/locales/types`; `RoleCategory` from `@/types/perks`.
- Produces: `useJackpotCelebration(dict?: Dictionary): { flavorLine: string | null; celebrate: (role: RoleCategory) => void }` — consumed by `InstantStage.tsx`, `SlotMachineStage.tsx`, `TarotDeckStage.tsx`, `LootCrateStage.tsx` (Tasks 13–16) when all 4 slots have finished revealing.

- [ ] **Step 1: Create the hook**

```ts
// frontend/src/components/generator/shared/useJackpotCelebration.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { playFanfare } from '@/utils/perkAudio';
import { Dictionary } from '@/locales/types';
import { RoleCategory } from '@/types/perks';

const DEFAULT_JACKPOT_LINES: readonly string[] = [
  'The Entity approves.',
  'Hooked. Lined. Sinkered.',
  'The Fog whispers your name.',
];

const FLAVOR_DISPLAY_MS = 4000;

export function useJackpotCelebration(dict?: Dictionary) {
  const [flavorLine, setFlavorLine] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const celebrate = useCallback(
    (role: RoleCategory) => {
      const lines = dict?.generator?.jackpotLines || DEFAULT_JACKPOT_LINES;
      const line = lines[Math.floor(Math.random() * lines.length)];
      setFlavorLine(line);

      playFanfare();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: role === 'Survivor'
            ? ['#10b981', '#34d399', '#f59e0b']
            : ['#f43f5e', '#fb7185', '#f59e0b'],
        });
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFlavorLine(null), FLAVOR_DISPLAY_MS);
    },
    [dict]
  );

  return { flavorLine, celebrate };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors (confirms `canvas-confetti`'s `@types/canvas-confetti` types resolve correctly).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/shared/useJackpotCelebration.ts
git commit -m "feat(generator): add useJackpotCelebration confetti/fanfare/flavor-text hook"
```

---

### Task 8: `Toolbar`

**Files:**
- Create: `frontend/src/components/generator/Toolbar.tsx`

**Interfaces:**
- Consumes: `SegmentedControl` (Task 4), `IconToggleButton` (Task 4), `RoleCategory`, `ChaosMutator` from their respective type modules, `Dictionary`, icons `Shield`, `Skull`, `Users`, `Repeat`, `Skull as ChaosSkull` (reuse `Sparkles`), `Volume2`, `VolumeX`, `RotateCcw` from `lucide-react`.
- Produces: `Toolbar(props: ToolbarProps): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16).

```ts
export interface ToolbarProps {
  role: RoleCategory;
  onRoleChange: (role: RoleCategory) => void;
  noRepeatPerks: boolean;
  onToggleNoRepeat: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenCharacterConfig: () => void;
  onOpenChaosModal: () => void;
  activeMutator: ChaosMutator | null;
  onResetAll: () => void;
  playableCount: number;
  dict?: Dictionary;
}
```

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/Toolbar.tsx
'use client';

import React from 'react';
import { Shield, Skull, Users, Repeat, Sparkles, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { RoleCategory } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { SegmentedControl } from './shared/SegmentedControl';
import { IconToggleButton } from './shared/IconToggleButton';

export interface ToolbarProps {
  role: RoleCategory;
  onRoleChange: (role: RoleCategory) => void;
  noRepeatPerks: boolean;
  onToggleNoRepeat: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenCharacterConfig: () => void;
  onOpenChaosModal: () => void;
  activeMutator: ChaosMutator | null;
  onResetAll: () => void;
  playableCount: number;
  dict?: Dictionary;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  role,
  onRoleChange,
  noRepeatPerks,
  onToggleNoRepeat,
  audioEnabled,
  onToggleAudio,
  onOpenCharacterConfig,
  onOpenChaosModal,
  activeMutator,
  onResetAll,
  playableCount,
  dict,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-black uppercase tracking-wide text-slate-200">
          {role} {dict?.generator?.titleSuffix || 'Perk Randomizer'}
        </h1>
        <SegmentedControl
          value={role}
          onChange={onRoleChange}
          ariaLabel={dict?.generator?.selectRole || 'Select Role'}
          options={[
            { value: 'Survivor', label: dict?.generator?.survivor || 'Survivor', icon: <Shield className="h-3.5 w-3.5" /> },
            { value: 'Killer', label: dict?.generator?.killer || 'Killer', icon: <Skull className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <IconToggleButton
          icon={<Users className="h-4 w-4" />}
          label={dict?.generator?.charactersTooltip || 'Configure Characters'}
          badge={playableCount}
          onClick={onOpenCharacterConfig}
        />
        <IconToggleButton
          icon={<Repeat className="h-4 w-4" />}
          label={dict?.generator?.noRepeatTooltip || 'Toggle No-Repeat Perks'}
          isActive={noRepeatPerks}
          onClick={onToggleNoRepeat}
        />
        <IconToggleButton
          icon={<span className="text-base leading-none">{activeMutator ? activeMutator.icon : '🔮'}</span>}
          label={activeMutator ? activeMutator.name : (dict?.generator?.chaosMutatorTooltip || 'Chaos Mutator')}
          isActive={Boolean(activeMutator)}
          onClick={onOpenChaosModal}
        />
        <IconToggleButton
          icon={audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          label={
            audioEnabled
              ? dict?.generator?.audioOnLabel || 'Sound On'
              : dict?.generator?.audioOffLabel || 'Sound Muted'
          }
          isActive={audioEnabled}
          onClick={onToggleAudio}
        />
        <IconToggleButton
          icon={<RotateCcw className="h-4 w-4" />}
          label={dict?.generator?.resetAllTooltip || 'Reset wheels, loadout slots, and memory'}
          onClick={onResetAll}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/Toolbar.tsx
git commit -m "feat(generator): add slim borderless Toolbar replacing the banner header"
```

---

### Task 9: `ModeSwitcher` and `GeneratorMode` type extension

**Files:**
- Modify: `frontend/src/types/perks.ts`
- Create: `frontend/src/components/generator/ModeSwitcher.tsx`

**Interfaces:**
- Produces: extended `GeneratorMode = 'instant' | 'wheel' | 'slot' | 'tarot' | 'crate'`; `ModeSwitcher(props: { mode: GeneratorMode; onChange: (mode: GeneratorMode) => void; dict?: Dictionary }): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16).

- [ ] **Step 1: Extend the `GeneratorMode` type**

Edit `frontend/src/types/perks.ts` line 3:

```ts
export type GeneratorMode = 'instant' | 'wheel' | 'slot' | 'tarot' | 'crate';
```

- [ ] **Step 2: Create `ModeSwitcher.tsx`**

```tsx
// frontend/src/components/generator/ModeSwitcher.tsx
'use client';

import React from 'react';
import { CircleDot, Zap, Rows3, Layers, Gift } from 'lucide-react';
import { GeneratorMode } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { SegmentedControl } from './shared/SegmentedControl';

interface ModeSwitcherProps {
  mode: GeneratorMode;
  onChange: (mode: GeneratorMode) => void;
  dict?: Dictionary;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, onChange, dict }) => {
  return (
    <SegmentedControl<GeneratorMode>
      value={mode}
      onChange={onChange}
      ariaLabel={dict?.generator?.modeSwitcherAriaLabel || 'Select Draw Mode'}
      className="w-full justify-start"
      options={[
        { value: 'wheel', label: dict?.generator?.modeWheel || 'Wheel of Fortune', icon: <CircleDot className="h-3.5 w-3.5" /> },
        { value: 'instant', label: dict?.generator?.modeInstant || 'Instant Roll', icon: <Zap className="h-3.5 w-3.5" /> },
        { value: 'slot', label: dict?.generator?.modeSlot || 'Slot Machine', icon: <Rows3 className="h-3.5 w-3.5" /> },
        { value: 'tarot', label: dict?.generator?.modeTarot || 'Tarot Deck', icon: <Layers className="h-3.5 w-3.5" /> },
        { value: 'crate', label: dict?.generator?.modeCrate || 'Loot Crate', icon: <Gift className="h-3.5 w-3.5" /> },
      ]}
    />
  );
};
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors. (This confirms `GeneratorConfigResponse.gen_mode` and `GeneratorStoredState.genMode` in `frontend/src/types/perks.ts`, which both reference `GeneratorMode`, still compile since the union was only widened.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/perks.ts frontend/src/components/generator/ModeSwitcher.tsx
git commit -m "feat(generator): extend GeneratorMode and add 5-way ModeSwitcher"
```

---

### Task 10: `LoadoutHotbar`

**Files:**
- Create: `frontend/src/components/generator/LoadoutHotbar.tsx`

**Interfaces:**
- Consumes: `PerkSlot` (Task 5); `DrawnSlot`, `RoleCategory`, `Perk` from `@/types/perks`; `ChaosMutator` from `@/types/chaos`; `motion` from `framer-motion`.
- Produces: `LoadoutHotbar(props: LoadoutHotbarProps): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16).

```ts
export interface LoadoutHotbarProps {
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  role: RoleCategory;
  activeMutator: ChaosMutator | null;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  onClearSlot: (idx: number, e: React.MouseEvent) => void;
  dict?: Dictionary;
  backendBase?: string;
}
```

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/LoadoutHotbar.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DrawnSlot, RoleCategory, Perk } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { PerkSlot } from './shared/PerkSlot';

export interface LoadoutHotbarProps {
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  role: RoleCategory;
  activeMutator: ChaosMutator | null;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  onClearSlot: (idx: number, e: React.MouseEvent) => void;
  dict?: Dictionary;
  backendBase?: string;
}

export const LoadoutHotbar: React.FC<LoadoutHotbarProps> = ({
  loadout,
  activeSlotIdx,
  role,
  activeMutator,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  onClearSlot,
  dict,
  backendBase,
}) => {
  return (
    <div
      role="region"
      aria-label={dict?.generator?.activeLoadoutTitle || 'Active 4-Perk Loadout'}
      className="sticky bottom-3 z-30 grid grid-cols-2 gap-2 rounded-3xl bg-slate-950/70 p-2.5 shadow-2xl backdrop-blur-xl sm:grid-cols-4"
    >
      {loadout.map((slotData, idx) => {
        const perk = slotData?.perk;
        const isObscured = activeMutator?.id === 'blindness' && Boolean(perk) && !revealedSlots[idx];

        return (
          <motion.div
            key={idx}
            layout
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <PerkSlot
              perk={perk}
              role={role}
              slotNumber={slotData ? (slotData.page - 1) * 15 + slotData.slot : undefined}
              isObscured={isObscured}
              isActive={activeSlotIdx === idx}
              compact
              onClick={() => {
                if (isObscured) {
                  onRevealSlot(idx);
                } else if (perk) {
                  onSelectPerk(perk);
                }
              }}
              onClear={perk ? (e) => onClearSlot(idx, e) : undefined}
              dict={dict}
              backendBase={backendBase}
            />
          </motion.div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/LoadoutHotbar.tsx
git commit -m "feat(generator): add sticky bottom LoadoutHotbar"
```

---

### Task 11: `WheelStage` — migrate and reskin the canvas wheel

**Files:**
- Create: `frontend/src/components/generator/modes/WheelStage.tsx`
- Delete: `frontend/src/components/WheelOfFortune.tsx`
- Modify: `frontend/src/types/chaos.ts` (remove now-unused `WheelWinSlotPayload`)

**Interfaces:**
- Consumes: `filterPerksByMutator`, `isPerkBlockedByMutator` from `../lib/perkPicker` (Task 2); `getPerkIconUrl` from `@/utils/perkUtils`.
- Produces: `WheelStage(props: WheelStageProps): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16). Callback shape unified to `onWinSlot: (slot: DrawnSlot) => void` (dropping the old `WheelWinSlotPayload.mutator` field, which was never read by its caller).

```ts
export interface WheelStageProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: RoleCategory;
  sortedPerks: Perk[];
  activeSlotIdx: number;
  activeMutator: ChaosMutator | null;
  onWinSlot: (wonData: DrawnSlot) => void;
  dict?: Dictionary;
  backendBase?: string;
}
```

- [ ] **Step 1: Remove `WheelWinSlotPayload` from `types/chaos.ts`**

Edit `frontend/src/types/chaos.ts` to remove the now-unused interface, leaving:

```ts
// frontend/src/types/chaos.ts
export type ChaosMutatorType = 'curse' | 'buff';

export interface ChaosMutator {
  id: 'no_exhaustion' | 'blindness' | 'meme_loadout' | 'hex_boon_only' | string;
  name: string;
  description: string;
  type: ChaosMutatorType;
  icon: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  blockedPerkKeywords?: string[];
}
```

- [ ] **Step 2: Create `WheelStage.tsx`**

```tsx
// frontend/src/components/generator/modes/WheelStage.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { isPerkBlockedByMutator, filterPerksByMutator } from '../lib/perkPicker';

export interface WheelStageProps {
  totalPages: number;
  perksPerPage: number;
  lastPagePerks: number;
  spinDurationSec: number;
  role: RoleCategory;
  sortedPerks: Perk[];
  activeSlotIdx: number;
  activeMutator: ChaosMutator | null;
  onWinSlot: (wonData: DrawnSlot) => void;
  dict?: Dictionary;
  backendBase?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const WheelStage: React.FC<WheelStageProps> = ({
  totalPages,
  perksPerPage,
  lastPagePerks,
  spinDurationSec,
  role,
  sortedPerks,
  activeSlotIdx,
  onWinSlot,
  dict,
  backendBase,
  activeMutator,
}) => {
  const [wheelPhase, setWheelPhase] = useState<'page' | 'perk'>('page');
  const [selectedPageUI, setSelectedPageUI] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isMorphing, setIsMorphing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');

  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const wheelAngleRef = useRef<number>(0);
  const wheelPhaseRef = useRef<'page' | 'perk'>('page');
  const activePageRef = useRef<number>(1);

  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const particleListRef = useRef<Particle[]>([]);
  const particleAnimFrameRef = useRef<number | null>(null);

  const effectiveTotalPages = Math.max(1, totalPages);

  const getIconSrc = useCallback(
    (perk?: Perk) => getPerkIconUrl(perk, backendBase) || '',
    [backendBase]
  );

  const drawUnifiedWheel = useCallback(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2 - 32;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.clearRect(0, 0, size, size);

    if (wheelPhaseRef.current === 'page') {
      const sliceAngle = (2 * Math.PI) / effectiveTotalPages;

      for (let i = 0; i < effectiveTotalPages; i++) {
        const angle = wheelAngleRef.current + i * sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
        if (i % 2 === 0) {
          grad.addColorStop(0, '#1e293b');
          grad.addColorStop(1, '#0f172a');
        } else {
          grad.addColorStop(0, '#334155');
          grad.addColorStop(1, '#1e293b');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#475569';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        const midAngle = angle + sliceAngle / 2;
        ctx.rotate(midAngle);

        const badgeRadiusPos = radius - 75;

        ctx.beginPath();
        ctx.arc(badgeRadiusPos, 0, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        ctx.font = '900 18px system-ui, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${i + 1}`, badgeRadiusPos, 1);

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, 58, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAGE WHEEL', centerX, centerY);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
    } else {
      const pageNumber = activePageRef.current;
      const maxSlotsOnPage = Math.max(
        1,
        pageNumber === effectiveTotalPages ? lastPagePerks || perksPerPage : perksPerPage
      );
      const sliceAngle = (2 * Math.PI) / maxSlotsOnPage;

      for (let i = 0; i < maxSlotsOnPage; i++) {
        const angle = wheelAngleRef.current + i * sliceAngle;
        const index = (pageNumber - 1) * perksPerPage + i;
        const perk = sortedPerks[index] || sortedPerks[index % Math.max(1, sortedPerks.length)];
        const isBlocked = isPerkBlockedByMutator(perk, activeMutator);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
        if (isBlocked) {
          grad.addColorStop(0, '#1f1924');
          grad.addColorStop(1, '#0f0a12');
        } else if (role === 'Survivor') {
          grad.addColorStop(0, i % 2 === 0 ? '#064e3b' : '#022c22');
          grad.addColorStop(1, i % 2 === 0 ? '#022c22' : '#0f172a');
        } else {
          grad.addColorStop(0, i % 2 === 0 ? '#881337' : '#4c0519');
          grad.addColorStop(1, i % 2 === 0 ? '#4c0519' : '#0f172a');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isBlocked ? '#e11d48' : role === 'Survivor' ? '#047857' : '#be123c';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        const midAngle = angle + sliceAngle / 2;
        ctx.rotate(midAngle + Math.PI / 2);

        const iconSrc = getIconSrc(perk);
        const imgObj = iconSrc ? imageCacheRef.current.get(iconSrc) : undefined;
        const iconSize = 72;
        const iconRadiusPos = -(radius - 85);

        if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
          ctx.save();
          if (isBlocked) ctx.globalAlpha = 0.25;

          ctx.shadowColor = role === 'Survivor' ? '#10b981' : '#f43f5e';
          ctx.shadowBlur = 16;

          ctx.drawImage(imgObj, -iconSize / 2, iconRadiusPos - iconSize / 2, iconSize, iconSize);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(0, iconRadiusPos);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = isBlocked ? '#4c0519' : role === 'Survivor' ? '#047857' : '#9f1239';
          ctx.fillRect(-24, -24, 48, 48);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-24, -24, 48, 48);
          ctx.restore();

          ctx.font = '900 16px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((perk?.name || 'P').charAt(0).toUpperCase(), 0, iconRadiusPos);
        }

        if (isBlocked) {
          ctx.font = 'bold 24px sans-serif';
          ctx.fillStyle = '#f43f5e';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚫', 0, iconRadiusPos);
        }

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, 62, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = role === 'Survivor' ? '#10b981' : '#f43f5e';
      ctx.stroke();

      ctx.fillStyle = role === 'Survivor' ? '#34d399' : '#fb7185';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PAGE ${pageNumber}`, centerX, centerY - 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(`${maxSlotsOnPage} PERKS`, centerX, centerY + 12);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = role === 'Survivor' ? '#10b981' : '#f43f5e';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centerX - 22, 2);
    ctx.lineTo(centerX + 22, 2);
    ctx.lineTo(centerX, 42);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, [effectiveTotalPages, lastPagePerks, perksPerPage, sortedPerks, activeMutator, role, getIconSrc]);

  useEffect(() => {
    sortedPerks.forEach((perk) => {
      const src = getIconSrc(perk);
      if (src && !imageCacheRef.current.has(src)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => drawUnifiedWheel();
        imageCacheRef.current.set(src, img);
      }
    });
  }, [sortedPerks, getIconSrc, drawUnifiedWheel]);

  useEffect(() => {
    drawUnifiedWheel();
  }, [drawUnifiedWheel, selectedPageUI, sortedPerks, activeMutator, wheelPhase]);

  useEffect(() => {
    return () => {
      if (particleAnimFrameRef.current !== null) {
        cancelAnimationFrame(particleAnimFrameRef.current);
      }
    };
  }, []);

  const triggerParticleBurst = useCallback(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const count = 65;

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      newParticles.push({
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 7 + 2,
        alpha: 1.0,
        color: role === 'Survivor' ? '#10b981' : '#f43f5e',
      });
    }
    particleListRef.current = newParticles;

    const renderParticles = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particleListRef.current) {
        if (p.alpha > 0.02) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha *= 0.93;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      if (alive) {
        particleAnimFrameRef.current = requestAnimationFrame(renderParticles);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    if (particleAnimFrameRef.current) cancelAnimationFrame(particleAnimFrameRef.current);
    renderParticles();
  }, [role]);

  const handleStartSpin = async () => {
    if (isSpinning || sortedPerks.length === 0) return;
    setIsSpinning(true);

    const totalDurationMs = Math.max(1500, spinDurationSec * 1000);
    const pageSpinDuration = totalDurationMs * 0.45;
    const perkSpinDuration = totalDurationMs * 0.55;

    const targetPage = Math.floor(Math.random() * effectiveTotalPages) + 1;
    const maxSlotsOnPage = Math.max(
      1,
      targetPage === effectiveTotalPages ? lastPagePerks || perksPerPage : perksPerPage
    );

    const pagePerksWithSlot: { slot: number; perk: Perk }[] = [];
    for (let s = 1; s <= maxSlotsOnPage; s++) {
      const idx = (targetPage - 1) * perksPerPage + (s - 1);
      const perk = sortedPerks[idx];
      if (perk) pagePerksWithSlot.push({ slot: s, perk });
    }

    const allowedPerks = filterPerksByMutator(pagePerksWithSlot.map((e) => e.perk), activeMutator);
    const allowedSlots = pagePerksWithSlot
      .filter((e) => allowedPerks.includes(e.perk))
      .map((e) => e.slot);

    const targetSlot =
      allowedSlots.length > 0
        ? allowedSlots[Math.floor(Math.random() * allowedSlots.length)]
        : Math.floor(Math.random() * maxSlotsOnPage) + 1;

    const targetIndex = (targetPage - 1) * perksPerPage + (targetSlot - 1);
    const targetPerk = sortedPerks[targetIndex] || sortedPerks[0];

    wheelPhaseRef.current = 'page';
    setWheelPhase('page');
    setStatusText(`Spinning Page Wheel for Slot #${activeSlotIdx + 1}...`);

    const pageSliceAngle = (2 * Math.PI) / effectiveTotalPages;
    const pageTargetAngle = (3 * Math.PI) / 2 - (targetPage - 1) * pageSliceAngle - pageSliceAngle / 2;
    const pageStartAngle = wheelAngleRef.current;
    const pageFinalAngle = pageStartAngle + 4 * 2 * Math.PI + (pageTargetAngle - (pageStartAngle % (2 * Math.PI)));
    const pageStartTime = performance.now();

    await new Promise<void>((resolve) => {
      const animatePage = (now: number) => {
        const elapsed = now - pageStartTime;
        const progress = Math.min(elapsed / pageSpinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        wheelAngleRef.current = pageStartAngle + (pageFinalAngle - pageStartAngle) * easeOut;
        drawUnifiedWheel();

        if (progress < 1) {
          requestAnimationFrame(animatePage);
        } else {
          wheelAngleRef.current = pageFinalAngle % (2 * Math.PI);
          drawUnifiedWheel();
          resolve();
        }
      };
      requestAnimationFrame(animatePage);
    });

    activePageRef.current = targetPage;
    setSelectedPageUI(targetPage);
    setStatusText(`Landed on Page ${targetPage}! Swapping to Perk Wheel...`);

    setIsMorphing(true);
    await new Promise((res) => setTimeout(res, 250));

    wheelPhaseRef.current = 'perk';
    setWheelPhase('perk');
    wheelAngleRef.current = 0;
    drawUnifiedWheel();

    setIsMorphing(false);
    await new Promise((res) => setTimeout(res, 250));

    setStatusText(`Spinning Perk Wheel (Page ${targetPage})...`);

    const perkSliceAngle = (2 * Math.PI) / maxSlotsOnPage;
    const perkTargetAngle = (3 * Math.PI) / 2 - (targetSlot - 1) * perkSliceAngle - perkSliceAngle / 2;
    const perkStartAngle = 0;
    const perkFinalAngle = perkStartAngle + 5 * 2 * Math.PI + (perkTargetAngle - (perkStartAngle % (2 * Math.PI)));
    const perkStartTime = performance.now();

    await new Promise<void>((resolve) => {
      const animatePerk = (now: number) => {
        const elapsed = now - perkStartTime;
        const progress = Math.min(elapsed / perkSpinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);

        wheelAngleRef.current = perkStartAngle + (perkFinalAngle - perkStartAngle) * easeOut;
        drawUnifiedWheel();

        if (progress < 1) {
          requestAnimationFrame(animatePerk);
        } else {
          wheelAngleRef.current = perkFinalAngle % (2 * Math.PI);
          drawUnifiedWheel();
          resolve();
        }
      };
      requestAnimationFrame(animatePerk);
    });

    setIsSpinning(false);
    setStatusText(targetPerk ? `${targetPerk.name} [P${targetPage}/S${targetSlot}]` : '');
    triggerParticleBurst();

    if (targetPerk) {
      onWinSlot({ page: targetPage, slot: targetSlot, perk: targetPerk });
    }
  };

  const spinButtonText = isSpinning
    ? dict?.generator?.spinningWheel || 'Spinning Wheel...'
    : `${dict?.generator?.spinWheelButton || 'Spin for Perk Slot'} #${activeSlotIdx + 1}`;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <div className="relative flex items-center justify-center w-full">
        <canvas
          ref={particlesCanvasRef}
          width={800}
          height={800}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        />
        <div
          className={`w-full max-w-[440px] sm:max-w-[520px] aspect-square transition-all duration-500 ease-out transform ${
            isMorphing ? 'scale-75 opacity-0 rotate-[180deg]' : 'scale-100 opacity-100 rotate-0'
          }`}
        >
          <canvas
            ref={wheelCanvasRef}
            width={800}
            height={800}
            className={`h-full w-full ${
              role === 'Survivor'
                ? 'drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                : 'drop-shadow-[0_0_30px_rgba(244,63,94,0.35)]'
            }`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleStartSpin}
        disabled={isSpinning || sortedPerks.length === 0}
        className={`mt-6 flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base tracking-wider uppercase shadow-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          isSpinning || sortedPerks.length === 0
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : role === 'Survivor'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
              : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Play className={`h-5 w-5 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
        <span>{spinButtonText}</span>
      </button>

      {statusText && (
        <p aria-live="polite" className="mt-3 text-xs font-black text-amber-400 animate-pulse font-mono">
          {statusText}
        </p>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Delete the old file**

```bash
git rm frontend/src/components/WheelOfFortune.tsx
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors at this point are expected/acceptable only in `PerkGenerator.tsx` (still importing the now-deleted `WheelOfFortune`) — that file is replaced wholesale in Task 16. No other file should reference `WheelOfFortune` or `WheelWinSlotPayload` (confirmed via the codebase grep taken during planning: only `PerkGenerator.tsx` and the deleted file referenced them).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/generator/modes/WheelStage.tsx frontend/src/types/chaos.ts
git commit -m "feat(generator): migrate WheelOfFortune into WheelStage, reskinned and mutator-logic-shared"
```

---

### Task 12: `InstantStage`

**Files:**
- Create: `frontend/src/components/generator/modes/InstantStage.tsx`

**Interfaces:**
- Consumes: `pickRandomLoadout`, `buildDrawnSlots` from `../lib/perkPicker`; `PerkSlot` from `../shared/PerkSlot`; `useJackpotCelebration` from `../shared/useJackpotCelebration`; `motion`, `AnimatePresence` from `framer-motion`; `playReelThud` from `@/utils/perkAudio`.
- Produces: `InstantStage(props: InstantStageProps): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16).

```ts
export interface InstantStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}
```

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/modes/InstantStage.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelThud } from '@/utils/perkAudio';

export interface InstantStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}

export const InstantStage: React.FC<InstantStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  dict,
  backendBase,
}) => {
  const [revealSlots, setRevealSlots] = useState<DrawnSlot[] | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);

  const handleRoll = () => {
    if (activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);
    setRevealSlots(slots);

    slots.forEach((_, i) => {
      window.setTimeout(() => playReelThud(), i * 150);
    });

    window.setTimeout(() => {
      celebrate(role);
      onRollComplete(slots);
    }, slots.length * 150 + 200);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <button
        type="button"
        onClick={handleRoll}
        disabled={activePlayablePerks.length === 0}
        className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
          role === 'Survivor'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Zap className="h-6 w-6" />
        <span>{dict?.generator?.rollCompleteLoadout || `Roll Complete ${role} Loadout`}</span>
      </button>

      <AnimatePresence>
        {revealSlots && (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {revealSlots.map((slot, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.85 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
              >
                <PerkSlot
                  perk={slot.perk}
                  role={role}
                  slotNumber={(slot.page - 1) * 15 + slot.slot}
                  dict={dict}
                  backendBase={backendBase}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/InstantStage.tsx
git commit -m "feat(generator): add reskinned InstantStage with staggered reveal"
```

---

### Task 13: `SlotMachineStage`

**Files:**
- Create: `frontend/src/components/generator/modes/SlotMachineStage.tsx`

**Interfaces:**
- Consumes: `pickRandomLoadout`, `buildDrawnSlots` from `../lib/perkPicker`; `PerkSlot` from `../shared/PerkSlot`; `useJackpotCelebration`; `playReelTick`, `playReelThud` from `@/utils/perkAudio`; `motion` from `framer-motion`.
- Produces: `SlotMachineStage(props): JSX.Element` — same prop shape as `InstantStageProps` (renamed `SlotMachineStageProps`), consumed by `GeneratorPage.tsx` (Task 16).

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/modes/SlotMachineStage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Rows3 } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelTick, playReelThud } from '@/utils/perkAudio';
import { getPerkIconUrl } from '@/utils/perkUtils';

export interface SlotMachineStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}

type ReelState = 'idle' | 'spinning' | 'stopped';

const REEL_STOP_DELAY_MS = 500;
const TICK_INTERVAL_MS = 90;

export const SlotMachineStage: React.FC<SlotMachineStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  dict,
  backendBase,
}) => {
  const [reelStates, setReelStates] = useState<ReelState[]>(['idle', 'idle', 'idle', 'idle']);
  const [displayedPerks, setDisplayedPerks] = useState<(Perk | null)[]>([null, null, null, null]);
  const finalSlotsRef = useRef<DrawnSlot[]>([]);
  const tickIntervalsRef = useRef<(ReturnType<typeof setInterval> | null)[]>([null, null, null, null]);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);

  useEffect(() => {
    return () => {
      tickIntervalsRef.current.forEach((interval) => interval && clearInterval(interval));
    };
  }, []);

  const isSpinning = reelStates.some((s) => s === 'spinning');

  const handlePullLever = () => {
    if (isSpinning || activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);
    finalSlotsRef.current = slots;

    setReelStates(['spinning', 'spinning', 'spinning', 'spinning']);

    slots.forEach((slot, reelIdx) => {
      tickIntervalsRef.current[reelIdx] = setInterval(() => {
        const randomPerk = activePlayablePerks[Math.floor(Math.random() * activePlayablePerks.length)];
        setDisplayedPerks((prev) => {
          const next = [...prev];
          next[reelIdx] = randomPerk;
          return next;
        });
        playReelTick(1 + reelIdx * 0.05);
      }, TICK_INTERVAL_MS);

      window.setTimeout(() => {
        const interval = tickIntervalsRef.current[reelIdx];
        if (interval) clearInterval(interval);

        setDisplayedPerks((prev) => {
          const next = [...prev];
          next[reelIdx] = slot.perk || null;
          return next;
        });
        setReelStates((prev) => {
          const next = [...prev];
          next[reelIdx] = 'stopped';
          return next;
        });
        playReelThud();

        if (reelIdx === slots.length - 1) {
          celebrate(role);
          onRollComplete(slots);
        }
      }, 1200 + reelIdx * REEL_STOP_DELAY_MS);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <p className="text-xs font-bold text-slate-400 text-center">
        {dict?.generator?.slotMachinePrompt || 'Pull the lever for a full 4-perk loadout.'}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {displayedPerks.map((perk, idx) => (
          <motion.div
            key={idx}
            animate={reelStates[idx] === 'spinning' ? { y: [0, -6, 0] } : { y: 0 }}
            transition={reelStates[idx] === 'spinning' ? { repeat: Infinity, duration: 0.15 } : {}}
          >
            <PerkSlot
              perk={perk}
              role={role}
              slotNumber={
                reelStates[idx] === 'stopped' && finalSlotsRef.current[idx]
                  ? (finalSlotsRef.current[idx].page - 1) * 15 + finalSlotsRef.current[idx].slot
                  : undefined
              }
              dict={dict}
              backendBase={backendBase}
            />
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={handlePullLever}
        disabled={isSpinning || activePlayablePerks.length === 0}
        className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
          role === 'Survivor'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Rows3 className={`h-6 w-6 ${isSpinning ? 'animate-bounce' : ''}`} />
        <span>
          {isSpinning
            ? dict?.generator?.slotMachineSpinning || 'Reels Spinning...'
            : dict?.generator?.slotMachineSpinButton || 'Pull the Lever'}
        </span>
      </button>

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
```

Note: `getPerkIconUrl` is imported for parity with other stages' backend-base resolution needs but is not directly invoked here since `PerkSlot` resolves icons internally — remove the unused import if `npx tsc --noEmit` (or `next lint`) flags it as unused in Step 2 below.

- [ ] **Step 2: Typecheck and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no type errors. If lint flags the unused `getPerkIconUrl` import, remove that import line from `SlotMachineStage.tsx` and re-run.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/SlotMachineStage.tsx
git commit -m "feat(generator): add SlotMachineStage with staggered reel stops"
```

---

### Task 14: `TarotDeckStage`

**Files:**
- Create: `frontend/src/components/generator/modes/TarotDeckStage.tsx`

**Interfaces:**
- Consumes: `pickRandomLoadout`, `buildDrawnSlots` from `../lib/perkPicker`; `PerkSlot`; `useJackpotCelebration`; `playCardFlip` from `@/utils/perkAudio`; `motion`, `AnimatePresence` from `framer-motion`; `getPerkIconUrl` from `@/utils/perkUtils`.
- Produces: `TarotDeckStage(props: TarotDeckStageProps): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16).

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/modes/TarotDeckStage.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Sparkle } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playCardFlip } from '@/utils/perkAudio';

export interface TarotDeckStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}

interface TarotCard {
  cardName: string;
  slot: DrawnSlot;
  flipped: boolean;
}

const DEFAULT_CARD_NAMES = ['The Hex', 'The Exhaustion', 'The Obsession', 'The Boon'];

export const TarotDeckStage: React.FC<TarotDeckStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  dict,
  backendBase,
}) => {
  const [cards, setCards] = useState<TarotCard[] | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);

  const cardNames = dict?.generator?.tarotCardNames || DEFAULT_CARD_NAMES;

  const handleShuffle = () => {
    if (activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);
    const shuffledNames = [...cardNames].sort(() => Math.random() - 0.5);

    setCards(
      slots.map((slot, i) => ({
        cardName: shuffledNames[i % shuffledNames.length],
        slot,
        flipped: false,
      }))
    );
  };

  const handleFlip = (idx: number) => {
    if (!cards || cards[idx].flipped) return;

    playCardFlip();
    const next = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setCards(next);

    if (next.every((c) => c.flipped)) {
      celebrate(role);
      onRollComplete(next.map((c) => c.slot));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <p className="text-xs font-bold text-slate-400 text-center">
        {dict?.generator?.tarotTapToFlip || 'Tap a card to reveal your perk'}
      </p>

      {cards ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((card, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFlip(idx)}
              disabled={card.flipped}
              className="perspective-[1000px] cursor-pointer disabled:cursor-default"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                className="relative h-40 w-28 sm:h-44 sm:w-32"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: card.flipped ? 180 : 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-950 to-slate-950"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <Sparkle className="h-6 w-6 text-purple-400" />
                  <span className="text-[11px] font-black uppercase tracking-wide text-purple-300">
                    {card.cardName}
                  </span>
                </div>

                <div
                  className="absolute inset-0 rounded-2xl bg-slate-900/60"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <PerkSlot
                    perk={card.slot.perk}
                    role={role}
                    slotNumber={(card.slot.page - 1) * 15 + card.slot.slot}
                    compact
                    dict={dict}
                    backendBase={backendBase}
                  />
                </div>
              </motion.div>
            </button>
          ))}
        </div>
      ) : (
        <Layers className="h-16 w-16 text-slate-600" />
      )}

      <button
        type="button"
        onClick={handleShuffle}
        disabled={activePlayablePerks.length === 0}
        className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
          role === 'Survivor'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Layers className="h-6 w-6" />
        <span>{dict?.generator?.tarotShuffleButton || 'Shuffle & Draw'}</span>
      </button>

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors. If `lucide-react` does not export `Sparkle` (only `Sparkles`) in the installed version, substitute `Sparkles` in both import and usage.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/TarotDeckStage.tsx
git commit -m "feat(generator): add TarotDeckStage with 3D card-flip reveal"
```

---

### Task 15: `LootCrateStage`

**Files:**
- Create: `frontend/src/components/generator/modes/LootCrateStage.tsx`

**Interfaces:**
- Consumes: `pickRandomLoadout`, `buildDrawnSlots` from `../lib/perkPicker`; `PerkSlot`; `useJackpotCelebration`; `playReelThud` from `@/utils/perkAudio`; `motion`, `AnimatePresence` from `framer-motion`.
- Produces: `LootCrateStage(props: LootCrateStageProps): JSX.Element` — consumed by `GeneratorPage.tsx` (Task 16).

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/generator/modes/LootCrateStage.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelThud } from '@/utils/perkAudio';

export interface LootCrateStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}

type CratePhase = 'closed' | 'shaking' | 'open';

export const LootCrateStage: React.FC<LootCrateStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  dict,
  backendBase,
}) => {
  const [phase, setPhase] = useState<CratePhase>('closed');
  const [revealedSlots, setRevealedSlots] = useState<DrawnSlot[]>([]);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);

  const handleOpen = () => {
    if (phase !== 'closed' || activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);

    setPhase('shaking');

    window.setTimeout(() => {
      setPhase('open');
      setRevealedSlots([]);

      slots.forEach((slot, i) => {
        window.setTimeout(() => {
          playReelThud();
          setRevealedSlots((prev) => [...prev, slot]);
          if (i === slots.length - 1) {
            celebrate(role);
            onRollComplete(slots);
          }
        }, i * 350);
      });
    }, 700);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <p className="text-xs font-bold text-slate-400 text-center">
        {dict?.generator?.cratePrompt || 'A Trial Offering awaits. Crack it open for your loadout.'}
      </p>

      <AnimatePresence mode="wait">
        {phase !== 'open' ? (
          <motion.button
            key="crate"
            type="button"
            onClick={handleOpen}
            disabled={phase === 'shaking' || activePlayablePerks.length === 0}
            animate={
              phase === 'shaking'
                ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.05, 0.95, 1.05, 0.95, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={{ duration: 0.7 }}
            className="cursor-pointer disabled:cursor-default"
          >
            <Gift
              className={`h-28 w-28 ${
                role === 'Survivor' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'
              }`}
            />
          </motion.button>
        ) : (
          <motion.div
            key="results"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {revealedSlots.map((slot, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: -30, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <PerkSlot
                  perk={slot.perk}
                  role={role}
                  slotNumber={(slot.page - 1) * 15 + slot.slot}
                  dict={dict}
                  backendBase={backendBase}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'closed' && (
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          {dict?.generator?.crateTapToOpen || 'Tap the Trial Offering'}
        </p>
      )}
      {phase === 'shaking' && (
        <p aria-live="polite" className="text-xs font-black uppercase tracking-wide text-amber-400 animate-pulse">
          {dict?.generator?.crateOpening || 'Cracking Open...'}
        </p>
      )}

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/LootCrateStage.tsx
git commit -m "feat(generator): add LootCrateStage with shake-open-reveal sequence"
```

---

### Task 16: `GeneratorPage` orchestrator, page wiring, and cleanup

**Files:**
- Create: `frontend/src/components/generator/GeneratorPage.tsx`
- Delete: `frontend/src/components/PerkGenerator.tsx`
- Modify: `frontend/src/app/[locale]/perks/page.tsx`

**Interfaces:**
- Consumes: every component/hook from Tasks 1–15.
- Produces: `GeneratorPage(props: { allPerks: Perk[]; onSelectPerk: (perk: Perk) => void; dict?: Dictionary }): JSX.Element` — the same external prop contract `PerkGenerator` had, so `page.tsx` only needs an import-path and tag-name change.

- [ ] **Step 1: Create `GeneratorPage.tsx`**

```tsx
// frontend/src/components/generator/GeneratorPage.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Perk,
  DrawnSlot,
  RoleCategory,
  GeneratorMode,
  GeneratorStoredState,
} from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { ChaosWheelModal, ChaosMutator } from '../ChaosWheelModal';
import { CharacterConfigModal } from '../CharacterConfigModal';
import { useAuth } from '@/context/AuthContext';
import {
  fetchGeneratorConfig,
  updateGeneratorConfig,
  fetchDrawnPerks,
  addDrawnPerks,
  resetDrawnPerks,
} from '@/services/generatorApi';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAudioEnabled, setAudioEnabled } from '@/utils/perkAudio';
import { computeEligiblePool, computePlayablePool } from './lib/perkPicker';
import { Toolbar } from './Toolbar';
import { ModeSwitcher } from './ModeSwitcher';
import { LoadoutHotbar } from './LoadoutHotbar';
import { StageFrame } from './shared/StageFrame';
import { WheelStage } from './modes/WheelStage';
import { InstantStage } from './modes/InstantStage';
import { SlotMachineStage } from './modes/SlotMachineStage';
import { TarotDeckStage } from './modes/TarotDeckStage';
import { LootCrateStage } from './modes/LootCrateStage';

interface GeneratorPageProps {
  allPerks: Perk[];
  onSelectPerk: (perk: Perk) => void;
  dict?: Dictionary;
}

const STORAGE_KEY = 'lemon_dbd_generator_v8';
const SURV_STORAGE_KEY = 'lemon_dbd_enabled_survs_v7';
const KILLER_STORAGE_KEY = 'lemon_dbd_enabled_killers_v7';
const PERKS_PER_PAGE = 15;

export const GeneratorPage: React.FC<GeneratorPageProps> = ({ allPerks, onSelectPerk, dict }) => {
  const { user } = useAuth();
  const backendBase = getBackendBaseUrl();

  const [role, setRole] = useState<RoleCategory>('Survivor');
  const [genMode, setGenMode] = useState<GeneratorMode>('wheel');
  const [noRepeatPerks, setNoRepeatPerks] = useState<boolean>(true);
  const [spinDurationSec, setSpinDurationSec] = useState<number>(3);
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(true);

  const [drawnPerks, setDrawnPerks] = useState<string[]>([]);
  const [loadout, setLoadout] = useState<(DrawnSlot | null)[]>([null, null, null, null]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [isChaosModalOpen, setIsChaosModalOpen] = useState(false);
  const [activeMutator, setActiveMutator] = useState<ChaosMutator | null>(null);

  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [enabledSurvCharacters, setEnabledSurvCharacters] = useState<string[]>([]);
  const [enabledKillerCharacters, setEnabledKillerCharacters] = useState<string[]>([]);
  const [revealedSlots, setRevealedSlots] = useState<boolean[]>([false, false, false, false]);

  const characterOptions = useMemo(() => {
    const rolePerks = allPerks.filter((p) => p.category === role);
    const namesSet = new Set<string>();
    rolePerks.forEach((p) => {
      const isGeneral = !p.character || p.character === 'General' || p.is_generic_counterpart;
      if (!isGeneral && p.character) namesSet.add(p.character);
    });
    return Array.from(namesSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [allPerks, role]);

  useEffect(() => {
    setAudioEnabledState(getAudioEnabled());

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<GeneratorStoredState>;
        if (parsed.role) setRole(parsed.role);
        if (parsed.genMode) setGenMode(parsed.genMode);
        if (typeof parsed.noRepeatPerks === 'boolean') setNoRepeatPerks(parsed.noRepeatPerks);
        if (typeof parsed.spinDurationSec === 'number') setSpinDurationSec(parsed.spinDurationSec);
        if (Array.isArray(parsed.loadout)) setLoadout(parsed.loadout);
        if (typeof parsed.activeSlotIdx === 'number') setActiveSlotIdx(parsed.activeSlotIdx);
      }

      const savedSurv = localStorage.getItem(SURV_STORAGE_KEY);
      if (savedSurv) setEnabledSurvCharacters(JSON.parse(savedSurv));

      const savedKillers = localStorage.getItem(KILLER_STORAGE_KEY);
      if (savedKillers) setEnabledKillerCharacters(JSON.parse(savedKillers));
    } catch (e) {
      console.error('Failed loading generator state from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (characterOptions.length === 0) return;
    const allCharNames = ['General', ...characterOptions.map((c) => c.value)];

    if (role === 'Survivor' && enabledSurvCharacters.length === 0) {
      setEnabledSurvCharacters(allCharNames);
    } else if (role === 'Killer' && enabledKillerCharacters.length === 0) {
      setEnabledKillerCharacters(allCharNames);
    }
  }, [characterOptions, role, enabledSurvCharacters.length, enabledKillerCharacters.length]);

  useEffect(() => {
    fetchGeneratorConfig()
      .then((config) => {
        if (config.role === 'Survivor' || config.role === 'Killer') setRole(config.role);
        if (config.gen_mode) setGenMode(config.gen_mode as GeneratorMode);
        if (typeof config.no_repeat_perks !== 'undefined') setNoRepeatPerks(Boolean(config.no_repeat_perks));
        if (config.spin_duration_sec) setSpinDurationSec(config.spin_duration_sec);
      })
      .catch((e) => console.error('Failed fetching generator config from SQLite API:', e));
  }, []);

  useEffect(() => {
    fetchDrawnPerks(role)
      .then(setDrawnPerks)
      .catch((e) => console.error('Failed fetching drawn perks from SQLite API:', e));
  }, [role]);

  useEffect(() => {
    try {
      const payload: GeneratorStoredState = {
        role,
        genMode,
        noRepeatPerks,
        spinDurationSec,
        loadout,
        activeSlotIdx,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed saving generator state to localStorage:', e);
    }
  }, [role, genMode, noRepeatPerks, spinDurationSec, loadout, activeSlotIdx]);

  const activeEnabledChars = useMemo(
    () => (role === 'Survivor' ? enabledSurvCharacters : enabledKillerCharacters),
    [role, enabledSurvCharacters, enabledKillerCharacters]
  );

  const handleSaveEnabledCharacters = (newEnabled: string[]) => {
    if (role === 'Survivor') {
      setEnabledSurvCharacters(newEnabled);
      localStorage.setItem(SURV_STORAGE_KEY, JSON.stringify(newEnabled));
    } else {
      setEnabledKillerCharacters(newEnabled);
      localStorage.setItem(KILLER_STORAGE_KEY, JSON.stringify(newEnabled));
    }
  };

  const baseEligibleRolePerks = useMemo(
    () => computeEligiblePool(allPerks, role, activeEnabledChars, Boolean(user)),
    [allPerks, role, activeEnabledChars, user]
  );

  const ownedOrAvailableCount = baseEligibleRolePerks.length;

  const activePlayablePerks = useMemo(
    () => computePlayablePool(baseEligibleRolePerks, noRepeatPerks, drawnPerks),
    [baseEligibleRolePerks, noRepeatPerks, drawnPerks]
  );

  const totalPlayableCount = activePlayablePerks.length;
  const totalPages = Math.max(1, Math.ceil(totalPlayableCount / PERKS_PER_PAGE));
  const lastPagePerks = totalPlayableCount % PERKS_PER_PAGE || (totalPlayableCount > 0 ? PERKS_PER_PAGE : 0);

  const handleRoleChange = async (newRole: RoleCategory) => {
    setRole(newRole);
    setLoadout([null, null, null, null]);
    setRevealedSlots([false, false, false, false]);
    try {
      await updateGeneratorConfig({ role: newRole });
    } catch (e) {
      console.error('Failed updating role in SQLite:', e);
    }
  };

  const handleGenModeChange = async (newMode: GeneratorMode) => {
    setGenMode(newMode);
    try {
      await updateGeneratorConfig({ gen_mode: newMode });
    } catch (e) {
      console.error('Failed updating gen_mode in SQLite:', e);
    }
  };

  const handleToggleNoRepeat = async () => {
    const nextVal = !noRepeatPerks;
    setNoRepeatPerks(nextVal);
    try {
      await updateGeneratorConfig({ no_repeat_perks: nextVal ? 1 : 0 });
    } catch (e) {
      console.error('Failed updating no_repeat_perks in SQLite:', e);
    }
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabledState(next);
    setAudioEnabled(next);
  };

  const handleResetAllLoadoutAndWheels = async () => {
    setLoadout([null, null, null, null]);
    setActiveSlotIdx(0);
    setRevealedSlots([false, false, false, false]);
    setActiveMutator(null);
    try {
      const updatedDrawn = await resetDrawnPerks(role);
      setDrawnPerks(updatedDrawn);
    } catch (err) {
      console.error('Failed resetting drawn perks in SQLite API:', err);
      setDrawnPerks([]);
    }
  };

  const handleClearSlot = (slotIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadout((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setActiveSlotIdx(slotIdx);
  };

  const handleWheelWinSlot = async (wonData: DrawnSlot) => {
    setLoadout((prev) => {
      const next = [...prev];
      next[activeSlotIdx] = wonData;
      return next;
    });
    setActiveSlotIdx((prev) => (prev + 1) % 4);

    if (wonData.perk) {
      try {
        const updatedDrawn = await addDrawnPerks(role, [wonData.perk.name]);
        setDrawnPerks(updatedDrawn);
      } catch (err) {
        console.error('Failed saving drawn perk from wheel to SQLite API:', err);
      }
    }
  };

  const handleBatchRollComplete = async (slots: DrawnSlot[]) => {
    setLoadout([slots[0] || null, slots[1] || null, slots[2] || null, slots[3] || null]);
    setActiveSlotIdx(0);
    setRevealedSlots([false, false, false, false]);

    const names = slots.map((s) => s.perk?.name).filter((n): n is string => Boolean(n));
    if (names.length > 0) {
      try {
        const updatedDrawn = await addDrawnPerks(role, names);
        setDrawnPerks(updatedDrawn);
      } catch (err) {
        console.error('Failed saving drawn perks to SQLite API:', err);
      }
    }
  };

  const handleRevealSlot = (idx: number) => {
    setRevealedSlots((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  };

  return (
    <div className="w-full space-y-4">
      <Toolbar
        role={role}
        onRoleChange={handleRoleChange}
        noRepeatPerks={noRepeatPerks}
        onToggleNoRepeat={handleToggleNoRepeat}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenCharacterConfig={() => setIsCharModalOpen(true)}
        onOpenChaosModal={() => setIsChaosModalOpen(true)}
        activeMutator={activeMutator}
        onResetAll={handleResetAllLoadoutAndWheels}
        playableCount={totalPlayableCount}
        dict={dict}
      />

      {ownedOrAvailableCount === 0 ? (
        <section aria-live="polite" className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400 animate-bounce" />
          <h2 className="text-lg font-black text-amber-200">
            {dict?.generator?.noPerksTitle || `No Perks Available for ${role}`}
          </h2>
          <p className="text-xs text-amber-300/80 max-w-md">
            {dict?.generator?.noPerksDesc ||
              'All character teachables are currently deactivated or unowned. Please enable characters in character settings or unlock perks.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCharModalOpen(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-md hover:bg-amber-700 transition-all cursor-pointer"
          >
            {dict?.generator?.configureCharacters || 'Configure Characters'}
          </button>
        </section>
      ) : (
        <>
          <ModeSwitcher mode={genMode} onChange={handleGenModeChange} dict={dict} />

          <StageFrame role={role}>
            {genMode === 'wheel' && (
              <WheelStage
                totalPages={totalPages}
                perksPerPage={PERKS_PER_PAGE}
                lastPagePerks={lastPagePerks}
                spinDurationSec={spinDurationSec}
                role={role}
                sortedPerks={activePlayablePerks}
                activeSlotIdx={activeSlotIdx}
                activeMutator={activeMutator}
                onWinSlot={handleWheelWinSlot}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'instant' && (
              <InstantStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'slot' && (
              <SlotMachineStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'tarot' && (
              <TarotDeckStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'crate' && (
              <LootCrateStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
          </StageFrame>

          <LoadoutHotbar
            loadout={loadout}
            activeSlotIdx={activeSlotIdx}
            role={role}
            activeMutator={activeMutator}
            revealedSlots={revealedSlots}
            onRevealSlot={handleRevealSlot}
            onSelectPerk={onSelectPerk}
            onClearSlot={handleClearSlot}
            dict={dict}
            backendBase={backendBase}
          />
        </>
      )}

      <CharacterConfigModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        role={role}
        characterOptions={characterOptions}
        enabledCharacters={activeEnabledChars}
        onSave={handleSaveEnabledCharacters}
        dict={dict}
      />

      <ChaosWheelModal
        isOpen={isChaosModalOpen}
        onClose={() => setIsChaosModalOpen(false)}
        onSelectMutator={(m) => {
          setActiveMutator(m);
          setIsChaosModalOpen(false);
        }}
        activeMutator={activeMutator}
        dict={dict}
      />
    </div>
  );
};
```

- [ ] **Step 2: Delete the old orchestrator**

```bash
git rm frontend/src/components/PerkGenerator.tsx
```

- [ ] **Step 3: Wire `page.tsx` to the new component**

Edit `frontend/src/app/[locale]/perks/page.tsx` line 11, replacing:

```tsx
import { PerkGenerator } from '@/components/PerkGenerator';
```

with:

```tsx
import { GeneratorPage } from '@/components/generator/GeneratorPage';
```

Edit `frontend/src/app/[locale]/perks/page.tsx` around line 308, replacing:

```tsx
          <PerkGenerator
            allPerks={allPerksForGenerator}
            onSelectPerk={setSelectedPerk}
            dict={dict}
          />
```

with:

```tsx
          <GeneratorPage
            allPerks={allPerksForGenerator}
            onSelectPerk={setSelectedPerk}
            dict={dict}
          />
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors anywhere in `frontend/src` (this is the integration point — every prior task's types must line up here).

- [ ] **Step 5: Run the full unit test suite**

Run: `cd frontend && npm run test:unit`
Expected: PASS — all existing tests plus `cn.test.ts`, `perkPicker.test.ts`, and the re-verified `i18nTranslations.test.ts` are green.

- [ ] **Step 6: Run the i18n hardcoded-string checker**

Run: `cd frontend && npm run check:i18n`
Expected: no new hardcoded-string violations introduced by the new components (all user-facing text goes through `dict?.generator?.*` with an inline fallback, matching the existing convention).

- [ ] **Step 7: Manual dev-server verification**

Run: `cd frontend && npm run dev`

Then, with the dev server up, visit `http://localhost:3000/en/perks?tab=generator` and manually verify:
- The page loads with no console errors, showing the slim Toolbar (no gradient banner) and the 5-way ModeSwitcher.
- Switching Survivor/Killer updates role-colored glows throughout.
- Each of the 5 modes (Wheel, Instant, Slot Machine, Tarot Deck, Loot Crate) completes a full draw and the results land in the bottom LoadoutHotbar with visible `[P/S]` coordinate tags and no borders around perk icons.
- Character Config, Chaos Mutator, No-Repeat, Audio, and Reset All toolbar controls all still function.
- Resize the browser to a mobile width (~375px) and confirm the single-column layout holds with no horizontal scroll and the hotbar stays reachable at the bottom.
- Toggle OS-level "reduce motion" (or Chrome DevTools > Rendering > "Emulate CSS prefers-reduced-motion: reduce") and confirm reveals still complete (no animation, but no dead ends).

Expected: all of the above hold true. Stop and fix before proceeding if any check fails.

- [ ] **Step 8: Build**

Run: `cd frontend && npm run build`
Expected: production build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/generator/GeneratorPage.tsx frontend/src/app/[locale]/perks/page.tsx
git commit -m "feat(generator): wire GeneratorPage orchestrator into the perks page, retire PerkGenerator"
```

---

## Post-Plan Notes

- The empty-pool state (Task 16, Step 1) intentionally drops the old amber-bordered banner box in favor of plain centered text + icon, per the "no banner" global constraint.
- Instant/Slot/Tarot/Crate modes now uniformly respect `hex_boon_only` and `meme_loadout` Chaos Mutators via the shared `filterPerksByMutator` — previously only the Wheel applied those two mutators (Instant mode silently ignored them). This is an intentional consistency fix enabled by centralizing the logic in `lib/perkPicker.ts`.
- `spinDurationSec` and the "Blindness" curse's `revealedSlots`/obscure behavior are preserved end-to-end (Wheel still uses `spinDurationSec`; `LoadoutHotbar` still gates on `activeMutator?.id === 'blindness'`).
