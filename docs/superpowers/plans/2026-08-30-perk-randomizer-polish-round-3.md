# Perk Randomizer Polish Round 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Dead by Daylight theming and mechanical depth to the already-shipped Perk Randomizer: a Trial/Entity-themed Wheel, a "living" ambient background, a Tarot Deck whose card types genuinely predict what's under them (backed by 11 real perk-trait categories), a Loot Crate whose perks physically fly into their real loadout slot, a new Chaos Mutator that guarantees a handicap perk, bigger reveal-moment cards, and a persistent "Blind Mode" that hides perk art behind their `[P/S]` coordinates.

**Architecture:** Extends the existing "one shared picker, five presentation skins" architecture from the original redesign. New pure-logic trait predicates live in `lib/perkPicker.ts` next to the existing ones. `PerkCard` (already reused from the Vault) gains two new opt-in rendering modes (`size="large"`, `isBlind`) rather than growing new sibling components. The Wheel and background changes are purely visual (canvas/CSS), no new state.

**Tech Stack:** Same as the shipped feature — Next.js/React/TypeScript, Tailwind v4, `framer-motion` (now also used for the Loot Crate's shared-layout `layoutId` flight), the existing multilingual `DBD_KEYWORDS` data from `utils/textFormatter.tsx` (reused, not duplicated), Pillow (already used once, for the tarot placeholder images — no further Python work in this plan).

## Global Constraints

- No backend changes. No changes to the Perks Vault page or `PerkCard`'s existing Vault behavior when `size`/`isBlind`/`coordinate` aren't passed (all three are optional, defaulting to today's exact behavior).
- Blind Mode does **not** touch the Wheel's spinning canvas — only `LoadoutHotbar` and the Instant/Slot Machine/Tarot/Crate reveal displays.
- The negative-perk list (`NEGATIVE_PERK_NAMES`) starts with exactly `no mither` — do not add more entries without being told to; this was an explicit, deliberate scoping decision, not an oversight.
- New locale copy goes into all 5 locale files (`en`, `de`, `es`, `ja`, `pl`) — there is a strict structural parity test (`frontend/src/__tests__/unit/i18nTranslations.test.ts`) that fails the build if any locale is missing a key (or has an extra one) present in `en`.
- No jsdom/React-Testing-Library exists in this repo. Unit tests (`node:test` via `tsx --test`) target pure-logic modules only (`lib/perkPicker.ts`'s new predicates/resolver). UI-only changes are verified via `npx tsc --noEmit` and a manual dev-server check — do not fabricate component-render tests.
- Every `dict?.generator?.xxx` access must reference a key that actually exists in `frontend/src/locales/en/generator.ts` (this plan's own brief text is the source of truth for exact key names/values — a prior round of this same feature found and fixed real gaps where code referenced nonexistent keys, so double-check against the locale-key task before assuming a key exists).
- Tarot back-images live at `/images/tarot/<slug>.png` (already generated, already committed) and must have a text-only fallback if a file is ever missing — never a broken `<img>`.
- `PerkCard`'s new `coordinate` prop (already shipped) stays untouched by this plan except for the size-variant work in Task 7.

---

## File Structure

```
frontend/src/
  constants/
    perkTraitKeywords.ts          # new: multilingual keyword lists for Aura/Generator/Healing/Chase/Stealth detection
    chaosMutators.ts              # modified: + NEGATIVE_PERK_NAMES, + Curse of Sacrifice mutator entry
  components/
    PerkCard.tsx                  # modified: + size variant, + isBlind rendering
    generator/
      GeneratorPage.tsx           # modified: + blindMode state/persistence, wiring
      Toolbar.tsx                 # modified: + Blind Mode toggle button
      LoadoutHotbar.tsx           # modified: + isBlind passthrough, + layoutId for crate landing
      lib/
        perkPicker.ts             # modified: + trait predicates, + getPerkTarotType()
      shared/
        StageFrame.tsx            # modified: + heartbeat vignette pulse
        PerkSlot.tsx               # modified: + size/isBlind passthrough
      modes/
        WheelStage.tsx             # modified: Trial/Entity canvas reskin
        InstantStage.tsx           # modified: size="large", isBlind passthrough
        SlotMachineStage.tsx       # modified: size="large", isBlind passthrough
        LootCrateStage.tsx         # modified: size="large", isBlind passthrough, layoutId flight
        TarotDeckStage.tsx         # rewritten: taxonomy-driven types, portrait sizing, back-images, livelier flip
  types/
    perks.ts                       # modified: GeneratorStoredState + blindMode
  app/globals.css                  # modified: + heartbeat pulse keyframes
  locales/{en,de,es,ja,pl}/generator.ts  # modified: tarotCardNames becomes an object keyed by type, + Blind Mode + hidden-perk copy
  __tests__/unit/
    perkPicker.test.ts             # modified: + tests for new predicates/resolver
```

---

### Task 1: Multilingual trait keywords + `perkPicker.ts` trait predicates

**Files:**
- Create: `frontend/src/constants/perkTraitKeywords.ts`
- Modify: `frontend/src/constants/chaosMutators.ts`
- Modify: `frontend/src/components/generator/lib/perkPicker.ts`
- Modify: `frontend/src/__tests__/unit/perkPicker.test.ts`

**Interfaces:**
- Consumes: `Perk` from `@/types/perks`.
- Produces (used by Task 2's mutator and Task 16's `TarotDeckStage`):
  - `export type TarotType = 'hex' | 'boon' | 'sacrifice' | 'exhaustion' | 'obsession' | 'aura' | 'generator' | 'healing' | 'chase' | 'stealth' | 'entity';`
  - `isHexPerk(perk: Perk): boolean`
  - `isBoonPerk(perk: Perk): boolean`
  - `isNegativePerk(perk: Perk): boolean`
  - `isAuraPerk(perk: Perk): boolean`
  - `isGeneratorPerk(perk: Perk): boolean`
  - `isHealingPerk(perk: Perk): boolean`
  - `isChasePerk(perk: Perk): boolean`
  - `isStealthPerk(perk: Perk): boolean`
  - `getPerkTarotType(perk: Perk): TarotType`

- [ ] **Step 1: Create the multilingual keyword constants**

Create `frontend/src/constants/perkTraitKeywords.ts`:

```ts
// frontend/src/constants/perkTraitKeywords.ts
// Multilingual detection keywords for the Tarot Deck's "type predicts the
// perk" taxonomy. Sourced from the same curated, already-vetted multilingual
// term lists already used in `utils/textFormatter.tsx`'s DBD_KEYWORDS
// (EN/PL/DE/ES/JA) -- not invented here. Some categories (Generator,
// Healing) only have partial language coverage because DBD_KEYWORDS itself
// doesn't yet have full per-language terms for every one of these concepts.
// A perk whose description has no matching keyword for the active locale
// simply falls through to the "entity" catch-all in getPerkTarotType --
// never a broken match, just a lower hit-rate for that language/category
// combination.

export const AURA_KEYWORDS: readonly string[] = [
  'Aura Reading', 'Auras', 'Aura', // EN / ES (identical spelling)
  'Czytanie Aur', 'Aury Zabójcy', 'Aury', 'Aurę', // PL
  'Auren', // DE
  'オーラ', // JA
];

export const GENERATOR_KEYWORDS: readonly string[] = [
  'Generators', 'Generator', // EN
  'Generatory', // PL
];

export const HEALING_KEYWORDS: readonly string[] = [
  'Med-Kit', 'Medkit', 'First Aid', 'Styptic', 'Serum', 'Bandage', 'Healthy State', // EN
];

export const CHASE_KEYWORDS: readonly string[] = [
  'Haste', 'Hindered', 'Pallets', 'Pallet', 'Windows', 'Window', // EN
  'Pośpiech', 'Pośpiechu', 'Spowolnienie', 'Palety', 'Paleta', // PL
  'Eile', // DE
  'Celeridad', 'Entorpecimiento', // ES
  '迅速', '妨害', // JA
];

export const STEALTH_KEYWORDS: readonly string[] = [
  'Terror Radius', 'Undetectable', 'Oblivious', // EN
  'Zasięg Terroru', 'Zasięgu Terroru', 'Niewykrywalność', 'Nieświadomość', // PL
  'Terrorradius', 'Unentdeckbar', 'Ahnungslos', // DE
  'Radio de terror', 'Indetectable', 'Inconsciente', // ES
  '脅威範囲', '探知不可', '忘却', // JA
];

export const OBSESSION_KEYWORDS: readonly string[] = [
  'Obsession', // EN
  'Obsesja', // PL
  'Besessenheit', // DE
  'Obsesión', // ES
  'オブセッション', // JA
];
```

- [ ] **Step 2: Add `NEGATIVE_PERK_NAMES` to `chaosMutators.ts`**

Edit `frontend/src/constants/chaosMutators.ts`, adding after the existing `MEME_PERK_NAMES` export (do not touch `EXHAUSTION_PERK_NAMES`/`MEME_PERK_NAMES`/`CHAOS_MUTATORS` — those are edited in Task 2):

```ts
// Perks with a genuine built-in drawback/handicap, not just "off-meta."
// Deliberately starts small (one entry) rather than a padded list that
// might misjudge a perk's actual balance -- extend this list only when
// explicitly asked to.
export const NEGATIVE_PERK_NAMES: ReadonlySet<string> = new Set([
  'no mither',
]);
```

- [ ] **Step 3: Write the failing tests for the new predicates and resolver**

Edit `frontend/src/__tests__/unit/perkPicker.test.ts`, adding these imports to the existing `import { ... } from '@/components/generator/lib/perkPicker';` block:

```ts
  isHexPerk,
  isBoonPerk,
  isNegativePerk,
  isAuraPerk,
  isGeneratorPerk,
  isHealingPerk,
  isChasePerk,
  isStealthPerk,
  getPerkTarotType,
```

Append these tests at the end of the file:

```ts
test('isHexPerk / isBoonPerk: split the combined Hex/Boon check by name or description prefix', () => {
  assert.ok(isHexPerk(makePerk({ name: 'Hex: Ruin' })));
  assert.ok(!isBoonPerk(makePerk({ name: 'Hex: Ruin' })));
  assert.ok(isBoonPerk(makePerk({ name: 'Boon: Circle of Healing' })));
  assert.ok(!isHexPerk(makePerk({ name: 'Boon: Circle of Healing' })));
  assert.ok(isHexPerk(makePerk({ name: 'Made-Up', description: 'Applies a Hex: effect.' })));
  assert.ok(!isHexPerk(makePerk({ name: 'Sprint Burst' })));
});

test('isNegativePerk: matches the curated handicap list', () => {
  assert.ok(isNegativePerk(makePerk({ name: 'No Mither' })));
  assert.ok(isNegativePerk(makePerk({ name: '  NO MITHER  ' })));
  assert.ok(!isNegativePerk(makePerk({ name: 'Iron Will' })));
});

test('isAuraPerk / isGeneratorPerk / isHealingPerk / isChasePerk / isStealthPerk: match description keywords across locales', () => {
  assert.ok(isAuraPerk(makePerk({ name: 'Made-Up', description: 'Reveals the Aura of injured Survivors.' })));
  assert.ok(isAuraPerk(makePerk({ name: 'Made-Up', description: 'Ujawnia Aury rannych Ocalałych.' })));
  assert.ok(isGeneratorPerk(makePerk({ name: 'Made-Up', description: 'Repairing Generators is faster.' })));
  assert.ok(isHealingPerk(makePerk({ name: 'Made-Up', description: 'Increases healing speed with a Med-Kit.' })));
  assert.ok(isChasePerk(makePerk({ name: 'Made-Up', description: 'Grants the Haste Status Effect.' })));
  assert.ok(isStealthPerk(makePerk({ name: 'Made-Up', description: 'Your Terror Radius is reduced.' })));
  assert.ok(!isAuraPerk(makePerk({ name: 'Made-Up', description: 'A perk with no matching keyword at all.' })));
});

test('getPerkTarotType: resolves in priority order, Hex/Boon/Sacrifice/Exhaustion before the broader categories', () => {
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Hex: Ruin' })), 'hex');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Boon: Shadow Step' })), 'boon');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'No Mither' })), 'sacrifice');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Dead Hard' })), 'exhaustion');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Related to the Obsession.' })), 'obsession');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Reveals Auras.' })), 'aura');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Repair Generators faster.' })), 'generator');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Heal faster with a Med-Kit.' })), 'healing');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Grants Haste after a hit.' })), 'chase');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up', description: 'Reduces your Terror Radius.' })), 'stealth');
  assert.strictEqual(getPerkTarotType(makePerk({ name: 'Made-Up Perk', description: 'Does something else entirely.' })), 'entity');
});

test('getPerkTarotType: a Hex perk that also mentions Aura in its description still resolves to hex (priority order holds)', () => {
  const perk = makePerk({ name: 'Hex: The Third Seal', description: 'Blinds the Aura of the obsession.' });
  assert.strictEqual(getPerkTarotType(perk), 'hex');
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd frontend && npx tsx --test src/__tests__/unit/perkPicker.test.ts`
Expected: FAIL — the new imports (`isHexPerk`, etc.) don't exist yet in `lib/perkPicker.ts`.

- [ ] **Step 5: Implement the predicates and resolver**

Edit `frontend/src/components/generator/lib/perkPicker.ts`. Change the existing import line:

```ts
import { EXHAUSTION_PERK_NAMES, MEME_PERK_NAMES } from '@/constants/chaosMutators';
```

to:

```ts
import { EXHAUSTION_PERK_NAMES, MEME_PERK_NAMES, NEGATIVE_PERK_NAMES } from '@/constants/chaosMutators';
import {
  AURA_KEYWORDS,
  GENERATOR_KEYWORDS,
  HEALING_KEYWORDS,
  CHASE_KEYWORDS,
  STEALTH_KEYWORDS,
  OBSESSION_KEYWORDS,
} from '@/constants/perkTraitKeywords';
```

Then append this block at the end of the file (after `buildDrawnSlots`):

```ts
export type TarotType =
  | 'hex'
  | 'boon'
  | 'sacrifice'
  | 'exhaustion'
  | 'obsession'
  | 'aura'
  | 'generator'
  | 'healing'
  | 'chase'
  | 'stealth'
  | 'entity';

export function isHexPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  const descLower = (perk.description || '').toLowerCase();
  return nameLower.includes('hex:') || descLower.includes('hex:');
}

export function isBoonPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  const descLower = (perk.description || '').toLowerCase();
  return nameLower.includes('boon:') || descLower.includes('boon:');
}

export function isNegativePerk(perk: Perk): boolean {
  return NEGATIVE_PERK_NAMES.has(perk.name.toLowerCase().trim());
}

function descriptionMatchesAny(perk: Perk, keywords: readonly string[]): boolean {
  const desc = (perk.description || '').toLowerCase();
  return keywords.some((keyword) => desc.includes(keyword.toLowerCase()));
}

export function isAuraPerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, AURA_KEYWORDS);
}

export function isGeneratorPerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, GENERATOR_KEYWORDS);
}

export function isHealingPerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, HEALING_KEYWORDS);
}

export function isChasePerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, CHASE_KEYWORDS);
}

export function isStealthPerk(perk: Perk): boolean {
  return descriptionMatchesAny(perk, STEALTH_KEYWORDS);
}

function isObsessionPerk(perk: Perk): boolean {
  const nameLower = perk.name.toLowerCase();
  return (
    nameLower.includes('obsession') ||
    descriptionMatchesAny(perk, OBSESSION_KEYWORDS)
  );
}

/**
 * Classifies a perk into exactly one Tarot card type, checked in priority
 * order (most specific/exclusive first). Every drawn perk resolves to a
 * type -- 'entity' is the catch-all for anything that matches nothing more
 * specific, which is most perks by design.
 */
export function getPerkTarotType(perk: Perk): TarotType {
  if (isHexPerk(perk)) return 'hex';
  if (isBoonPerk(perk)) return 'boon';
  if (isNegativePerk(perk)) return 'sacrifice';
  if (isExhaustionPerk(perk)) return 'exhaustion';
  if (isObsessionPerk(perk)) return 'obsession';
  if (isAuraPerk(perk)) return 'aura';
  if (isGeneratorPerk(perk)) return 'generator';
  if (isHealingPerk(perk)) return 'healing';
  if (isChasePerk(perk)) return 'chase';
  if (isStealthPerk(perk)) return 'stealth';
  return 'entity';
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npx tsx --test src/__tests__/unit/perkPicker.test.ts`
Expected: PASS (all tests green, including the pre-existing ones from the original redesign).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/constants/perkTraitKeywords.ts frontend/src/constants/chaosMutators.ts frontend/src/components/generator/lib/perkPicker.ts frontend/src/__tests__/unit/perkPicker.test.ts
git commit -m "feat(generator): add Tarot trait taxonomy (11 types) and negative-perk detection"
```

---

### Task 2: "Curse of Sacrifice" Chaos Mutator

**Files:**
- Modify: `frontend/src/constants/chaosMutators.ts`

**Interfaces:**
- Consumes: `NEGATIVE_PERK_NAMES` (Task 1), `ChaosMutator` from `@/types/chaos`.
- Produces: a 5th entry in `CHAOS_MUTATORS`, automatically picked up by the existing `ChaosWheelModal.tsx` (which renders `CHAOS_MUTATORS.length` slices — no changes needed there) and by `filterPerksByMutator`/`isPerkBlockedByMutator` in `lib/perkPicker.ts` (Task 3 wires the actual filtering behavior).

- [ ] **Step 1: Add the new mutator entry**

Edit `frontend/src/constants/chaosMutators.ts`, adding a 5th entry to the `CHAOS_MUTATORS` array (after `hex_boon_only`, before the closing `];`):

```ts
  {
    id: 'negative_only',
    name: 'Curse of Sacrifice',
    description:
      'The Entity demands a price. At least one drawn perk will be a genuine handicap.',
    type: 'curse',
    icon: '💀',
    badgeBg: 'bg-rose-950/90',
    borderColor: 'border-rose-600',
    textColor: 'text-rose-300',
  },
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors (this is a data-only addition; `ChaosWheelModal.tsx` already iterates `CHAOS_MUTATORS` generically).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/constants/chaosMutators.ts
git commit -m "feat(generator): add Curse of Sacrifice chaos mutator"
```

---

### Task 3: Wire the Sacrifice mutator's filtering behavior

**Files:**
- Modify: `frontend/src/components/generator/lib/perkPicker.ts`
- Modify: `frontend/src/__tests__/unit/perkPicker.test.ts`

**Interfaces:**
- Consumes: `isNegativePerk` (Task 1), the `negative_only` mutator id (Task 2).
- Produces: `filterPerksByMutator` now also handles `mutator.id === 'negative_only'` — used by every mode stage exactly as the other mutator ids already are (no signature change).

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/__tests__/unit/perkPicker.test.ts`:

```ts
const sacrificeMutator: ChaosMutator = {
  id: 'negative_only',
  name: 'Curse of Sacrifice',
  description: '',
  type: 'curse',
  icon: '💀',
  badgeBg: '',
  borderColor: '',
  textColor: '',
};

test('filterPerksByMutator: negative_only keeps only negative/handicap perks, falling back when none exist', () => {
  const perksWithNegative = [makePerk({ name: 'No Mither' }), makePerk({ name: 'Iron Will' })];
  const resultWith = filterPerksByMutator(perksWithNegative, sacrificeMutator);
  assert.strictEqual(resultWith.length, 1);
  assert.strictEqual(resultWith[0].name, 'No Mither');

  const perksWithoutNegative = [makePerk({ name: 'Iron Will' }), makePerk({ name: 'Sprint Burst' })];
  const resultWithout = filterPerksByMutator(perksWithoutNegative, sacrificeMutator);
  assert.deepStrictEqual(resultWithout, perksWithoutNegative);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/perkPicker.test.ts`
Expected: FAIL — `filterPerksByMutator` doesn't yet narrow for `negative_only`, so `resultWith.length` is `2`, not `1`.

- [ ] **Step 3: Update `filterPerksByMutator`**

Edit `frontend/src/components/generator/lib/perkPicker.ts`, changing the `included` branching inside `filterPerksByMutator`:

```ts
  let included: Perk[];
  if (mutator.id === 'hex_boon_only') {
    included = notBlocked.filter(isHexOrBoonPerk);
  } else if (mutator.id === 'meme_loadout') {
    included = notBlocked.filter(isMemePerk);
  } else if (mutator.id === 'negative_only') {
    included = notBlocked.filter(isNegativePerk);
  } else {
    included = notBlocked;
  }
```

(This is the only change — the function's signature, the exclusion step above it, and the fallback-to-`notBlocked` return are unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx tsx --test src/__tests__/unit/perkPicker.test.ts`
Expected: PASS (all tests, including every pre-existing one).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/generator/lib/perkPicker.ts frontend/src/__tests__/unit/perkPicker.test.ts
git commit -m "feat(generator): wire Curse of Sacrifice into filterPerksByMutator"
```

---

### Task 4: Locale copy — Tarot types, Blind Mode, hidden-perk text

**Files:**
- Modify: `frontend/src/locales/en/generator.ts`
- Modify: `frontend/src/locales/de/generator.ts`
- Modify: `frontend/src/locales/es/generator.ts`
- Modify: `frontend/src/locales/ja/generator.ts`
- Modify: `frontend/src/locales/pl/generator.ts`

**Interfaces:**
- Produces: `dict.generator.tarotCardNames` (now an **object** keyed by `TarotType`, replacing the old 8-entry flavor array — this is a breaking shape change, see Step 1), `dict.generator.blindModeTooltip`, `dict.generator.hiddenPerkLabel`. Consumed by Task 16 (`TarotDeckStage`), Task 9 (`Toolbar`), Task 7 (`PerkCard`).

- [ ] **Step 1: Replace the `tarotCardNames` array with a type-keyed object, and add the new keys, in `en/generator.ts`**

Edit `frontend/src/locales/en/generator.ts`, replacing this existing line:

```ts
  tarotCardNames: ["The Hex", "The Exhaustion", "The Obsession", "The Boon", "The Sacrifice", "The Chase", "The Hatch", "The Entity"],
```

with:

```ts
  tarotCardNames: {
    hex: "The Hex",
    boon: "The Boon",
    sacrifice: "The Sacrifice",
    exhaustion: "The Exhaustion",
    obsession: "The Obsession",
    aura: "The Watcher",
    generator: "The Machinist",
    healing: "The Caregiver",
    chase: "The Chase",
    stealth: "The Shadow",
    entity: "The Entity",
  },
  blindModeTooltip: "Hide Perk Icons (Blind Mode)",
  hiddenPerkLabel: "Hidden — check in-game",
```

- [ ] **Step 2: Same shape, German translations, in `de/generator.ts`**

Replace the existing `tarotCardNames: [...]` line with:

```ts
  tarotCardNames: {
    hex: "Der Fluch",
    boon: "Der Segen",
    sacrifice: "Das Opfer",
    exhaustion: "Die Erschöpfung",
    obsession: "Die Besessenheit",
    aura: "Der Beobachter",
    generator: "Der Mechaniker",
    healing: "Die Pflegekraft",
    chase: "Die Jagd",
    stealth: "Der Schatten",
    entity: "Die Entität",
  },
  blindModeTooltip: "Perk-Symbole verbergen (Blind-Modus)",
  hiddenPerkLabel: "Verborgen — im Spiel nachsehen",
```

- [ ] **Step 3: Same shape, Spanish translations, in `es/generator.ts`**

Replace the existing `tarotCardNames: [...]` line with:

```ts
  tarotCardNames: {
    hex: "El Maleficio",
    boon: "La Bendición",
    sacrifice: "El Sacrificio",
    exhaustion: "El Agotamiento",
    obsession: "La Obsesión",
    aura: "El Vigilante",
    generator: "El Mecánico",
    healing: "La Sanadora",
    chase: "La Persecución",
    stealth: "La Sombra",
    entity: "La Entidad",
  },
  blindModeTooltip: "Ocultar Iconos de Habilidades (Modo Ciego)",
  hiddenPerkLabel: "Oculto — consulta en el juego",
```

- [ ] **Step 4: Same shape, Japanese translations, in `ja/generator.ts`**

Replace the existing `tarotCardNames: [...]` line with:

```ts
  tarotCardNames: {
    hex: "呪術",
    boon: "恵み",
    sacrifice: "生贄",
    exhaustion: "疲労",
    obsession: "オブセッション",
    aura: "監視者",
    generator: "機械技師",
    healing: "介護者",
    chase: "追跡",
    stealth: "影",
    entity: "エンティティ",
  },
  blindModeTooltip: "パークアイコンを非表示（ブラインドモード）",
  hiddenPerkLabel: "非表示 — ゲーム内で確認",
```

- [ ] **Step 5: Same shape, Polish translations, in `pl/generator.ts`**

Replace the existing `tarotCardNames: [...]` line with:

```ts
  tarotCardNames: {
    hex: "Klątwa",
    boon: "Dar",
    sacrifice: "Ofiara",
    exhaustion: "Wyczerpanie",
    obsession: "Obsesja",
    aura: "Obserwator",
    generator: "Mechanik",
    healing: "Opiekun",
    chase: "Pościg",
    stealth: "Cień",
    entity: "Byt",
  },
  blindModeTooltip: "Ukryj ikony umiejętności (Tryb Ślepy)",
  hiddenPerkLabel: "Ukryte — sprawdź w grze",
```

- [ ] **Step 6: Run the i18n parity test**

Run: `cd frontend && npx tsx --test src/__tests__/unit/i18nTranslations.test.ts`
Expected: PASS — all 5 locales still conform to the English dictionary shape (the parity checker recurses into objects, so the `tarotCardNames` object's 11 keys must match across all 5 locales exactly, which they do).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/locales/en/generator.ts frontend/src/locales/de/generator.ts frontend/src/locales/es/generator.ts frontend/src/locales/ja/generator.ts frontend/src/locales/pl/generator.ts
git commit -m "feat(generator): add localized Tarot type names and Blind Mode copy"
```

---

### Task 5: Heartbeat vignette pulse CSS

**Files:**
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Produces: a `.dbd-heartbeat-vignette` CSS class + `heartbeatPulse` keyframes, consumed by `StageFrame.tsx` (Task 6).

- [ ] **Step 1: Add the keyframes and class**

Edit `frontend/src/app/globals.css`, adding this block immediately after the existing `.dark .dbd-fog-overlay { ... }` rule (around line 48):

```css
@keyframes heartbeatPulse {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 0.65;
  }
}

.dbd-heartbeat-vignette {
  background: radial-gradient(ellipse at center, transparent 55%, rgba(190, 30, 40, 0.35) 100%);
  animation: heartbeatPulse 1.2s ease-in-out infinite;
}

.dbd-heartbeat-vignette--static {
  background: radial-gradient(ellipse at center, transparent 55%, rgba(190, 30, 40, 0.5) 100%);
  animation: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(generator): add heartbeat vignette pulse CSS"
```

---

### Task 6: `StageFrame` — apply the heartbeat pulse

**Files:**
- Modify: `frontend/src/components/generator/shared/StageFrame.tsx`

**Interfaces:**
- Consumes: `.dbd-heartbeat-vignette` / `.dbd-heartbeat-vignette--static` (Task 5).
- No prop/interface changes — `StageFrameProps` stays exactly `{ role, children, className? }`.

- [ ] **Step 1: Add the vignette element**

Edit `frontend/src/components/generator/shared/StageFrame.tsx`. Find the `return (` block and add a new absolutely-positioned div right after the `<ParticlesProvider>...</ParticlesProvider>` block, before the `<div className="relative z-10">{children}</div>` line:

```tsx
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0',
          reduceMotion ? 'dbd-heartbeat-vignette--static' : 'dbd-heartbeat-vignette'
        )}
      />

      <div className="relative z-10">{children}</div>
```

(`reduceMotion` and `cn` are already imported/available in this file from the existing particle-reduced-motion logic — no new imports needed.)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/shared/StageFrame.tsx
git commit -m "feat(generator): apply heartbeat vignette pulse to StageFrame"
```

---

### Task 7: `PerkCard` — size variant + Blind Mode rendering

**Files:**
- Modify: `frontend/src/components/PerkCard.tsx`

**Interfaces:**
- Produces: `PerkCardProps` gains `size?: 'default' | 'large'` (defaults to `'default'`, today's exact Vault footprint) and `isBlind?: boolean` (defaults to `false`). Both are additive/optional — every existing Vault call site (`page.tsx`) is unaffected. Consumed by Task 8 (`PerkSlot`) and, through it, every mode stage.

- [ ] **Step 1: Add the new props and a size-class lookup**

Edit `frontend/src/components/PerkCard.tsx`. Change the props interface and destructuring:

```ts
interface PerkCardProps {
  perk: Perk;
  viewMode?: ViewDisplayMode;
  onSelect: (perk: Perk) => void;
  dict?: PerkDictionary;
  /** When provided, renders a small "[P{page}/S{slot}]" coordinate tag so the
   * perk can be located quickly in the Vault (used by the Perk Randomizer). */
  coordinate?: { page: number; slot: number };
  /** Grid-view footprint. 'large' is used by the Randomizer's reveal
   * moments; 'default' (the Vault's own size) is the default. */
  size?: 'default' | 'large';
  /** When true, hides the perk icon/avatar/hover-preview behind a "?"
   * placeholder, showing only the coordinate tag if one is provided.
   * Clicking does nothing while blind. */
  isBlind?: boolean;
}

export const PerkCard: React.FC<PerkCardProps> = ({
  perk,
  viewMode = 'grid',
  onSelect,
  dict,
  coordinate,
  size = 'default',
  isBlind = false,
}) => {
```

Add this constant near the top of the file, right after the `export type { Perk };` line:

```ts
const GRID_SIZE_CLASSES: Record<'default' | 'large', string> = {
  default: 'h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48',
  large: 'h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64 xl:h-72 xl:w-72',
};
```

- [ ] **Step 2: Add the Blind Mode render branch**

Edit `frontend/src/components/PerkCard.tsx`. Right after the `coordinateLabel` computation (added in the earlier redesign round) and before the `if (viewMode === 'list') {` branch, add:

```tsx
  if (isBlind) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-2 p-2 ${GRID_SIZE_CLASSES[size]}`}
      >
        {coordinateLabel && (
          <span className="absolute top-1 left-1 z-10 font-mono text-[10px] font-black text-amber-400/90">
            {coordinateLabel}
          </span>
        )}
        <HelpCircle className="h-10 w-10 text-slate-500" />
        <span className="text-[11px] font-bold text-slate-500 text-center px-2">
          {dict?.generator?.hiddenPerkLabel || 'Hidden — check in-game'}
        </span>
      </div>
    );
  }
```

Add `HelpCircle` to the existing `lucide-react` import at the top of the file:

```ts
import { ImageOff, Lock, HelpCircle } from 'lucide-react';
```

- [ ] **Step 3: Use the size-class lookup in the grid view**

Edit `frontend/src/components/PerkCard.tsx`'s grid-view `<button>` (the non-list-view return statement), replacing the hardcoded size classes:

```tsx
        className="relative flex h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48 cursor-pointer items-center justify-center transition-transform duration-200 group-hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl"
```

with:

```tsx
        className={`relative flex cursor-pointer items-center justify-center transition-transform duration-200 group-hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl ${GRID_SIZE_CLASSES[size]}`}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors. This also confirms `dict?.generator?.hiddenPerkLabel` (added in Task 4) resolves against the strict `PerkDictionary`/`Dictionary` types.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PerkCard.tsx
git commit -m "feat(generator): add PerkCard size variant and Blind Mode rendering"
```

---

### Task 8: `PerkSlot` — thread `size`/`isBlind` through to `PerkCard`

**Files:**
- Modify: `frontend/src/components/generator/shared/PerkSlot.tsx`

**Interfaces:**
- Produces: `PerkSlotProps` gains `size?: 'default' | 'large'` and `isBlind?: boolean` (both optional, default to today's behavior). Consumed by every mode stage (Tasks 11–16) and `LoadoutHotbar` (Task 10).

- [ ] **Step 1: Add the new props and forward them**

Edit `frontend/src/components/generator/shared/PerkSlot.tsx`. Change `SLOT_SIZE_CLASSES` to a lookup matching `PerkCard`'s:

```ts
const SLOT_SIZE_CLASSES: Record<'default' | 'large', string> = {
  default: 'h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48',
  large: 'h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64 xl:h-72 xl:w-72',
};
```

Update `PerkSlotProps` and the component signature:

```ts
export interface PerkSlotProps {
  perk?: Perk | null;
  role?: RoleCategory;
  page?: number;
  slot?: number;
  isObscured?: boolean;
  isActive?: boolean;
  announce?: boolean;
  /** 'large' is used by the reveal-moment stages; the always-visible
   * LoadoutHotbar stays at 'default'. */
  size?: 'default' | 'large';
  /** Persistent Blind Mode -- distinct from `isObscured` (the Chaos
   * "Curse of Blindness" mutator), which does NOT show the coordinate tag.
   * Blind Mode always shows it. */
  isBlind?: boolean;
  onClick?: () => void;
  dict?: Dictionary;
}

export const PerkSlot: React.FC<PerkSlotProps> = ({
  perk,
  page,
  slot,
  isObscured = false,
  isActive = false,
  announce = false,
  size = 'default',
  isBlind = false,
  onClick,
  dict,
}) => {
```

- [ ] **Step 2: Use the size lookup in the existing `isObscured`/empty branches, and forward both new props to `PerkCard`**

Edit the two early-return branches to use `SLOT_SIZE_CLASSES[size]` instead of the bare `SLOT_SIZE_CLASSES` constant:

```tsx
  if (isObscured) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          SLOT_SIZE_CLASSES[size],
          'flex flex-col items-center justify-center gap-1.5 rounded-2xl text-purple-400 cursor-pointer'
        )}
      >
        <EyeOff className="h-10 w-10 animate-pulse" />
        <span className="text-[11px] font-black uppercase tracking-wide text-center px-2">
          {dict?.generator?.clickToReveal || '??? (Click to Reveal)'}
        </span>
      </button>
    );
  }

  if (!perk) {
    return (
      <div
        className={cn(
          SLOT_SIZE_CLASSES[size],
          'flex flex-col items-center justify-center gap-1.5 text-slate-600'
        )}
      >
        <ImageOff className="h-8 w-8" />
        <span className="text-[11px] font-bold text-slate-500 text-center px-2">
          {dict?.generator?.emptySlot || 'Empty Slot'}
        </span>
      </div>
    );
  }
```

Then edit the final return statement to forward `size` and `isBlind` to `PerkCard`:

```tsx
  return (
    <div className={cn('relative', isActive && 'rounded-2xl ring-2 ring-amber-500/60')}>
      <PerkCard
        perk={perk}
        onSelect={() => onClick?.()}
        dict={dict}
        coordinate={coordinate}
        size={size}
        isBlind={isBlind}
      />

      {announce && !isBlind && (
        <span aria-live="polite" className="sr-only">
          {perk.name}
        </span>
      )}
    </div>
  );
};
```

(The `announce && !isBlind` guard stops the accessible name announcement from spoiling the perk name while Blind Mode is on — the visual is already hidden, the screen-reader announcement should be too.)

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/generator/shared/PerkSlot.tsx
git commit -m "feat(generator): thread size and Blind Mode through PerkSlot to PerkCard"
```

---

### Task 9: `Toolbar` — Blind Mode toggle

**Files:**
- Modify: `frontend/src/components/generator/Toolbar.tsx`

**Interfaces:**
- Produces: `ToolbarProps` gains `blindMode: boolean; onToggleBlindMode: () => void;` — consumed by `GeneratorPage.tsx` (Task 10).

- [ ] **Step 1: Add the prop and the toggle button**

Edit `frontend/src/components/generator/Toolbar.tsx`. Add `EyeOff` to the `lucide-react` import:

```ts
import { Shield, Skull, Repeat, Volume2, VolumeX, RotateCcw, EyeOff } from 'lucide-react';
```

Add to `ToolbarProps`:

```ts
export interface ToolbarProps {
  role: RoleCategory;
  onRoleChange: (role: RoleCategory) => void;
  noRepeatPerks: boolean;
  onToggleNoRepeat: () => void;
  blindMode: boolean;
  onToggleBlindMode: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenChaosModal: () => void;
  activeMutator: ChaosMutator | null;
  onResetAll: () => void;
  playableCount: number;
  dict?: Dictionary;
}
```

Add `blindMode`/`onToggleBlindMode` to the destructured props, and a new `IconToggleButton` right after the No-Repeat button:

```tsx
        <IconToggleButton
          icon={<Repeat className="h-5 w-5" />}
          label={dict?.generator?.noRepeatTooltip || 'Toggle No-Repeat Perks'}
          isActive={noRepeatPerks}
          onClick={onToggleNoRepeat}
        />
        <IconToggleButton
          icon={<EyeOff className="h-5 w-5" />}
          label={dict?.generator?.blindModeTooltip || 'Hide Perk Icons (Blind Mode)'}
          isActive={blindMode}
          onClick={onToggleBlindMode}
          className={blindMode ? 'text-purple-400 bg-purple-500/10' : undefined}
        />
```

(The `className` override matches the purple accent used by the existing Blindness curse elsewhere, distinguishing this active state from the amber used by every other active toggle in this toolbar.)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/Toolbar.tsx
git commit -m "feat(generator): add Blind Mode toggle to Toolbar"
```

---

### Task 10: `GeneratorPage` — Blind Mode state, persistence, and wiring

**Files:**
- Modify: `frontend/src/types/perks.ts`
- Modify: `frontend/src/components/generator/GeneratorPage.tsx`

**Interfaces:**
- Consumes: `Toolbar`'s new props (Task 9), `LoadoutHotbar`'s new `isBlind` prop (Task 11), every mode stage's new `size`/`isBlind` props (Tasks 12–14, 16).
- Produces: `blindMode: boolean` state, threaded to every consumer listed above.

- [ ] **Step 1: Extend `GeneratorStoredState`**

Edit `frontend/src/types/perks.ts`, adding `blindMode` to the existing interface:

```ts
export interface GeneratorStoredState {
  role: RoleCategory;
  genMode: GeneratorMode;
  noRepeatPerks: boolean;
  spinDurationSec: number;
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  blindMode: boolean;
}
```

- [ ] **Step 2: Add `blindMode` state, load/save it, and wire it to `Toolbar`**

Edit `frontend/src/components/generator/GeneratorPage.tsx`. Add state near the other toggle state (`noRepeatPerks`):

```ts
  const [blindMode, setBlindMode] = useState<boolean>(false);
```

In the `localStorage` load `useEffect`, add a line reading it back:

```ts
        if (typeof parsed.noRepeatPerks === 'boolean') setNoRepeatPerks(parsed.noRepeatPerks);
        if (typeof parsed.blindMode === 'boolean') setBlindMode(parsed.blindMode);
```

In the `localStorage` save `useEffect`, add it to the payload and its dependency array:

```ts
      const payload: GeneratorStoredState = {
        role,
        genMode,
        noRepeatPerks,
        spinDurationSec,
        loadout,
        activeSlotIdx,
        blindMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed saving generator state to localStorage:', e);
    }
  }, [role, genMode, noRepeatPerks, spinDurationSec, loadout, activeSlotIdx, blindMode]);
```

Add a handler next to `handleToggleNoRepeat`:

```ts
  const handleToggleBlindMode = () => {
    setBlindMode((prev) => !prev);
  };
```

Wire it into the `<Toolbar>` element:

```tsx
      <Toolbar
        role={role}
        onRoleChange={handleRoleChange}
        noRepeatPerks={noRepeatPerks}
        onToggleNoRepeat={handleToggleNoRepeat}
        blindMode={blindMode}
        onToggleBlindMode={handleToggleBlindMode}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenChaosModal={() => setIsChaosModalOpen(true)}
        activeMutator={activeMutator}
        onResetAll={handleResetAllLoadoutAndWheels}
        playableCount={totalPlayableCount}
        dict={dict}
      />
```

- [ ] **Step 3: Pass `blindMode` to `LoadoutHotbar` and the 4 non-Wheel mode stages (not `WheelStage`)**

Edit the JSX for `InstantStage`, `SlotMachineStage`, `TarotDeckStage`, `LootCrateStage`, and `LoadoutHotbar`, adding `isBlind={blindMode}` and `size="large"` (the mode stages only — `LoadoutHotbar` gets `isBlind` but not `size`, since it stays at the default size):

```tsx
            {genMode === 'instant' && (
              <InstantStage
                key={role}
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                isBlind={blindMode}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'slot' && (
              <SlotMachineStage
                key={role}
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                isBlind={blindMode}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'tarot' && (
              <TarotDeckStage
                key={role}
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                isBlind={blindMode}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'crate' && (
              <LootCrateStage
                key={role}
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                isBlind={blindMode}
                dict={dict}
                backendBase={backendBase}
              />
            )}
          </StageFrame>

          <LoadoutHotbar
            loadout={loadout}
            activeSlotIdx={activeSlotIdx}
            genMode={genMode}
            role={role}
            activeMutator={activeMutator}
            revealedSlots={revealedSlots}
            onRevealSlot={handleRevealSlot}
            onSelectPerk={onSelectPerk}
            isBlind={blindMode}
            dict={dict}
          />
```

(`WheelStage`'s JSX block above these is intentionally left untouched — no `isBlind` prop, per the spec's explicit Wheel exclusion.)

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors here are expected and will resolve as Tasks 11–16 add the `isBlind`/`size` props these stages don't have yet — do not attempt to fix those errors in this task. If, after finishing Task 16, any error remains that traces back to this file specifically, that's a real problem to fix; a TypeScript error on `<InstantStage isBlind={...}>` etc. at this point in the plan is expected and resolves itself once those tasks land.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/perks.ts frontend/src/components/generator/GeneratorPage.tsx
git commit -m "feat(generator): add Blind Mode state, persistence, and wiring in GeneratorPage"
```

---

### Task 11: `LoadoutHotbar` — Blind Mode + shared `layoutId` for the Crate landing

**Files:**
- Modify: `frontend/src/components/generator/LoadoutHotbar.tsx`

**Interfaces:**
- Produces: `LoadoutHotbarProps` gains `isBlind?: boolean` (forwarded to `PerkSlot`). Each slot's wrapping `motion.div` gains `layoutId={"loadout-slot-" + idx}`, matched by `LootCrateStage` (Task 14) using the same `idx` (0–3) — both iterate the same ordered 4-element array, so index parity is guaranteed by `GeneratorPage`'s `handleBatchRollComplete`.

- [ ] **Step 1: Add `isBlind` prop and `layoutId`**

Edit `frontend/src/components/generator/LoadoutHotbar.tsx`. Add to `LoadoutHotbarProps`:

```ts
export interface LoadoutHotbarProps {
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  genMode: GeneratorMode;
  role: RoleCategory;
  activeMutator: ChaosMutator | null;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind?: boolean;
  dict?: Dictionary;
}
```

Add `isBlind = false` to the destructured props (default value), and update the `motion.div`/`PerkSlot` JSX:

```tsx
export const LoadoutHotbar: React.FC<LoadoutHotbarProps> = ({
  loadout,
  activeSlotIdx,
  genMode,
  role,
  activeMutator,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  isBlind = false,
  dict,
}) => {
  const reduceMotion = useReducedMotion();

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
            layoutId={`loadout-slot-${idx}`}
            layout
            initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 24 }}
          >
            <PerkSlot
              perk={perk}
              role={role}
              page={slotData?.page}
              slot={slotData?.slot}
              isObscured={isObscured}
              isActive={genMode === 'wheel' && activeSlotIdx === idx}
              isBlind={isBlind}
              announce
              onClick={() => {
                if (isObscured) {
                  onRevealSlot(idx);
                } else if (perk) {
                  onSelectPerk(perk);
                }
              }}
              dict={dict}
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
Expected: no new errors from this file (the `<GeneratorPage>` errors from Task 10 that reference the OTHER stages are still expected at this point — only confirm nothing new is wrong in `LoadoutHotbar.tsx` itself, e.g. by reading the tsc output for this specific filename).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/LoadoutHotbar.tsx
git commit -m "feat(generator): add Blind Mode and shared layoutId to LoadoutHotbar"
```

---

### Task 12: `InstantStage` — bigger reveal + Blind Mode

**Files:**
- Modify: `frontend/src/components/generator/modes/InstantStage.tsx`

**Interfaces:**
- Produces: `InstantStageProps` gains `isBlind?: boolean`.

- [ ] **Step 1: Add the prop and pass it through**

Edit `frontend/src/components/generator/modes/InstantStage.tsx`. Add to `InstantStageProps`:

```ts
export interface InstantStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  isBlind?: boolean;
  dict?: Dictionary;
  backendBase?: string;
}
```

Add `isBlind = false` to the destructured props, and update the `<PerkSlot>` call inside the `revealSlots.map(...)`:

```tsx
                <PerkSlot
                  perk={slot.perk}
                  role={role}
                  page={slot.page}
                  slot={slot.slot}
                  size="large"
                  isBlind={isBlind}
                  dict={dict}
                />
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `InstantStage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/InstantStage.tsx
git commit -m "feat(generator): bigger reveal size and Blind Mode for InstantStage"
```

---

### Task 13: `SlotMachineStage` — bigger reels + Blind Mode

**Files:**
- Modify: `frontend/src/components/generator/modes/SlotMachineStage.tsx`

**Interfaces:**
- Produces: `SlotMachineStageProps` gains `isBlind?: boolean`.

- [ ] **Step 1: Add the prop and pass it through**

Edit `frontend/src/components/generator/modes/SlotMachineStage.tsx`. Add to `SlotMachineStageProps`:

```ts
export interface SlotMachineStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  isBlind?: boolean;
  dict?: Dictionary;
  backendBase?: string;
}
```

Add `isBlind = false` to the destructured props, and update the `<PerkSlot>` call inside `displayedPerks.map(...)`:

```tsx
            <PerkSlot
              perk={perk}
              role={role}
              page={reelStates[idx] === 'stopped' ? finalSlotsRef.current[idx]?.page : undefined}
              slot={reelStates[idx] === 'stopped' ? finalSlotsRef.current[idx]?.slot : undefined}
              size="large"
              isBlind={isBlind}
              dict={dict}
            />
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `SlotMachineStage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/SlotMachineStage.tsx
git commit -m "feat(generator): bigger reel size and Blind Mode for SlotMachineStage"
```

---

### Task 14: `LootCrateStage` — bigger reveal, Blind Mode, and the shared `layoutId` flight

**Files:**
- Modify: `frontend/src/components/generator/modes/LootCrateStage.tsx`

**Interfaces:**
- Produces: `LootCrateStageProps` gains `isBlind?: boolean`. Each revealed perk's wrapper `motion.div` gets `layoutId={"loadout-slot-" + idx}` matching `LoadoutHotbar` (Task 11) — this is what makes the perk visually fly from the crate into its real hotbar slot instead of a copy appearing in a separate grid.

- [ ] **Step 1: Add the prop and the shared `layoutId`**

Edit `frontend/src/components/generator/modes/LootCrateStage.tsx`. Add to `LootCrateStageProps`:

```ts
export interface LootCrateStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  isBlind?: boolean;
  dict?: Dictionary;
  backendBase?: string;
}
```

Add `isBlind = false` to the destructured props. Change the `revealedSlots.map(...)` block (inside the `key="results"` `motion.div`) to track each slot's original loadout index (0–3) rather than its reveal order, since `revealedSlots` fills up one at a time but the `layoutId` must match the FINAL loadout position:

```tsx
            {revealedSlots.map((slot, idx) => (
              <motion.div
                key={idx}
                layoutId={`loadout-slot-${idx}`}
                initial={reduceMotion ? false : { opacity: 0, y: -30, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 20 }}
              >
                <PerkSlot
                  perk={slot.perk}
                  role={role}
                  page={slot.page}
                  slot={slot.slot}
                  size="large"
                  isBlind={isBlind}
                  dict={dict}
                />
              </motion.div>
            ))}
```

(`idx` here is already the correct final loadout position: `revealedSlots` is built by `setRevealedSlots((prev) => [...prev, slot])` inside a `slots.forEach((slot, i) => ...)` loop where `slots` is the exact 4-element array `GeneratorPage.handleBatchRollComplete` later assigns 1:1 to loadout indices 0–3 — so the Nth item pushed into `revealedSlots` is always destined for loadout index N. No change needed to the reveal-scheduling logic itself, only to this JSX.)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `LootCrateStage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/LootCrateStage.tsx
git commit -m "feat(generator): bigger reveal size, Blind Mode, and shared-layout hotbar landing for LootCrateStage"
```

---

### Task 15: `WheelStage` — Trial/Entity canvas reskin

**Files:**
- Modify: `frontend/src/components/generator/modes/WheelStage.tsx`

**Interfaces:**
- No prop/interface changes — this is a pure visual reskin of `drawUnifiedWheel` and the particle system. `WheelStageProps` is untouched.

- [ ] **Step 1: Reskin the page-wheel and perk-wheel slice gradients**

Edit `frontend/src/components/generator/modes/WheelStage.tsx`. In `drawUnifiedWheel`, find the page-wheel slice gradient block:

```ts
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
```

Replace it with a dark red/black Trial theme:

```ts
        const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
        if (i % 2 === 0) {
          grad.addColorStop(0, '#3b0a0a');
          grad.addColorStop(1, '#170303');
        } else {
          grad.addColorStop(0, '#4c0f0f');
          grad.addColorStop(1, '#0f0202');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#7f1d1d';
        ctx.stroke();
```

- [ ] **Step 2: Add a thorned rim, replacing the plain outer stroke**

Edit `frontend/src/components/generator/modes/WheelStage.tsx`. Add this new function above `drawUnifiedWheel` (it needs to be in scope for `drawUnifiedWheel` to call it, so define it as a plain function, not a hook, right before the `drawUnifiedWheel` `useCallback`):

```ts
  const drawThornedRim = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    const spikeCount = 28;
    const spikeAngle = (2 * Math.PI) / spikeCount;
    const spikeHeight = 14;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spikeCount; i++) {
      const baseAngle1 = i * spikeAngle;
      const baseAngle2 = baseAngle1 + spikeAngle * 0.5;
      const tipAngle = baseAngle1 + spikeAngle * 0.25;

      const x1 = centerX + Math.cos(baseAngle1) * radius;
      const y1 = centerY + Math.sin(baseAngle1) * radius;
      const xTip = centerX + Math.cos(tipAngle) * (radius + spikeHeight);
      const yTip = centerY + Math.sin(tipAngle) * (radius + spikeHeight);
      const x2 = centerX + Math.cos(baseAngle2) * radius;
      const y2 = centerY + Math.sin(baseAngle2) * radius;

      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(xTip, yTip);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();

    const rimGrad = ctx.createRadialGradient(centerX, centerY, radius - 10, centerX, centerY, radius + spikeHeight);
    rimGrad.addColorStop(0, '#7f1d1d');
    rimGrad.addColorStop(1, '#1a0303');
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#450a0a';
    ctx.stroke();
    ctx.restore();
  };
```

Find both places in `drawUnifiedWheel` where the outer rim is drawn as a plain stroke:

```ts
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
```

(this appears twice: once in the page-wheel branch, once in the perk-wheel branch — the perk-wheel one uses `role === 'Survivor' ? '#10b981' : '#f43f5e'` for its stroke color instead of `'#f59e0b'`). Replace **both** occurrences with a call to the new thorned rim, keeping the existing role-tinted glow as an inner accent ring drawn just inside the thorns:

```ts
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 4, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();
      drawThornedRim(ctx, centerX, centerY, radius);
```

- [ ] **Step 3: Restyle the pointer as a dripping claw**

Edit `frontend/src/components/generator/modes/WheelStage.tsx`. Find the top-pointer drawing block near the end of `drawUnifiedWheel`:

```ts
    // Top Pointer Arrow
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
```

Replace it with a 3-point claw silhouette:

```ts
    // Top Pointer: a dripping 3-claw shape instead of a single triangle
    ctx.beginPath();
    ctx.moveTo(centerX - 22, 2);
    ctx.lineTo(centerX - 14, 2);
    ctx.lineTo(centerX - 9, 30);
    ctx.lineTo(centerX - 3, 8);
    ctx.lineTo(centerX, 46);
    ctx.lineTo(centerX + 3, 8);
    ctx.lineTo(centerX + 9, 30);
    ctx.lineTo(centerX + 14, 2);
    ctx.lineTo(centerX + 22, 2);
    ctx.closePath();
    ctx.fillStyle = '#b91c1c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a0303';
    ctx.stroke();
```

- [ ] **Step 4: Add continuous ember drift while spinning**

Edit `frontend/src/components/generator/modes/WheelStage.tsx`. Add a new ref near the existing `particleListRef`/`particleAnimFrameRef`:

```ts
  const emberAnimFrameRef = useRef<number | null>(null);
```

Add this function after `triggerParticleBurst`:

```ts
  const startEmberDrift = useCallback(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    const spawnEmber = (): Particle => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.7,
      y: height / 2 + (Math.random() - 0.5) * height * 0.7,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -Math.random() * 1.2 - 0.3,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.4 + 0.2,
      color: Math.random() > 0.5 ? '#f97316' : '#dc2626',
    });

    const embers: Particle[] = Array.from({ length: 40 }, spawnEmber);

    const renderEmbers = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      embers.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.995;
        if (p.alpha < 0.05 || p.y < 0) {
          embers[i] = spawnEmber();
          return;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      emberAnimFrameRef.current = requestAnimationFrame(renderEmbers);
    };

    renderEmbers();
  }, []);

  const stopEmberDrift = useCallback(() => {
    if (emberAnimFrameRef.current !== null) {
      cancelAnimationFrame(emberAnimFrameRef.current);
      emberAnimFrameRef.current = null;
    }
  }, []);
```

`renderEmbers` deliberately does not check the `isSpinning` state variable — if it did, calling `startEmberDrift()` synchronously right after `setIsSpinning(true)` would close over the *pre-update* value of `isSpinning` (still `false` from the render that scheduled this call), stopping the loop on its very first frame. Instead, the loop runs until explicitly cancelled via `stopEmberDrift()`, called at the two points below — that's the only thing that should ever stop it. Do not reintroduce an `isSpinning` check inside `renderEmbers`.

In `handleStartSpin`, right after `setIsSpinning(true);` at the top of the function, add `startEmberDrift();`. Right before `setIsSpinning(false);` near the end of the function (just before `setStatusText(...)` / `triggerParticleBurst()`), add `stopEmberDrift();`. Also add a cleanup in the existing unmount `useEffect` (the one that already cancels `particleAnimFrameRef`):

```ts
  useEffect(() => {
    return () => {
      if (particleAnimFrameRef.current !== null) {
        cancelAnimationFrame(particleAnimFrameRef.current);
      }
      if (emberAnimFrameRef.current !== null) {
        cancelAnimationFrame(emberAnimFrameRef.current);
      }
    };
  }, []);
```

Gate ember drift behind `reduceMotion` (already present in this file from the earlier reduced-motion fix pass): wrap the `startEmberDrift();` call site with `if (!reduceMotion) startEmberDrift();`.

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `WheelStage.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/generator/modes/WheelStage.tsx
git commit -m "feat(generator): Trial/Entity canvas reskin for WheelStage"
```

---

### Task 16: `TarotDeckStage` rewrite — meaningful types, bigger portrait cards, back images

**Files:**
- Modify: `frontend/src/components/generator/modes/TarotDeckStage.tsx`

**Interfaces:**
- Consumes: `getPerkTarotType`, `TarotType` (Task 1); `dict.generator.tarotCardNames` as a type-keyed object (Task 4); `/images/tarot/<type>.png` static assets (already committed).
- Produces: `TarotDeckStageProps` gains `isBlind?: boolean`. External behavior contract (`onRollComplete: (slots: DrawnSlot[]) => void`) is unchanged.

- [ ] **Step 1: Rewrite the file**

Replace the full contents of `frontend/src/components/generator/modes/TarotDeckStage.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots, getPerkTarotType, TarotType } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playCardFlip } from '@/utils/perkAudio';

