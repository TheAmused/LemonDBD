# Perk Randomizer Polish Round 3: Theming, Life, and Meaningful Mutators

**Date:** 2026-08-30
**Status:** PROPOSED (Awaiting User Review)
**Scope:** `frontend` only — Perk Randomizer (`/[locale]/randomizer`)

---

## 1. Executive Summary

This is a third pass over the already-shipped Perk Randomizer redesign (PR #57), adding genuine Dead by Daylight theming and mechanical depth on top of the borderless/no-banner visual language already in place. Seven additions, all confirmed in conversation:

1. **Wheel** gets a Trial/Entity visual reskin (dark red/black, thorned rim, ember particles) instead of its current neutral slate styling.
2. **Ambient background** gets a slow heartbeat vignette pulse — visual only, no looping audio.
3. **Tarot Deck** cards predict what they'll reveal via an 11-type taxonomy backed by the existing multilingual `DBD_KEYWORDS` data, get a bigger portrait shape, and get real back-images (generated placeholders included, swappable later) with a text fallback.
4. **Loot Crate** perks physically fly from the chest to their real `LoadoutHotbar` slot via a shared-layout animation, rather than appearing in a separate grid.
5. **Chaos Wheel** gains a "Curse of Sacrifice" mutator that guarantees a genuinely negative/handicap perk in the loadout.
6. **General sizing**: reveal moments (Instant/Slot/Crate grids, Tarot faces) get a bigger `PerkCard` size variant. The always-visible bottom hotbar stays at today's size.
7. **Blind Mode**: a new persistent toggle that hides perk icons/avatars/hover-previews behind a "?" placeholder while keeping the `[P/S]` coordinate tag visible — for looking the real perk up in-game instead of the app.

### Non-goals

- No changes to the Wheel's spinning canvas mechanics or its `[P/S]` coordinate correctness (already correct).
- No changes to the Perks Vault page, `PerkCard`'s Vault usage, or any page outside the generator.
- Blind Mode does **not** touch the Wheel's spinning canvas slices — only `LoadoutHotbar` and the Instant/Slot Machine/Tarot/Crate reveal displays. The Wheel is a separate (canvas) rendering system and watching it spin isn't "a reveal" the same way the other four are.
- The negative-perk list starts intentionally small (just **No Mither**) rather than a padded, possibly-wrong list — game-balance judgment calls are the user's to make and extend later, not something to guess broadly.
- No backend changes. (Correcting an earlier mistake in this project's own commit history: the backend is **PostgreSQL** in production, not SQLite — SQLite is only the Flask test config's in-memory fallback. Stray "SQLite" wording inherited from the pre-redesign code has already been corrected in `GeneratorPage.tsx`.)

---

## 2. Wheel — Trial/Entity reskin

`WheelStage.tsx`'s canvas drawing changes visually, not mechanically:

- Background gradient shifts from flat slate to a dark red-to-black radial gradient.
- The wheel's outer rim gets a thorned/clawed border pattern (small triangular spikes at regular intervals around the circle) instead of a plain stroked ring.
- The top pointer is restyled as a dripping-claw silhouette (still red) instead of a plain triangle.
- The particle system gains a continuous low-density ember drift while the wheel is spinning (today it only bursts on a win) — same particle canvas, ember-tinted colors, lower opacity than the win-burst.
- Role-based color grading (emerald/rose accents) stays, layered on top of the new red/black base rather than replacing it.

## 3. Ambient background — heartbeat pulse

`StageFrame.tsx` gains a slow (~1.2s cycle) radial vignette pulse at the screen edges — a CSS keyframe animation, no new geometry, no audio. Respects `prefers-reduced-motion` the same way the existing particle layer already does (reduced to a static vignette, no pulse, when motion is reduced).

## 4. Tarot Deck — meaningful types, bigger cards, back images

### Taxonomy

New shared predicates in `lib/perkPicker.ts`, checked in this priority order (first match wins) to classify each of the 4 drawn perks:

| Priority | Type | Detection |
|---|---|---|
| 1 | The Hex | Name/description contains `Hex:` |
| 2 | The Boon | Name/description contains `Boon:` |
| 3 | The Sacrifice | Curated `NEGATIVE_PERK_NAMES` set (starts with just `no mither`) |
| 4 | The Exhaustion | Existing `EXHAUSTION_PERK_NAMES` set + "exhausted"/"exhaustion" keyword |
| 5 | The Obsession | Name/description mentions "Obsession" |
| 6 | The Watcher | Description matches the existing multilingual `DBD_KEYWORDS` Aura/Aura Reading/Aury/etc. terms |
| 7 | The Machinist | Description matches Generator/Generatory/etc. keyword terms |
| 8 | The Caregiver | Description matches healing/Med-Kit/First Aid/etc. keyword terms |
| 9 | The Chase | Description matches Haste/Hindered/Pallet/Window/etc. keyword terms |
| 10 | The Shadow | Description matches Terror Radius/Undetectable/Oblivious/etc. keyword terms |
| 11 | The Entity | Catch-all — everything that matched nothing above |

`Hex:`/`Boon:` prefix detection is name-based and locale-agnostic (proper-noun prefixes stay untranslated in this dataset, consistent with the already-shipped `isHexOrBoonPerk`). Types 6–10 reuse the multilingual keyword arrays already present in `textFormatter.tsx`'s `DBD_KEYWORDS` (English + Polish + Spanish + German + Japanese variants), so detection works correctly regardless of the active locale — not just English.

A card's type is assigned to **that specific drawn perk** — no more random shuffled flavor names. Tapping "The Hex" is guaranteed to reveal a Hex perk.

### Bigger, portrait shape, back images

The card container returns to a portrait "playing card" shape (wider than tall was wrong; taller than wide, e.g. roughly a 2:3 ratio), sized up from today's footprint. The face-down side shows the type's generated back-image (`/images/tarot/<slug>.png` — 11 placeholders already generated via `frontend/scripts/generate_tarot_card_backs.py`, one per type, each a distinct color with the type name on it); if an image ever 404s, it falls back to the existing text+icon treatment rather than showing a broken image. The face-up side shows the revealed perk at the new bigger `PerkCard` `large` size (see §6), centered in the portrait frame.

Livelier flip: on top of the existing 3D `rotateY` flip, add a brief scale/glow pulse timed to the flip's midpoint and a small sparkle-particle burst on land (reuses the same ember/particle visual language as the Wheel, not a new system) — all gated by `prefers-reduced-motion` like the flip itself already is.

## 5. Loot Crate — perk flies to its real hotbar slot

Technical approach: framer-motion's shared-layout tracking via `layoutId`. Each revealed perk in `LootCrateStage`'s burst gets `layoutId={"loadout-slot-" + idx}`; the matching `PerkSlot` rendered inside `LoadoutHotbar` carries the same id. Because both are mounted under the same parent (`GeneratorPage`) in the same commit, framer-motion computes the flight path automatically — no manual `getBoundingClientRect` math. The perk visually leaves the crate and *becomes* the hotbar slot; it doesn't animate to a copy and then separately update state.

## 6. General sizing — `PerkCard` size variant

`PerkCard` gains an optional `size?: 'default' | 'large'` prop (default preserves today's Vault-matching footprint exactly). `large` is used by: `InstantStage`, `SlotMachineStage`, and `LootCrateStage`'s reveal grids, and the Tarot card's face-up side. `LoadoutHotbar` stays at `default` — it's on screen permanently, and the "big" treatment is for the reveal *moment*, not the persistent dock.

## 7. Chaos Wheel — "Curse of Sacrifice"

New 5th entry in `CHAOS_MUTATORS` (appears in the existing Chaos Wheel automatically, no UI changes needed there). New `NEGATIVE_PERK_NAMES` set in `constants/chaosMutators.ts`, same pattern as the existing `EXHAUSTION_PERK_NAMES`/`MEME_PERK_NAMES`, starting with `no mither` only. Effect: guarantees at least 1 of the 4 rolled perks comes from that pool; falls back to a normal roll if the eligible pool has none (same fallback pattern every other mutator already uses via `filterPerksByMutator`). This same `isNegativePerk` check powers Tarot's "The Sacrifice" type (§4) — one source of truth for "this perk is a handicap."

## 8. Blind Mode

New persistent Toolbar toggle (own `IconToggleButton`, `EyeOff` icon, purple accent matching the existing Blindness-curse visual language — but this is a deliberate user setting, not a random curse, and is independent of the Chaos Wheel). Persisted in `GeneratorPage`'s existing localStorage state alongside role/mode/no-repeat.

While on, in `LoadoutHotbar` and the Instant/Slot Machine/Tarot/Crate reveal displays:
- Perk icon renders as a generic "?" placeholder; character avatar is hidden; no hover preview.
- The `[P/S]` coordinate tag **stays visible** (the point is looking the perk up in-game, not in the app).
- Clicking a hidden slot does nothing — no modal, no reveal. Turning the toggle off is the only way to see it here.

This needs its own dedicated render branch in `PerkSlot`/`PerkCard` (distinct from the existing Chaos "Curse of Blindness" `isObscured` branch, which does *not* show coordinates today — Blind Mode explicitly must).

---

## 9. Component/file impact (for the implementation plan)

- `frontend/src/components/generator/modes/WheelStage.tsx` — canvas visual reskin (§2)
- `frontend/src/components/generator/shared/StageFrame.tsx` — heartbeat pulse (§3)
- `frontend/src/components/generator/lib/perkPicker.ts` — new trait predicates + `getPerkTarotType()` resolver (§4)
- `frontend/src/constants/chaosMutators.ts` — `NEGATIVE_PERK_NAMES` + new mutator entry (§7); also referenced by §4
- New: multilingual keyword lists for Aura/Generator/Healing/Chase/Stealth detection (reusing `DBD_KEYWORDS` from `textFormatter.tsx` rather than duplicating it)
- `frontend/src/components/generator/modes/TarotDeckStage.tsx` — taxonomy-driven type assignment, portrait sizing, back-images, livelier flip (§4)
- `frontend/src/components/generator/modes/InstantStage.tsx`, `SlotMachineStage.tsx`, `LootCrateStage.tsx` — `size="large"` on their `PerkCard`/`PerkSlot` usage (§6); `LootCrateStage.tsx` + `LoadoutHotbar.tsx` also get the shared `layoutId` wiring (§5)
- `frontend/src/components/PerkCard.tsx` — `size` prop (§6) + blind-mode rendering support (§8)
- `frontend/src/components/generator/shared/PerkSlot.tsx` — blind-mode branch (§8)
- `frontend/src/components/generator/Toolbar.tsx` — new Blind Mode toggle button (§8)
- `frontend/src/components/generator/GeneratorPage.tsx` — `blindMode` state + persistence, threading to all consumers (§8)
- `frontend/src/locales/{en,de,es,ja,pl}/generator.ts` — new keys: 11 tarot type names, Blind Mode tooltip/labels, hidden-perk placeholder text
- `frontend/scripts/generate_tarot_card_backs.py` — already written and run; 11 placeholder PNGs already committed under `frontend/public/images/tarot/`

## 10. Testing

- `lib/perkPicker.ts`'s new predicates and `getPerkTarotType()` resolver get the same `node:test` unit-test treatment as the existing picker functions (this repo has no component-render test harness — consistent with the original redesign's approach).
- Manual verification: each of the 11 tarot types can actually be produced and correctly predicts its perk; the Curse of Sacrifice mutator's fallback behavior when no negative perks are eligible; Blind Mode across all 4 non-Wheel modes plus the hotbar; the crate-to-hotbar flight animation.
