# Design Spec: LemonDBD Light & Dark Theme System Architecture

- **Date**: 2026-09-02
- **Topic**: Theme Switcher & Light/Dark Mode Architecture Overhaul
- **Status**: Proposed
- **Author**: Antigravity Pair Programmer & LemonDBD Team

---

## 1. Executive Summary & Problem Analysis

LemonDBD supports both light and dark modes via `next-themes` and Tailwind CSS v4, but light mode is severely broken on most pages. Text is washed out or completely invisible (white text on white background), dark slate cards appear as jarring black blocks on white canvases, tables have illegible headers, and the theme switcher in the sidebar only allows a binary toggle between light and dark while permanently discarding the user's OS "System" preference.

### 1.1 Root Technical Causes

1. **The `.dbd-fog-overlay` Shorthand Bug (`globals.css`)**:
   ```css
   .dbd-fog-overlay {
     background: radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.04) 0%, transparent 78%);
   }
   ```
   The CSS shorthand `background:` resets `background-color` to `transparent`. Any element styled with `bg-[#070b12] ... dbd-fog-overlay` has its background wiped to transparent. In light mode, the underlying `body` (`#f8fafc`) shows through. However, children retain hardcoded classes like `text-slate-100` (`#f1f5f9`), resulting in near-white text on a white canvas.

2. **Hardcoded Dark Page Wrappers**:
   Eight major routes enforce hardcoded dark backgrounds and white text at their root `<div className="min-h-screen bg-[#070b12] text-slate-100 ...">`:
   - `/admin` (`app/[locale]/admin/page.tsx`)
   - `/` (`app/[locale]/page.tsx`)
   - `/perks` (`app/[locale]/perks/page.tsx` using `h-dvh bg-[#070b12] text-slate-100`)
   - `/characters` (`app/[locale]/characters/page.tsx`)
   - `/characters/[slug]` (`app/[locale]/characters/[slug]/page.tsx`)
   - `/randomizer` (`app/[locale]/randomizer/page.tsx`)
   - `/smash-or-pass` (`app/[locale]/smash-or-pass/page.tsx`)
   - `/user` (`app/[locale]/user/page.tsx`)

   Conversely, the other seven routes (`builds`, `maps`, `quests`, `draft`, `killer-calculator`, `streaks`, `swf`) already use `bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100`.

3. **Component-Level Hardcoded Dark Styles**:
   Entire subsystems were authored with dark-only classes without `dark:` variants:
   - **Admin Control Center**: `AdminHeader` title (`text-slate-100`), action buttons (`bg-slate-900/80 border-slate-700 text-slate-300`), tabs (`border-slate-800`), `AdminStatsGrid` cards (`bg-slate-900/60 border-slate-800 text-slate-100`), `AdminUserTable` (inputs, table rows, headers), `AdminAuditLogView` (dark box with low-contrast text), `AdminBugReportsWorkbench`, and admin modals.
   - **Perks Vault**: `Pagination` (`bg-slate-900 border-slate-800 text-slate-100`), `PerkCard` (list view), `PerkModal` (`bg-[#0c121e]/95 text-slate-100`), and `PerkDescription` (`text-slate-300 dark:text-slate-300`).
   - **User Profile**: `UserProfileForm` (dark card, inputs, headers), `UserMetricsGrid`, `UserBugReportsList`.
   - **Characters**: `CharactersHub` ("My Characters" button), `KillerDetailView` & `SurvivorDetailView` (hero titles and badges).

4. **Theme Switcher Limitations**:
   - `SidebarBottomControls.tsx` has a binary `resolvedTheme === 'dark' ? 'light' : 'dark'` toggle. Users cannot revert to `system` once clicked.
   - Hydration flicker: relies on `isMounted` state which flashes a default icon before client hydration completes.
   - Ambiguous icon representation (shows a Moon when dark is active, confusing whether it denotes current mode or target action).

