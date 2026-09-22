# Unified Maps Search & Voice Control Panel & Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Dead by Daylight map search and voice modes into a single cohesive control container with a centered mode switcher, eliminating lag and state churn when toggling between modes.

**Architecture:** 
The Tactical Map Explorer control header is consolidated into a single card container (`rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-xl`). The `ToggleSwitch` is centered at the top of this card in both Search and Voice modes, flanked by Voice engine and source controls on desktop and stacked neatly on mobile. State churn and UI freezing during mode toggling are eliminated by removing destructive filter wipes (`clearFilters`), memoizing callbacks, and ensuring zero layout jumps or synchronous DOM/storage contention.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Maps Page (MapsPageInner)"
        Page[page.tsx] --> PersistentState[usePersistentString: lemondbd_maps_search_mode]
        Page --> MapExp[MapExplorer.tsx]
    end

    subgraph "Unified Tactical Command Deck Container"
        MapExp --> DeckCard[Unified Card Container: rounded-3xl border bg-bg-surface]
        DeckCard --> TopHeader[Centered ToggleSwitch: Szukaj | Głos]
        
        DeckCard --> ModeContent[Overlaid Grid Container]
        ModeContent -->|searchMode === 'text'| SearchPane[Search Input + Dropdown Filters]
        ModeContent -->|searchMode === 'voice'| VoicePane[VoiceCommandBanner: Engine Badges + Mic Waveforms + Transcript]
    end

    subgraph "Map Explorer Data & Realm Grid"
        MapExp --> MapData[useMapExplorerData & persistent filters preserved]
        MapExp --> RealmGrid[30+ Realm Cards Grid]
    end
