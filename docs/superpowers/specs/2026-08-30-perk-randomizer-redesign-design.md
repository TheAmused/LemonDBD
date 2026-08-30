# Perk Randomizer Page: Visual Redesign & New Draw Modes

**Date:** 2026-08-30
**Status:** PROPOSED (Awaiting User Review)
**Scope:** `frontend` only — Perk Randomizer tab (`/perks?tab=generator`)

---

## 1. Executive Summary

The Perk Randomizer ("Generator") tab is being rebuilt visually and functionally. Today it consists of a monolithic `PerkGenerator.tsx` with a full-width gradient banner header, a canvas roulette wheel (`WheelOfFortune.tsx`), an "Instant" button mode, and a 4-slot loadout panel — all styled with heavy borders, repeated inline Tailwind class strings, and a two-panel desktop layout that does not translate well to mobile.

This redesign:

- Replaces the banner-heavy, bordered visual language with a **borderless, ambient, game-HUD aesthetic**.
- Replaces the two-panel desktop/mobile split with a **single responsive layout structure** (Single Stage Flow) used at every breakpoint.
- Adds **three new randomization mechanics** (Slot Machine, Tarot Deck, Loot Crate) alongside the rebuilt Wheel and Instant modes — five total, selectable via a mode switcher.
- Introduces **framer-motion** and **canvas-confetti** as new dependencies for animation.
- Leans into **DBD-flavored dark comedy** for tone (flavor text, card names, win-moment copy), consistent with the existing Chaos Mutator curses.
- Reuses the existing procedural Web Audio SFX (`perkAudio.ts`) rather than adding audio files.
- Requires **no backend changes** — `gen_mode` is stored as an unconstrained string column.

### Non-goals

- No changes to the Perks Vault tab, Perk Vault header banner, or any page outside the generator tab.
- No changes to backend APIs, database schema, or the Chaos Mutator set (`CHAOS_MUTATORS`) content.
- No removal of existing functionality: role toggle, character enable/disable config, no-repeat tracking, drawn-perk history reset, or the Chaos Wheel curse system. All are kept, just re-skinned and relocated into the new toolbar.

---

## 2. Visual Language

- **No full-width gradient banner blocks.** The rounded-3xl glowing gradient header slab and the amber "no perks available" banner box are both replaced with slimmer, borderless treatments.
- **Perk icons are borderless.** No ring/border circle around perk icons or character avatars anywhere in the generator (loadout hotbar, reel stops, card reveals, crate landing). Icons sit directly on the ambient background with a drop-shadow and a role-colored glow (emerald/Survivor, rose/Killer) on hover and on reveal.
- **Coordinate tags are kept and stay legible.** The existing `[P{page}/S{slot}]` tag on each perk (used to quickly locate that perk in the Vault) is preserved on every perk display across all five modes — restyled as a small monospace tag consistent with the borderless look, not removed as "chrome."
- **Ambient background, not boxes.** The existing `dbd-fog-overlay` fog effect is reused, plus a subtle particle drift behind the active stage. Atmosphere comes from motion/light rather than bordered card containers.
- **Shared `StageFrame` backdrop.** One component provides the ambient backdrop every mode renders inside, so background chrome is implemented once, not per-mode.

---

## 3. Layout Architecture — Single Stage Flow

```
┌─────────────────────────────────────┐
│  Title · role toggle · icon toolbar │  ← slim header, no banner
├─────────────────────────────────────┤
│                                     │
│         MODE SWITCHER (pills)      │  ← Wheel / Instant / Slot / Tarot / Crate
│                                     │
│           ┌───────────┐            │
│           │   STAGE   │            │  ← active mode's content
│           └───────────┘            │
│                                     │
├─────────────────────────────────────┤
│  [Slot1][Slot2][Slot3][Slot4]       │  ← sticky bottom loadout hotbar
└─────────────────────────────────────┘
```

- A single centered column (`max-w-3xl`-scale) with **identical structural order at every breakpoint** — desktop gets more breathing room and a larger stage, not a rearranged layout. This eliminates the separate mobile/desktop layout maintenance burden that caused today's complaints.
- The 4-slot loadout renders as a **sticky bottom hotbar** (game-HUD style), always visible above the fold while a mode is active. Compact single row on narrow screens; same row, just roomier, on wide screens.
- The mode switcher is a horizontally scrollable pill row when 5 pills don't fit the viewport width, and a normal inline row otherwise.
- Character-config, Chaos Mutator, audio-toggle, and reset triggers move into a compact icon toolbar (icon + tooltip) in the header, replacing today's wrapping row of fully-labeled buttons.

---

## 4. Draw Modes

**Shared contract:** every mode ultimately produces a `DrawnSlot[]` (`{ page, slot, perk }`) result for the loadout hotbar. All modes draw from the same eligible pool (active role → enabled characters → ownership filter → no-repeat history → active Chaos Mutator block-list). For the three new modes, the winning perk(s) are selected **first** by one shared picker function; the mode's animation only reveals a predetermined result. This keeps fairness/no-repeat/mutator logic in exactly one place instead of duplicated per mode.