export interface TarotDeckStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  isBlind?: boolean;
  dict?: Dictionary;
  backendBase?: string;
}

interface TarotCard {
  type: TarotType;
  slot: DrawnSlot;
  flipped: boolean;
}

const DEFAULT_TYPE_NAMES: Record<TarotType, string> = {
  hex: 'The Hex',
  boon: 'The Boon',
  sacrifice: 'The Sacrifice',
  exhaustion: 'The Exhaustion',
  obsession: 'The Obsession',
  aura: 'The Watcher',
  generator: 'The Machinist',
  healing: 'The Caregiver',
  chase: 'The Chase',
  stealth: 'The Shadow',
  entity: 'The Entity',
};

/**
 * Card-back image for a given type, with a graceful text-only fallback if
 * the file is ever missing (never renders a broken <img>).
 */
const CardBackImage: React.FC<{ type: TarotType }> = ({ type }) => {
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  return (
    <img
      src={`/images/tarot/the-${type}.png`}
      alt=""
      aria-hidden="true"
      onError={() => setErrored(true)}
      className="absolute inset-0 h-full w-full rounded-2xl object-cover"
    />
  );
};

export const TarotDeckStage: React.FC<TarotDeckStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  isBlind = false,
  dict,
  backendBase,
}) => {
  const [cards, setCards] = useState<TarotCard[] | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  const typeNames = dict?.generator?.tarotCardNames || DEFAULT_TYPE_NAMES;

  const handleShuffle = () => {
    if (activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);

    setCards(
      slots.map((slot) => ({
        type: slot.perk ? getPerkTarotType(slot.perk) : 'entity',
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((card, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFlip(idx)}
              disabled={card.flipped}
              className="cursor-pointer disabled:cursor-default"
              style={{ perspective: '1200px' }}
            >
              <motion.div
                className="relative h-56 w-40 sm:h-64 sm:w-44 md:h-72 md:w-48"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{
                  rotateY: card.flipped ? 180 : 0,
                  scale: card.flipped && !reduceMotion ? [1, 1.08, 1] : 1,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.5 }}
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 to-slate-950"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <CardBackImage type={card.type} />
                  <div className="absolute inset-0 flex flex-col items-center justify-end gap-1 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3">
                    <span className="text-[11px] font-black uppercase tracking-wide text-white drop-shadow">
                      {typeNames[card.type] || DEFAULT_TYPE_NAMES[card.type]}
                    </span>
                  </div>
                </div>

                <div
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/60"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <PerkSlot
                    perk={card.slot.perk}
                    role={role}
                    page={card.slot.page}
                    slot={card.slot.slot}
                    size="large"
                    isBlind={isBlind}
                    dict={dict}
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

Note on the `CardBackImage` filename derivation: `type` is one of the bare `TarotType` values (`'hex'`, `'boon'`, `'sacrifice'`, ...) and the generated files are named `the-hex.png`, `the-boon.png`, etc. (Task 4/committed assets) — `` `/images/tarot/the-${type}.png` `` maps them directly, one file per type, no further transformation needed.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors anywhere in `frontend/src` — this is the last file `GeneratorPage.tsx` (Task 10) was waiting on, so the whole tree should now be clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/generator/modes/TarotDeckStage.tsx
git commit -m "feat(generator): rewrite TarotDeckStage with meaningful types, bigger portrait cards, and back images"
```

---

### Task 17: Final integration verification

**Files:**
- None (verification only).

- [ ] **Step 1: Full typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean, zero errors anywhere in `frontend/src`.

- [ ] **Step 2: Full unit test suite**

Run: `cd frontend && npm run test:unit`
Expected: all tests pass, including every new `perkPicker.test.ts` test from Tasks 1 and 3, and the i18n parity test picking up Task 4's locale changes.

- [ ] **Step 3: i18n hardcoded-string check**

Run: `cd frontend && npm run check:i18n`
Expected: no new hardcoded-string violations (every new user-facing string in this plan goes through `dict?.generator?.*` with an inline fallback, matching the existing convention).

- [ ] **Step 4: Production build**

Run: `cd frontend && npm run build`
Expected: succeeds, including the `/[locale]/randomizer` route for all 5 locales.

- [ ] **Step 5: Manual dev-server smoke check**

Run: `cd frontend && npm run dev`, then visit `/en/randomizer` and confirm, for each of the 5 modes:
- Wheel shows the new red/black thorned-rim styling and a dripping-claw pointer.
- The background has a slow, subtle red vignette pulse.
- Tarot cards are bigger, portrait-shaped, show a colored back-image with a type name before flipping, and the revealed perk's actual trait matches the card's stated type (e.g. a "The Hex" card always reveals a Hex perk).
- Loot Crate: after opening, perks visually travel from the crate area into the actual bottom hotbar slots (not a separate grid).
- Toggling Blind Mode in the toolbar hides perk art (shows "?" placeholders) across the hotbar and all 4 non-Wheel modes, while the `[P/S]` coordinate tags stay visible; the Wheel's spinning slices are unaffected.
- Rolling with the Chaos Wheel's "Curse of Sacrifice" mutator active always includes No Mither (or another future negative-list entry) somewhere in the resulting loadout.

Report the outcome honestly — this step needs an actual browser, which no agent in this plan has access to; if you're an agent executing this plan, say so explicitly rather than claiming to have visually verified it.

- [ ] **Step 6: Push**

```bash
git push
```

## Post-Plan Notes

- `PerkCard`'s Vault usage (`page.tsx`) passes neither `size` nor `isBlind`, so it renders exactly as it did before this plan — verify this by spot-checking `page.tsx` still compiles unchanged (it isn't touched by any task above).
- The Generator/Healing keyword categories (Tasks 1/16) have weaker non-English coverage than the others because the source `DBD_KEYWORDS` data itself doesn't yet have full translations for those concepts — perks in those categories, in locales lacking the term, will fall through to the "entity" catch-all rather than mis-detecting. This is documented in `perkTraitKeywords.ts`'s file comment; extending `DBD_KEYWORDS` itself is out of scope for this plan.