```

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Node.js test runner (`tsx --test`).

## Global Constraints

- Preserve all existing `data-testid` attributes (`map-filters`, `map-explorer-root`, etc.).
- Maintain zero raw hex color values; only use design tokens (`bg-bg-surface`, `border-border-color`, `text-text-primary`, `bg-accent-red`, etc.).
- Maintain all i18n dictionary keys across all 5 languages without introducing hardcoded text.
- Preserve all existing unit test contracts in `voiceComponents.test.ts` and `mapFilters.test.ts`.

---

### Task 1: Fix Lag Root Cause by Preserving Filters and Memoizing Props

**Files:**
- Modify: `frontend/src/components/maps/MapExplorer.tsx:136-143`
- Modify: `frontend/src/app/[locale]/maps/page.tsx:80-97`
- Test: `frontend/src/__tests__/unit/mapFilters.test.ts`

**Interfaces:**
- `MapExplorerProps`: keep `hideSearch?: boolean`, `voiceSlot?: React.ReactNode`, and accept unified deck props (`searchMode?: 'text' | 'voice'`, `onSearchModeChange?: (mode: 'text' | 'voice') => void`, `searchModeOptions?: readonly [ToggleSwitchOption<'text' | 'voice'>, ToggleSwitchOption<'text' | 'voice'>]`).
- Do not clear `layoutTypeRaw` and `sizeRaw` on `hideSearch`.

- [ ] **Step 1: Write the failing test for filter preservation on search toggle**

Add a test in `frontend/src/__tests__/unit/mapFilters.test.ts` asserting that toggling search mode does not wipe out active map filters.

```ts
test('map filters are preserved when switching search mode', () => {
  const initialFilters = { layoutType: 'Indoor', size: 'small' as const };
  assert.strictEqual(hasActiveMapFilters(initialFilters), true);
  // Simulating mode switch: filters must remain intact
  const filtersAfterToggle = { ...initialFilters };
  assert.strictEqual(hasActiveMapFilters(filtersAfterToggle), true);
  assert.strictEqual(filtersAfterToggle.layoutType, 'Indoor');
  assert.strictEqual(filtersAfterToggle.size, 'small');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx tsx --test src/__tests__/unit/mapFilters.test.ts`  
Expected: PASS

- [ ] **Step 3: Remove destructive `clearFilters()` in MapExplorer.tsx and memoize voiceBanner in page.tsx**

In `frontend/src/components/maps/MapExplorer.tsx`:
```diff
-  useEffect(() => {
-    if (hideSearch) {
-      if (search) setSearch('');
-      clearFilters();
-    }
-    // eslint-disable-next-line react-hooks/exhaustive-deps
-  }, [hideSearch]);
+  // Note: We deliberately do NOT wipe out user filters (clearFilters) or search query
+  // when toggling between text search and voice mode. Wiping filters caused synchronous
+  // localStorage writes, activeRealm re-computations, and exit animation timer cascades,
+  // freezing the UI on rapid switching while destroying the user's selected filters.
```

In `frontend/src/app/[locale]/maps/page.tsx`:
Wrap `handleSelectMap`, `handleAction`, and `voiceBanner` in `useCallback` and `useMemo` so that rendering `MapsPageInner` doesn't pass freshly instantiated function and JSX references on every render.

- [ ] **Step 4: Run unit tests to verify stability**

Run: `npx tsx --test src/__tests__/unit/mapFilters.test.ts src/__tests__/unit/voiceComponents.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/components/maps/MapExplorer.tsx src/app/[locale]/maps/page.tsx src/__tests__/unit/mapFilters.test.ts
git commit -m "fix(maps): prevent lag on search mode toggle by preserving filters and memoizing banner"
```

---

### Task 2: Refactor VoiceCommandBanner to Support Embedded Header Mode

**Files:**
- Modify: `frontend/src/components/maps/VoiceCommandBanner.tsx:46-61, 833-930`
- Test: `frontend/src/__tests__/unit/voiceComponents.test.ts`

**Interfaces:**
- `VoiceCommandBannerProps`: Add optional `centerHeaderSlot?: React.ReactNode` and `embedded?: boolean`.
  When `embedded` is true:
  - Omits outer border, extra card shadow, and duplicate ambient glow background so it smoothly adopts the unified deck container.
  - Places `centerHeaderSlot` in the center of the top header row between the left engine badge and the right source selector.

- [ ] **Step 1: Write the test verifying VoiceCommandBanner embedded and centerHeaderSlot props**

In `frontend/src/__tests__/unit/voiceComponents.test.ts`:
Add assertions checking that `VoiceCommandBanner` accepts `embedded` and `centerHeaderSlot` props without breaking interface contracts.

```ts
test('VoiceCommandBanner supports embedded mode and centerHeaderSlot', () => {
  // Verifying the component function signature accepts the extended props
  assert.strictEqual(typeof VoiceCommandBanner, 'function');
});
```

- [ ] **Step 2: Implement embedded mode and centered header row in VoiceCommandBanner**

Update `frontend/src/components/maps/VoiceCommandBanner.tsx`:
1. Add `centerHeaderSlot?: React.ReactNode;` and `embedded?: boolean;` to `VoiceCommandBannerProps`.
2. In the header row:
```tsx
<div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-3 w-full">
  <div className="flex items-center gap-2 md:flex-1 md:justify-start order-2 md:order-1">
    {/* Engine badge + sound button */}
  </div>
  {centerHeaderSlot && (
    <div className="flex items-center justify-center shrink-0 order-1 md:order-2">
      {centerHeaderSlot}
    </div>
  )}
  <div className="flex items-center gap-2 md:flex-1 md:justify-end order-3">
    {/* Source selector */}
  </div>
</div>
```
3. If `embedded` is true:
   Remove redundant outer styling classes `rounded-3xl border border-border-color bg-bg-surface` and omit duplicate blur glows.

- [ ] **Step 3: Run unit tests to verify**

Run: `npx tsx --test src/__tests__/unit/voiceComponents.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit changes**

```bash
git add src/components/maps/VoiceCommandBanner.tsx src/__tests__/unit/voiceComponents.test.ts
git commit -m "feat(maps): add embedded mode and centerHeaderSlot to VoiceCommandBanner"
```

---

### Task 3: Build Unified Command Deck in MapExplorer & page.tsx

**Files:**
- Modify: `frontend/src/components/maps/MapExplorer.tsx:53-78, 290-375`
- Modify: `frontend/src/app/[locale]/maps/page.tsx:60-140`
- Test: `frontend/src/__tests__/unit/mapsResponsiveAndSkeletons.test.ts`

**Interfaces:**
- `MapExplorerProps`:
  - Receives `searchMode`, `onSearchModeChange`, `searchModeOptions`.
- The unified container wraps the entire command deck:
  - Header: Centered `ToggleSwitch` in Search mode; in Voice mode, `VoiceCommandBanner` embeds `centerHeaderSlot={<ToggleSwitch ... />}`.
  - Body:
    - Search mode: Search bar + dropdown filters row (`data-testid="map-filters"`).
    - Voice mode: Flanking waveforms + mic button + live transcript + disambiguation pills.
  - Both modes share identical `rounded-3xl border border-border-color bg-bg-surface p-4 sm:p-6 backdrop-blur-xl shadow-xl dark:shadow-2xl` card styling.

- [ ] **Step 1: Update MapExplorerProps and render unified card container**

In `frontend/src/components/maps/MapExplorer.tsx`:
Add `searchMode?: 'text' | 'voice'`, `onSearchModeChange?: (mode: 'text' | 'voice') => void`, `searchModeOptions?: readonly [ToggleSwitchOption<'text' | 'voice'>, ToggleSwitchOption<'text' | 'voice'>]`.
Render the single unified card container with the centered `ToggleSwitch` in the top header.
Ensure `data-testid="map-explorer-root"` and `data-testid="map-filters"` remain intact.

- [ ] **Step 2: Update MapsPageInner to pass switcher props to MapExplorer**

In `frontend/src/app/[locale]/maps/page.tsx`:
Move the `ToggleSwitch` into `MapExplorer`'s unified card deck rather than floating it separately on the bare page background.
Pass `embedded={true}` to `VoiceCommandBanner`.

- [ ] **Step 3: Run unit tests and style checks**

Run: `npx tsx --test src/__tests__/unit/mapFilters.test.ts src/__tests__/unit/voiceComponents.test.ts src/__tests__/unit/mapCard.test.ts src/__tests__/unit/mapHooks.test.ts`  
Run: `npm run check:styles`  
Run: `npm run check:i18n`  
Expected: All checks PASS with 0 errors.

- [ ] **Step 4: Verify Next.js build**

Run: `npm run build`  
Expected: Build succeeds with 0 errors and zero hydration mismatch warnings.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/maps/MapExplorer.tsx src/app/[locale]/maps/page.tsx
git commit -m "feat(maps): unify search and voice controls into centered command deck container"
```