| Mode | Status | Mechanic |
|---|---|---|
| **Wheel** | Rebuilt (reskin) | Existing canvas roulette, 2-phase (page → perk) selection kept as-is functionally; restyled to the borderless look, larger touch targets on mobile. |
| **Instant** | Rebuilt (reskin) | Existing single-button roll; perks reveal with a staggered card-pop instead of appearing all at once. |
| **Slot Machine** | New | 4 vertical reels (one per loadout slot) spin together, stop staggered left-to-right. Uses `playReelTick` / `playReelThud`. |
| **Tarot Deck** | New | Fanned deck of 4 face-down cards themed as in-world "trial tarot" (flavor names, e.g. "The Hex," "The Exhaustion"). Tap a card to flip-reveal with `playCardFlip`; deck "shuffles" between rolls. |
| **Loot Crate** | New | Single "Trial Offering" crate shakes on tap, cracks open with a light-burst + confetti; 4 perks fly out and land into hotbar slots one at a time, `playFanfare` on the last. |

All three new modes fire a shared "jackpot" moment on full-loadout completion: `playFanfare` + a `canvas-confetti` burst + a short DBD-comedy flavor line drawn from a small rotating pool (e.g. "The Entity approves.").

---

## 5. Component Structure

New `src/components/generator/` directory replaces the current monolithic `PerkGenerator.tsx`:

```
generator/
  GeneratorPage.tsx        # orchestrator: state, effects, wiring (trimmed from PerkGenerator.tsx)
  Toolbar.tsx               # role toggle, no-repeat, character config, audio, reset — icon pills
  ModeSwitcher.tsx           # 5-way segmented control
  LoadoutHotbar.tsx          # sticky bottom dock, renders 4x PerkSlot
  shared/
    PerkSlot.tsx             # canonical borderless perk icon + name + coordinate tag
    StageFrame.tsx           # shared ambient backdrop wrapper
    SegmentedControl.tsx     # generic pill-group primitive (used by role toggle + ModeSwitcher)
    IconToggleButton.tsx     # generic icon+tooltip toolbar button
  modes/
    WheelStage.tsx           # canvas logic migrated from WheelOfFortune.tsx, reskinned
    InstantStage.tsx
    SlotMachineStage.tsx
    TarotDeckStage.tsx
    LootCrateStage.tsx
  lib/
    perkPicker.ts            # single-source pool filtering + random pick (pool/no-repeat/mutator logic
                              # extracted from today's duplicated rollInstantLoadout + wheel logic)
```

`ChaosWheelModal.tsx` and `CharacterConfigModal.tsx` are kept as-is and wired into the new `Toolbar`.

### Type/state changes

- `GeneratorMode` extends from `'instant' | 'wheel'` to `'instant' | 'wheel' | 'slot' | 'tarot' | 'crate'`.
- `STORAGE_KEY` (localStorage) bumps from `lemon_dbd_generator_v7` to `v8`. Loadout shape (`DrawnSlot`) is unchanged, so existing saved loadouts are not lost — only the mode enum needs the new values recognized.
- No backend/API changes: `gen_mode` is persisted as an unconstrained string column (`backend/app/services/db/raw_schema.py`), so new mode values round-trip without schema or validation changes.

### New dependencies

- `framer-motion` — card flips, spring/stagger reveals, crate shake/burst, reduced-motion support.
- `canvas-confetti` — jackpot/win-moment confetti bursts.

---

## 6. Error Handling & Accessibility

- The empty-pool state (no perks available for the selected role/characters) keeps its existing message + "Configure Characters" CTA, restyled to the borderless/tag treatment — no full-width amber banner box.
- All animations respect `prefers-reduced-motion` via framer-motion's `useReducedMotion`, falling back to an instant reveal (no spin/flip/shake) when set.
- Card flips, crate taps, and reel-pull triggers are real `<button>` elements (keyboard and screen-reader operable), not click-only `<div>`s.
- Each reveal fires an `aria-live="polite"` announcement of the revealed perk name.
- Decorative confetti/particle canvases are `aria-hidden` and never intercept pointer/touch events meant for underlying controls.

---

## 7. Testing

- Unit tests for `lib/perkPicker.ts`: no-repeat exhaustion/reset behavior, Chaos Mutator block-list filtering, ownership filtering. This is the single most important test target since all five modes depend on it.
- Component smoke tests per mode stage: renders without crashing, reveal flow calls the win-slot callback with a valid perk.
- Existing backend generator route tests (`backend/tests/unit/api/test_generator_routes.py`) are unaffected — no backend changes in this spec.

---

## 8. Localization

New user-facing copy (mode labels, flavor text for jackpot lines, Tarot card names, crate copy, new toolbar tooltips) needs entries added across all five locales (`en`, `de`, `es`, `ja`, `pl`) following the existing `Dictionary` / `dict?.generator?.*` pattern — no new i18n mechanism, just new keys.
