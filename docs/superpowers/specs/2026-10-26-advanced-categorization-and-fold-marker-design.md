# Design Document: Advanced Hierarchical Categorization, Interactive Modes & Viewport Fold Markers

**Date:** 2026-10-26  
**Status:** Approved  
**Author:** Antigravity  
**Goal:** Upgrade the LemonDBD Site Tour suite to support deep subcategory organization with dynamic pill filters, capture all interactive Perk Randomizer modes, fix route inaccuracies across Streaks, Tier Lists, and Smash or Pass, re-categorize Admin OCR tools into Account/Admin, and inject visual viewport fold lines on full-page screenshots to clearly delineate above-the-fold entry content from below-the-fold scrolled content.

---

## 1. Problem Statement & Motivation

1. **Route Inaccuracies in Streaks & Tier Lists:**
   - `/en/streaks/history` was registered as a page route, but it does not exist as a page (returns 404/error shell); match history is actually an interactive drawer modal (`StreakStatsDrawer`) triggered from active challenge boards.
   - `/en/streaks/killer/win-streak` was registered as a route, but the real Gauntlet / Win Streak route is `/en/streaks/killer/gauntlet-streak`. Additionally, clicking challenge cards from the Hub opens difficulty selector modals (`GauntletModeModal`, `ChaosModeModal`, etc.).
   - `/en/tier-lists/creator` was registered as a route, but Next.js App Router treats `creator` as a `[slug]`, failing to fetch from backend. The actual Creator route is `/en/tier-lists/new`, which requires user authentication (`auth: 'user'`).
   - `streaks-scoreboard` (`/en/admin?tab=tools`) was miscategorized under `streaks`; it belongs in `account` / `admin`.

2. **Missing Perk Randomizer Interactive Modes:**
   - The Randomizer (`/en/randomizer`) has 5 distinct interactive game modes: Instant, Wheel (Roulette), Slot Machine, Tarot Deck, and Mystery Loot Crate, plus the Chaos Wheel modifier modal. Only the default Instant mode was captured.

3. **Smash or Pass Initial Arena Obscuration:**
   - When navigating to `/en/smash-or-pass`, `PreferencesPromptModal` overlaid the card arena. Dismissing it reveals the full romance character arena, tactile keycaps, and voting controls.

4. **Need for Viewport Fold Guide Line:**
   - On full-page vertical screenshots (which can exceed 2000-3500px), developers and QA reviewers cannot easily distinguish what is visible upon initial page entry versus what requires scrolling down. A visual horizontal fold marker at `y = vp.height` is required.

5. **Hierarchical Categorization:**
   - A single flat category list is unwieldy as catalog targets expand. Clicking a main category (e.g., Tier Lists or Challenges) should expand a secondary subcategory pill bar (e.g., Hub, Creator, Presets, Drawers, Modals) with counts and active filtering.

---

## 2. Technical Specifications

### 2.1 Catalog Corrections & Subcategory Schema (`site-tour-catalog.mjs`)

Every target item in `PAGE_ROUTES` and `MODAL_TARGETS` will feature an explicit `subcategory` field:

```typescript
interface TourTarget {
  id: string;
  title: string;
  route: string;
  category: string;
  subcategory: string; // e.g. 'hub', 'creator', 'modes', 'drawers', 'modals'
  auth?: 'guest' | 'user' | 'admin';
  requiresAuth?: 'user' | 'admin';
  folder: string;
  waitForSelector?: string;
  triggerSelector?: string;
  modalSelector?: string;
  setup?: string;
}
```

#### Catalog Updates:
1. **Perk Randomizer Modes (`category: 'randomizer'`):**
   - `randomizer-instant`: Instant Loadout Mode (`subcategory: 'instant'`, `/en/randomizer`)
   - `randomizer-wheel-stage`: Roulette Wheel Stage (`subcategory: 'wheel'`, setup: `setRandomizerModeWheel`)
   - `randomizer-slot`: Slot Machine Stage (`subcategory: 'slot'`, setup: `setRandomizerModeSlot`)
   - `randomizer-tarot`: Tarot Deck Stage (`subcategory: 'tarot'`, setup: `setRandomizerModeTarot`)
   - `randomizer-crate`: Loot Crate Stage (`subcategory: 'crate'`, setup: `setRandomizerModeCrate`)
   - `randomizer-wheel`: Chaos Wheel Modifier Modal (`subcategory: 'modals'`, trigger/modal)

