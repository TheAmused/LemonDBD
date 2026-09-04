# Randomizer Polish: Static Glow, Zero Main Padding & Role-Suited Draw Texts

**Date:** 2026-09-04  
**Status:** APPROVED  
**Scope:** `frontend` only — Random Generator (`/[locale]/randomizer`)

---

## 1. Executive Summary

This specification refines three visual and mechanical aspects of the Perk Randomizer page:
1. **Static Corner Glow:** Convert the ambient corner vignette in `StageFrame.tsx` from an animated pulse (`dbd-heartbeat-vignette`) to a static glow (`dbd-heartbeat-vignette--static`), calibrated with appropriate opacities for light mode (0.12) and dark mode (0.40).
2. **Full-Bleed Stage Canvas (Zero Outer Padding):** Remove outer viewport padding (`p-4 sm:p-6 lg:p-8`) from `<main>` across `randomizer/page.tsx`, its Suspense fallback, and `randomizer/loading.tsx`, allowing the generator stage to sit flush up to the sidebar boundary.
3. **Role-Suited Post-Draw Texts:** Separate the post-draw celebratory/flavor texts by role in `useJackpotCelebration.ts` and all 5 translation locales (`en`, `pl`, `de`, `es`, `ja`). Killers receive killer-themed flavor lines (e.g. 4K, hooks, entity sacrifices, endgame chat), survivors receive survivor-themed lines, and em dashes (`—`) are replaced with clean standard punctuation.

---

## 2. Detailed Technical Design

### 2.1 Static Corner Glow (`StageFrame.tsx` & `globals.css`)

- **StageFrame Update:**
  In `frontend/src/components/generator/shared/StageFrame.tsx`, the ambient vignette container currently toggles between `dbd-heartbeat-vignette--static` and `dbd-heartbeat-vignette` based on `reduceMotion`. We replace this with a static class unconditionally:
  ```tsx
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 dbd-heartbeat-vignette--static"
  />
  ```
- **globals.css Tuning:**
  In `frontend/src/app/globals.css`, adjust `.dbd-heartbeat-vignette--static`:
  ```css
  .dbd-heartbeat-vignette--static {
    background: radial-gradient(ellipse at center, transparent 55%, var(--accent-red) 100%);
    animation: none;
    opacity: 0.12;
  }

  .dark .dbd-heartbeat-vignette--static {
    opacity: 0.4;
  }
  ```
  This prevents light mode from displaying a dark muddy red stain against light card backgrounds (`bg-slate-100/80`), while preserving the atmospheric Dead by Daylight crimson terror radius in dark mode (`dark:bg-slate-950/40`).

### 2.2 Viewport Padding Removal (`page.tsx` & `loading.tsx`)

- In `frontend/src/app/[locale]/randomizer/page.tsx`:
  - On the active `RandomizerContent` `<main>` element, remove `p-4 sm:p-6 lg:p-8`. The resulting class string is:
    `flex-1 w-full min-h-screen overflow-y-auto transition-[padding] duration-300 flex flex-col lemon-shell-main`
  - On the `RandomizerPage` Suspense fallback `<main>`, remove `p-4 sm:p-6 lg:p-8`:
    `flex-1 w-full min-h-screen overflow-y-auto flex flex-col lemon-shell-main`
- In `frontend/src/app/[locale]/randomizer/loading.tsx`:
  - On `<main>`, remove `p-4 sm:p-6 lg:p-8` so that route-level loading state matches the page exactly, preventing layout shifts during hydration.
- The stage container (`StageFrame`) preserves its internal padding (`p-4 sm:p-6`), rounded corners, and controls bar layout.

### 2.3 Role-Suited Post-Draw Texts (`useJackpotCelebration.ts` & Locales)

- **Locale Dictionaries (`en`, `pl`, `de`, `es`, `ja`):**
  - Retain `jackpotLines` (with survivor perspective, removing em dashes `—` in favor of standard hyphens or commas/periods).
  - Add `jackpotLinesKiller` with at least 5-10 tailored killer flavor lines in each locale.
- **English Killer Lines Example:**
  - `"The Entity approves. Survivors won't even finish one generator."`
  - `"4K incoming. Prepare for endgame chat salt."`
  - `"Basement hooks are feeling hungry today."`
  - `"They brought four flashlights. They have no idea what is coming."`
  - `"No escape hatch will save them from this build."`
  - `"Downed in 10 seconds flat. The Entity demands sacrifices."`
  - `"Hex: Ruin may be gone, but absolute terror never left."`
  - `"The Trial has begun, and the Entity demands a harvest."`
  - `"Full pressure build. Survivors will panic on sight."`
  - `"Entity displeased? Not with this loadout."`
- **Celebration Hook (`useJackpotCelebration.ts`):**
  - Inspect `role` parameter:
    ```typescript
    const isKiller = role === 'Killer';
    const lines = (isKiller && dict?.generator?.jackpotLinesKiller && dict.generator.jackpotLinesKiller.length > 0)
      ? dict.generator.jackpotLinesKiller
      : (dict?.generator?.jackpotLines || DEFAULT_JACKPOT_LINES);
    ```
  - Define fallback defaults for both killer and survivor if `dict` is missing.

---

## 3. Verification Plan

- **Automated Tests:**
  - Run `npx tsx --test src/__tests__/unit/randomizerResponsiveAndSkeletons.test.ts` to verify locale parity (both `jackpotLines` and `jackpotLinesKiller` arrays have >= 5 entries).
  - Add unit test asserting `useJackpotCelebration` role discrimination logic.
  - Run `npm run test:unit`.
- **Manual Verification:**
  - Switch between Survivor and Killer roles in the randomizer and draw perks in multiple modes (Instant, Wheel, Slot, Tarot, Crate) to verify appropriate role-based flavor text appears without em dash formatting issues.
  - Verify light mode and dark mode corner glow appearance.
  - Verify page layout extends flush up to the sidebar on mobile, tablet, and desktop without unintended horizontal scroll.
