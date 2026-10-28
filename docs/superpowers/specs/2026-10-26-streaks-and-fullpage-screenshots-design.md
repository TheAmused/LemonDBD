# Design Document: Logged-in Streaks Suite & Full-Page Vertical Screenshot Capture

**Date:** 2026-10-26  
**Status:** Approved  
**Author:** Antigravity  
**Goal:** Expand the LemonDBD Site Tour suite to fully support authenticated Streaks challenge pages (Killer & Survivor hubs, Chaos Streak, Win Streak/Gauntlet, History Streak, and Page Streak) alongside guest gating views, and implement full-height vertical document capture (`fullPage: true`) for all page routes so scrollable page content is comprehensively captured across Desktop, Laptop, Tablet, and Mobile.

---

## 1. Problem Statement & Motivation

1. **Missing Signed-In Streaks Pages:**
   - In `site-tour-catalog.mjs`, all streak routes (`streaks-hub`, `streaks-chaos`, `streaks-history`, `streaks-gauntlet`) lacked `requiresAuth: 'user'`.
   - Because `StreaksLayoutShell` wraps every streak route and checks `isAuthenticated && user`, unauthenticated visitors only see the `<AuthRequiredState>` gate ("Log in to track your challenges").
   - Consequently, the actual challenge gameplay, tracker boards, killer/survivor rosters, and match histories were never captured for the page catalog—only the guest login screen was captured.
   - The suite lacked dedicated signed-in challenge pages as well as Survivor and Page Streak routes.

2. **Truncated Scrolled Views:**
   - `site-tour.mjs` was configured with `fullPage: false`, which only captured the top viewport fold (e.g., 1080px tall on PC, 844px tall on Mobile).
   - Long pages with rich vertical content—such as Perks lists, Chaos Streak active runs (1997px+ tall on mobile), Character detail lore/perks/add-ons, Tier List workspaces, Landing page features/footer, and Terms/Legal pages—had their content below the fold cut off.
   - The Side-by-Side Comparison tool's synced scrolling feature in the Visual Explorer was rendered ineffective because the screenshots did not contain the full scrollable height.

---

## 2. Architecture & Design Specifications

### 2.1 Streaks Catalog Expansion (`frontend/scripts/site-tour-catalog.mjs`)

Streaks routes will be partitioned into distinct signed-in challenge tracking views and guest gate views:

#### A. Signed-in Challenge Routes (`auth: 'user'`, `requiresAuth: 'user'`)
1. **`streaks-hub`**: `Killer Challenges Hub (Signed In)`
   - Route: `/en/streaks/killer`
   - Folder: `04-streaks-hub`
   - Content: Killer challenge cards (Chaos, Win Streak, History, Page Streak) with active streak progress counters.
2. **`streaks-survivor`**: `Survivor Challenges Hub (Signed In)`
   - Route: `/en/streaks/survivor`
   - Folder: `04-streaks-survivor`
   - Content: Survivor challenge cards (Gauntlet, Escape streaks).
3. **`streaks-chaos`**: `Chaos Streak Active Tracker (Signed In)`
   - Route: `/en/streaks/killer/chaos-streak`
   - Folder: `04-streaks-chaos`
   - Content: Full active game board: killer picker, perk pool, chaos wheel trigger, win/loss tracker.
4. **`streaks-gauntlet`**: `Win Streak & Gauntlet Tracker (Signed In)`
   - Route: `/en/streaks/killer/win-streak`
   - Folder: `04-streaks-gauntlet`
   - Content: Win streak counter, streak rule settings, consecutive match record.
5. **`streaks-history`**: `Streak Match History (Signed In)`
   - Route: `/en/streaks/history`
   - Folder: `04-streaks-history`
   - Content: Historical match logs, killer/perk summaries, victory outcomes.
6. **`streaks-page`**: `Page Streak Challenge Tracker (Signed In)`
   - Route: `/en/streaks/killer/page-streak`
   - Folder: `04-streaks-page`
   - Content: Multi-page roster progression board and milestone rewards.

#### B. Guest Gate Routes (`auth: 'guest'`)
1. **`streaks-hub-guest`**: `Streak Challenges Hub - Sign-In Required (Guest)`
   - Route: `/en/streaks`
   - Folder: `04-streaks-hub-guest`
   - Content: `AuthRequiredState` gate with call-to-action to log in.
2. **`streaks-chaos-guest`**: `Chaos Streak Tracker - Sign-In Required (Guest)`
   - Route: `/en/streaks/killer/chaos-streak`
   - Folder: `04-streaks-chaos-guest`
   - Content: Sign-in prompt boundary for direct URL navigation.

---

### 2.2 Full Page Vertical Capture Engine (`frontend/scripts/site-tour.mjs`)

1. **Full-Page Document Height Capture for Page Routes:**
   - For all full-page routes, `page.screenshot({ path: filePath, fullPage: true })` captures the full scrollable document height from top to bottom.
   - Ensures mobile viewports (e.g. 390x2000px+) and desktop viewports (e.g. 1920x3500px+) capture all content below the fold.

2. **Viewport Framing for Interactive Modals:**
   - Modals and popups (`MODAL_TARGETS`) continue to use `fullPage: false`.
   - Preserves authentic device perspective with the modal dialog centered or drawer pinned in the active viewport.

3. **Handling of App Shell Scroll Containers:**
   - For pages where `<main>` has `overflow-y-auto` with flex layouts, `site-tour.mjs` executes a pre-capture stabilization script:
     ```javascript
     await page.evaluate(() => {
       // Ensure full content visibility during fullPage capture
       window.scrollTo(0, 0);
       const main = document.querySelector('main');
       if (main) main.scrollTop = 0;
     }).catch(() => {});
     ```
   - Playwright's `fullPage: true` automatically expands the virtual viewport to capture the document height.

4. **CLI Flag Support:**
   - Support `--no-full-page` / `--full-page=false` if a user ever desires fixed viewport captures.
   - Default is `true` for pages and `false` for modals.

---

### 2.3 Visual Explorer & Gallery Integration (`frontend/scripts/gallery/`)

1. **Card Grid Thumbnail Rendering:**
   - The CSS rule `.card-thumbnail { width: 100%; height: 100%; object-fit: cover; object-position: top; }` ensures that even very tall screenshots render as clean, uniformly proportioned 16:10 preview cards showing the top fold of the page.
2. **Lightbox Inspection & Navigation:**
   - Full-page images in the lightbox can be zoomed and panned vertically with mouse drag / wheel zoom, allowing developers and reviewers to inspect the entire vertical layout in high resolution.
3. **Compare Split View & Synced Scrolling:**
   - With full-page screenshots, comparing Desktop (1920px wide) with Mobile (390px wide) will enable smooth side-by-side synchronized vertical scrolling across the entire page layout.

---

## 3. Strict Verification & Constraints

1. **File Length Limit:**
   - `frontend/scripts/site-tour.mjs` must remain strictly under 600 lines (`fileLengthGuard.test.ts`).
   - `frontend/scripts/site-tour-catalog.mjs` must remain strictly under 600 lines.
2. **Code Quality & Hygiene:**
   - Zero linter errors or warnings with `npm run lint` (`oxlint`).
   - All 92 repository guards in `npm run test:guards` must pass.
   - All 24+ unit tests in `siteTourRunner.test.ts` must pass.
3. **Git Cleanliness:**
   - `additions/` directory remains untracked in git (`.gitignore`).
   - All screenshots are generated directly to `additions/screenshots/` without polluting git commits.
