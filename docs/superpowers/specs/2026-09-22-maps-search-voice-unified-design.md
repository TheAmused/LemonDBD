# Unified Maps Search & Voice Control Panel & Performance Optimization

**Date:** 2026-09-22  
**Status:** Approved  
**Author:** Antigravity  

## 1. Overview & Goals

On the Dead by Daylight Tactical Map Explorer (`/[locale]/maps`), users currently face two issues:
1. **Performance stutter / lag:** Rapidly toggling between "Szukaj" (Search) and "Głos" (Voice) tabs freezes the browser and stutters animations.
2. **Visual Discrepancy & Inconsistent Layout:** The Search and Voice modes have completely different visual packaging. Search consists of bare input fields and dropdowns floating on the page background with an isolated `ToggleSwitch` above it, whereas Voice renders a stylized dark panel card (`rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-xl`). The user requested that both modes share the **exact same container appearance** and that the `ToggleSwitch` is **centered inside this container**.

## 2. Architecture & Design

### 2.1 Unified Command Deck Container
- The control section on the maps page is wrapped in a single, unified styled card:
  - Container classes: `relative flex w-full flex-col overflow-hidden rounded-3xl border border-border-color bg-bg-surface px-4 py-4 md:px-6 md:py-5 backdrop-blur-xl shadow-xl dark:shadow-2xl transition-all duration-300 min-h-[14rem]`.
  - Ambient glow accents: `bg-accent-red/5 blur-3xl` in opposite corners for depth.
- The `ToggleSwitch` (`[ Szukaj | Głos ]`) is moved **inside** this container at the top center.

### 2.2 Header Layout
- **Desktop (`md:` and above):**
  - **Left corner:** Engine status badge (`Globe` Web Speech or `Brain` AI model) + Audio mute/unmute button. In Search mode, this space is kept balanced or cleanly collapsed so the switcher remains centered.
  - **Center:** Centered `ToggleSwitch` (`[ Szukaj | Głos ]`).
  - **Right corner:** Map source provider (`ŹRÓDŁO: Hens (Zegar) | LemonDBD (Zablokowane)`).
- **Mobile (`< md`):**
  - **Top row:** Centered `ToggleSwitch`.
  - **Second row (Voice mode only):** Engine badge on the left, map source provider on the right.

### 2.3 Body Content
- **Search Mode (`searchMode === 'text'`):**
  - Center search input (`Search` icon, clean placeholder, rounded borders).
  - Filter row (`data-testid="map-filters"`): Layout (`Compass`), Size (`Maximize2`), Sort (`ArrowDownAZ`), and Clear filters (`X`) button when filters are active.
- **Voice Mode (`searchMode === 'voice'`):**
  - Audio visualizer waveforms flanking the main mic button.
  - Interactive Mic button (supporting click toggle and Push-to-Talk "V").
  - Live transcript, recognition state badge, and instruction hints (`renderHoldKeyHint`).
  - Disambiguation variants pills when applicable.

## 3. Root Cause Analysis & Performance Optimization

### 3.1 Eliminating Filter Resets on Mode Toggle
- **Root Cause:** In `MapExplorer.tsx`:
  ```tsx
  useEffect(() => {
    if (hideSearch) {
      if (search) setSearch('');
      clearFilters();
    }
  }, [hideSearch]);
  ```
  Calling `clearFilters()` triggered two synchronous `localStorage.setItem` calls (`usePersistentString` for `layout` and `size`), wiped active filters, recalculated `displayedGroups`, recomputed `activeRealms`, scheduled double `requestAnimationFrame` updates, and triggered `setTimeout(..., PANEL_EXIT_MS)` on realm panels. Rapid toggling created severe main-thread lag.
- **Fix:** Remove `clearFilters()` from the `hideSearch` effect. Preserve user filters across mode toggles so switching is instant and preserves user settings.

### 3.2 Memoization & Event Listener Hygiene
- Stabilize callback references (`onSelectMap`, `onSourceChange`, `onAction`) and memoize `voiceBanner` in `MapsPageInner`.
- In `VoiceCommandBanner.tsx`, ensure keydown/keyup event listeners are cleanly attached/detached without unnecessary re-attachments caused by volatile inline function props.
- Guard speech model downloads against rapid toggling (`active` flag check with debounce if client model is selected).

## 4. Verification & Testing

- Automated tests:
  - `npx tsx --test src/__tests__/unit/mapFilters.test.ts src/__tests__/unit/voiceComponents.test.ts src/__tests__/unit/mapCard.test.ts src/__tests__/unit/mapHooks.test.ts`
- Linter & Style checks:
  - `npm run check:styles`
  - `npm run check:i18n`
- Next.js build verification:
  - `npm run build`