2. **Streak Challenges (`category: 'streaks'`):**
   - `streaks-hub`: Killer Challenges Hub (`subcategory: 'hub'`, `/en/streaks/killer`, `auth: 'user'`)
   - `streaks-survivor`: Survivor Challenges Hub (`subcategory: 'hub'`, `/en/streaks/survivor`, `auth: 'user'`)
   - `streaks-chaos`: Chaos Streak Active Board (`subcategory: 'chaos'`, `/en/streaks/killer/chaos-streak`, `auth: 'user'`)
   - `streaks-gauntlet`: Gauntlet Streak Tracker (`subcategory: 'gauntlet'`, `/en/streaks/killer/gauntlet-streak`, `auth: 'user'`)
   - `streaks-history-streak`: History Streak Challenge (`subcategory: 'history'`, `/en/streaks/killer/history-streak`, `auth: 'user'`)
   - `streaks-page`: Page Streak Board (`subcategory: 'page-streak'`, `/en/streaks/killer/page-streak`, `auth: 'user'`)
   - `streaks-hub-guest`: Hub Gate (`subcategory: 'hub'`, `/en/streaks`, `auth: 'guest'`)
   - `streaks-chaos-guest`: Chaos Gate (`subcategory: 'chaos'`, `/en/streaks/killer/chaos-streak`, `auth: 'guest'`)
   - `streaks-stats-drawer`: Recent Match History Drawer (`subcategory: 'drawers'`, `variant="drawer-right"`, `auth: 'user'`)
   - `streaks-mode-modal`: Gauntlet / Challenge Difficulty Selector Modal (`subcategory: 'modals'`, `auth: 'user'`)
   - `streaks-rules`, `streaks-abandon`: (`subcategory: 'modals'`, `auth: 'user'`)

3. **Admin Tools (`category: 'account'`):**
   - Move `streaks-scoreboard` to `category: 'account'`, `subcategory: 'admin-tools'` (`/en/admin?tab=tools`).

4. **Tier Lists (`category: 'tier-lists'`):**
   - `tier-lists-hub`: Hub (`subcategory: 'hub'`, `/en/tier-lists`, `auth: 'guest'`)
   - `tier-lists-creator`: Custom Tier List Workspace (`subcategory: 'creator'`, `/en/tier-lists/new`, `auth: 'user'`, `requiresAuth: 'user'`)
   - `tier-lists-creator-guest`: Creator Sign-in Gate (`subcategory: 'creator'`, `/en/tier-lists/new`, `auth: 'guest'`)
   - `tier-lists-survivors`: Survivors Preset (`subcategory: 'presets'`, `/en/tier-lists/survivors`, `auth: 'guest'`)
   - `tier-lists-edit-item`, `tier-lists-export`: (`subcategory: 'modals'`, `auth: 'guest'`)

5. **Smash or Pass (`category: 'smash-or-pass'`):**
   - `smash-hub`: Card Arena with clean character display (`subcategory: 'arena'`, `/en/smash-or-pass`, `auth: 'guest'`)
   - `smash-create`: Custom Roster Creator (`subcategory: 'creator'`, `/en/smash-or-pass/create`, `auth: 'user'`, `requiresAuth: 'user'`)
   - Modals: `smash-preferences-prompt`, `smash-how-to-play`, `smash-roster-select`, `smash-leaderboard` (`subcategory: 'modals'`)

---

### 2.2 Viewport Fold Line Injection Engine (`site-tour.mjs`)

When capturing full-page screenshots (`fullPage: true`), the runner will evaluate the document scroll height. If `docHeight > vp.height + 30`:
- Inject a subtle, non-intrusive horizontal guide line at `y = vp.height`:
  ```html
  <div id="__tour_fold_marker__" style="position: absolute; left: 0; right: 0; top: ${vp.height}px; width: 100%; height: 0px; border-top: 2px dashed rgba(239, 68, 68, 0.85); z-index: 2147483647; pointer-events: none; box-sizing: border-box;">
    <span style="position: absolute; right: 12px; bottom: 4px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 4px; padding: 2px 8px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; color: #f87171; letter-spacing: 0.05em; text-transform: uppercase;">
      Initial Viewport Fold (${vp.width}x${vp.height}) &uarr;
    </span>
  </div>
  ```
- After the screenshot is written, remove the marker.
- Provide CLI toggle `--no-fold-line` to disable the overlay when plain visuals are requested.

---

### 2.3 Hierarchical Subcategory Navigation (`gallery/`)

1. **Markup (`galleryMarkup.mjs`):**
   - Add a dynamic `#subcategory-pills` container directly beneath `#category-pills`.
   - Hidden when `All Categories` is selected; appears when a category with subcategories is active.
2. **Styling (`galleryBaseCss.mjs` / `galleryComponentCss.mjs`):**
   - Style subcategory pills with a distinct, subtle accent border and badge count.
3. **Core Logic (`galleryClientCore.mjs`):**
   - Maintain `state.filters.subcategory = 'all'`.
   - When a category is clicked, render subcategories derived from that category's items in the manifest.
   - Filter grid by `subcategory` when set.
4. **Interactions (`galleryClientInteractions.mjs`):**
   - Handle subcategory pill clicks with reactive filtering.
   - Reset button resets category, subcategory, access, device, and search.

---

## 3. Constraints & Validation

- All modified files in `frontend/scripts` must remain strictly under 600 lines.
- Oxlint must pass with 0 errors and 0 warnings.
- All 92 repository guards must pass.
- Unit tests in `siteTourRunner.test.ts` must cover subcategory filtering and fold line options.