---

## 2. Aesthetic Direction: "The Fog & Ash" vs. "The Entity Void"

In line with the `frontend-design` philosophy, Dead by Daylight's aesthetic should not degenerate into sterile corporate white or generic AI styling in light mode.

### 2.1 Light Theme: "The Fog & Ash"
- **Canvas / Background**: Weathered chalk, mist, and bone tones (`bg-slate-50` / `#f8fafc`) with subtle atmospheric fog.
- **Surfaces & Cards**: Crisp bone-white (`bg-white`) with fine slate boundaries (`border-slate-200/90`), subtle depth shadows (`shadow-sm` / `shadow-md`), and high-contrast interior wells (`bg-slate-50`).
- **Typography**: Deep obsidian text (`text-slate-900` for titles, `text-slate-700` for body, `text-slate-500` for labels).
- **Accents**: Visceral DBD accents calibrated for light backgrounds:
  - Ember / Campfire: `text-amber-700 bg-amber-500/10 border-amber-500/30`
  - Blood / Entity Red: `text-rose-700 bg-rose-500/10 border-rose-500/30`
  - Survivor Green: `text-emerald-700 bg-emerald-500/10 border-emerald-500/30`
- **Fog Overlay**: Soft cool slate mist (`rgba(100, 116, 139, 0.05)`), preserving atmospheric depth without muddying light backgrounds.

### 2.2 Dark Theme: "The Entity Void"
- **Canvas / Background**: Deep abyssal obsidian (`#030712` / `bg-slate-950`).
- **Surfaces & Cards**: Smoky glassmorphism (`bg-slate-900/80` / `bg-slate-900/60` with `border-slate-800`), deep shadows (`shadow-2xl shadow-black/60`).
- **Typography**: Crisp silver and slate text (`text-slate-100` for titles, `text-slate-300` for body, `text-slate-400` for labels).
- **Accents**: Neon auras and glowing runes:
  - Ember: `text-amber-400 bg-amber-500/10 border-amber-500/30`
  - Blood: `text-rose-400 bg-rose-500/10 border-rose-500/30`
  - Survivor: `text-emerald-400 bg-emerald-500/10 border-emerald-500/30`
- **Fog Overlay**: Crimson entity aura (`rgba(220, 38, 38, 0.06)`).

---

## 3. Architecture & Implementation Plan

### 3.1 CSS Foundation (`globals.css`)
1. Fix `.dbd-fog-overlay` to use `background-image` instead of the shorthand `background`:
   ```css
   .dbd-fog-overlay {
     background-image: radial-gradient(circle at 50% 50%, rgba(100, 116, 139, 0.05) 0%, transparent 78%);
   }

   .dark .dbd-fog-overlay {
     background-image: radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.06) 0%, transparent 80%);
   }
   ```
2. Refine base layer tokens in `:root` and `.dark` to establish standard variables.

### 3.2 3-State Theme Switcher (`SidebarBottomControls.tsx`)
1. Upgrade the theme switcher to a 3-way segmented control (Light `Sun`, Dark `Moon`, System `Laptop`/`Monitor`).
2. Utilize `theme` and `setTheme` from `next-themes`:
   - `light` -> forces light mode
   - `dark` -> forces dark mode
   - `system` -> automatically respects client OS setting (`prefers-color-scheme`)
3. Render an SSR-safe layout that avoids layout shift and icon hydration flicker.
4. Support full keyboard accessibility (`aria-pressed`, `aria-label`, tooltip integration).

### 3.3 Route Root Wrapper Normalization
Replace `bg-[#070b12] text-slate-100` across all page root containers with:
```tsx
className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300"
```
(On `/perks`, keep `h-dvh overflow-hidden` with the same color pairing).

Target files:
- `frontend/src/app/[locale]/admin/page.tsx`
- `frontend/src/app/[locale]/page.tsx`
- `frontend/src/app/[locale]/perks/page.tsx`
- `frontend/src/app/[locale]/characters/page.tsx`
- `frontend/src/app/[locale]/characters/[slug]/page.tsx`
- `frontend/src/app/[locale]/randomizer/page.tsx`
- `frontend/src/app/[locale]/smash-or-pass/page.tsx`
- `frontend/src/app/[locale]/user/page.tsx`

### 3.4 Component-Level Theme Support

#### A. Admin Control Center Suite
- `AdminHeader.tsx`:
  - Title: `text-slate-900 dark:text-slate-100 font-mono`
  - Action buttons: `border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300`
  - Dividing border: `border-slate-200 dark:border-slate-800`
- `admin/page.tsx` (Subtabs):
  - Inactive tabs: `text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/40`
- `AdminStatsGrid.tsx`:
  - Cards: `rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl`
  - Metric numbers: `text-slate-900 dark:text-slate-100 font-mono`
  - Labels: `text-slate-500 dark:text-slate-400`
- `AdminUserTable.tsx`:
  - Outer container: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm dark:shadow-2xl`
  - Search input: `border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500`
  - Role dropdown: `border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-slate-200`
  - Table header: `border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400`
  - Table rows: `divide-slate-200 dark:divide-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-100`
- `AdminAuditLogView.tsx`:
  - Card container: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-xl`
  - Table header: `text-slate-600 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800`
  - Table rows: `border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950/40`
  - Admin/target text: `text-slate-800 dark:text-slate-200 font-bold`
- `AdminBugReportsWorkbench.tsx`:
  - Status filter buttons and ticket list items with balanced light/dark cards.
- `AdminChallengeControl.tsx` & `AdminChallengeStats.tsx`:
  - Mode kill switch cards and roster list with theme-aware borders and surfaces.

#### B. Perks Vault & Controls
- `Pagination.tsx`:
  - Results info: `text-slate-500 dark:text-slate-400`, numbers `text-slate-900 dark:text-slate-100 font-bold`
  - Buttons: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`
  - Limit selector: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200`
  - Jump input: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100`
- `PerkCard.tsx`:
  - List mode card: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70`
  - Text: `text-slate-900 dark:text-slate-100 font-bold`, subtitle `text-slate-500 dark:text-slate-400`
- `PerkModal.tsx`:
  - Dialog: `border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e]/95 text-slate-900 dark:text-slate-100`
- `PerkDescription.tsx`:
  - Description body: `text-slate-700 dark:text-slate-300 leading-relaxed`

#### C. User Profile Suite
- `user/page.tsx`:
  - Hero header: `border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/90`
- `UserProfileForm.tsx`:
  - Card: `border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/70`
  - Inputs: `border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100`
- `UserMetricsGrid.tsx`:
  - Metric cards: `border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100`
- `UserBugReportsList.tsx`:
  - Report cards: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-slate-100`

#### D. Characters & Detail Views
- `CharactersHub.tsx`:
  - "My Characters" button: `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-500/50`
- `KillerDetailView.tsx` & `SurvivorDetailView.tsx`:
  - Hero name: `text-slate-900 dark:text-slate-100 font-mono`
  - Real name: `text-slate-700 dark:text-slate-200`

---

## 4. Verification Plan

### 4.1 Automated Tests
- Run complete frontend unit tests:
  ```powershell
  npm run test:unit
  ```

### 4.2 Visual Verification
- Verify the following pages in both **Dark** and **Light** modes:
  1. `/admin` (Admin Control Center, user directory, audit log table).
  2. `/perks` (Perks Vault, pagination, list view, grid view, perk modal).
  3. `/user` (Profile overview, edit credentials, metrics cards, bug reports).
  4. `/characters` and `/characters/[slug]` (Character roster, killer & survivor detail).
  5. Theme switcher: switch from Dark -> Light -> System -> Dark, confirming zero hydration flash and immediate styling update.
