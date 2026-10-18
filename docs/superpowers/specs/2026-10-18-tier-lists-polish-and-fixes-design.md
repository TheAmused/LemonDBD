# Design Document: Tier Lists, Smash or Pass & Minigames Polish & Enhancements

**Date:** 2026-10-18  
**Status:** Approved by User  
**Target Areas:** Tier Lists, Smash or Pass, Minigames (Frontend & Backend)

---

## 1. Overview & Objectives

This design addresses several UX issues, bugs, and administrative workflow gaps across Tier Lists, Smash or Pass, and Minigames:
1. **Cover & Background Image Drag & Drop Upload**: Enable seamless drag & drop / local file upload for tier list backgrounds and roster covers in creator workflows with client-side scaling to ensure size safety.
2. **Official Custom Tier List Chrome Cleanup**: Eliminate the misleading `"CUSTOM"` label above the title for admin-authored official tier lists on both the board view and hub cards.
3. **Draft & Published Lifecycle**: Enable administrators to author official tier lists, smash or pass rosters, and minigames in `Draft` (`is_active = false`) mode, keeping them hidden from regular users while allowing admins to view, test, and publish them with a single toggle.
4. **Admin Deletion of Official Content**: Implement backend `DELETE` endpoints and frontend confirmation modals for official tier lists, rosters, and minigames.
5. **NSFW Setting Propagation & Cache Invalidation**: Resolve the bug where editing an official tier list's NSFW status did not update on the hub due to missing session cookie checks in `_is_personal()` and static catalog version caching without Redis.
6. **Tier Row Clear Button**: Relocate the clear tier button from inside the `TierEditModal` to a direct icon button on the right edge of each tier row on the board, visible whenever a tier contains placed items.
7. **Unified Global NSFW Preference & Blurring**: Standardize on a single global `lemondbd_show_nsfw` preference in `localStorage` (`false` by default). When disabled, NSFW cards/content are blurred with a badge and "Reveal" button; revealing any single element or consenting on any page automatically switches the global toggle on, uncovering all NSFW content across all features without repetitive clicks.
8. **Description Peek Duplicate Hiding**: When expanding a long description via the `DescriptionPeek` info button on hub cards, the clamped description paragraph below the banner is hidden smoothly to prevent duplicated text.

---

## 2. Global NSFW State & Blurring Architecture

### 2.1 Storage & Synchronization
- **Key**: `lemondbd_show_nsfw` in `localStorage`.
- **Default value**: `false`.
- **Core helper (`frontend/src/utils/nsfwAck.ts`)**:
  - `getGlobalNsfwPreference(): boolean`: Reads `localStorage.getItem('lemondbd_show_nsfw') === 'true'`.
  - `setGlobalNsfwPreference(enabled: boolean): void`: Writes `localStorage.setItem('lemondbd_show_nsfw', String(enabled))` and emits `window.dispatchEvent(new CustomEvent('nsfw-pref-change', { detail: enabled }))`.
  - Hook `useGlobalNsfwPreference()`: Subscribes to window events and storage changes, returning `[showNsfw, setShowNsfw]`.

### 2.2 Hub Experience
- A global toggle `<NsfwSwitch>` in the hub header / controls controls `showNsfw`.
- When `showNsfw === false`:
  - Cards with `is_nsfw: true` display blurred cover art (`blur-md`).
  - An overlay displays `<NsfwBadge>` and a `<Button variant="overlay" size="sm">` ("Reveal" / "Odkryj").
  - Clicking "Reveal" triggers `setShowNsfw(true)`. Because it is global, every card and feature unblurs at the same instant.
- When `showNsfw === true`:
  - All NSFW content is fully revealed.

### 2.3 Smash or Pass & Minigames Alignment
- `SmashOrPassHub.tsx` and `useSmashRosters.ts` replace per-roster acknowledgment with `useGlobalNsfwPreference()`. If `showNsfw === true`, the initial NSFW gate does not block deck access. Confirming the gate switches `setShowNsfw(true)`, instantly enabling NSFW visibility across the rest of the site.
- Minigame custom trials and daily challenges respect `showNsfw` for any challenge flagged `is_nsfw`.

---

## 3. Image Upload & Drag-and-Drop Component

### 3.1 Component Design (`frontend/src/components/common/ImageUploadDropzone.tsx`)
In accordance with `docs/style-sources.md`, the component is placed in `components/common/` using standard design tokens:
- **Dropzone Area**:
  - Drag events (`onDragOver`, `onDragLeave`, `onDrop`) and dashed container styling using `rounded-card` and token colors (`border-border-color`, `border-accent-red`, `bg-bg-primary/20`).
  - File input (`<input type="file" accept="image/*">`) triggered via `<Button variant="secondary" size="sm">`.
  - Secondary option / expandable input to paste a direct URL (`https://...`).
- **Optimization & Safety**:
  - Raster files (PNG, JPG, WebP) are processed using canvas resizing to produce WebP/PNG `data:` URLs capped at `TIER_LIST_LIMITS.maxDataImageChars` (128 KB).
  - Animated GIFs within the character cap are preserved without flattening.
- **Preview & Management**:
  - Displays a preview with 16:9 banner aspect ratio, `rounded-card`, and a quick remove button `<Button variant="overlay" size="xs" icon pill>`.
- **Usage**:
  - Integrated into `TierListCreator.tsx` for tier list background images.
  - Usable in `RosterBasicsSection.tsx` in Smash or Pass creator.

---

## 4. Tier List Board & Official List UI Polish

### 4.1 In-Row Clear Tier Button (`frontend/src/components/tier-lists/TierRow.tsx`)
- On the right edge of each tier row (where user highlighted with red circles in screenshots):
  - When `keys.length > 0`, render an action button: `<Button variant="ghost" size="sm" icon aria-label={t.clearTier} {...tip(t.clearTier, undefined, 'action')}>` with an `<Eraser className="h-4 w-4 text-text-muted hover:text-accent-red" />` icon.
  - Clicking this button executes `onClear(tier.id)`, sending placed items in that row back to the unranked pool.
- In `TierEditModal.tsx`:
  - Remove the clear button from the modal completely, leaving the modal solely for row label, color selection, and custom row background image.

### 4.2 Removing "Custom" Above Official Tier List Titles
- In `OfficialTierListView.tsx`:
  - When `template.kind === 'custom'`, pass `kindLabel={undefined}` (or empty).
  - In `TierListEditor.tsx`, `showKindBadge` remains false when `kindLabel` is absent, so no badge appears above the main title.
- In `OfficialTierListCard.tsx`:
  - `showKindBadge` is false when `list.kind === 'custom'`, preventing the "Custom" badge from rendering on official cards.

### 4.3 Duplicate Description Suppression in `DescriptionPeek`
- In `TierListCards.tsx`:
  - Track peek state in `DescriptionPeek` via callback `onOpenChange?: (open: boolean) => void` or banner group class (`group-has-[[aria-expanded=true]]/banner:opacity-0`).
  - When `DescriptionPeek` is expanded/hovered, apply `opacity-0 pointer-events-none transition-opacity duration-200` to the clamped paragraph `<p ref={descRef}>` below the banner.
  - The paragraph retains its height in the DOM so the card does not jitter or shift layout, while the redundant text is completely hidden.

---

## 5. Backend Architecture, Draft Lifecycle & Caching

### 5.1 HTTP Cache & Redis Fallback Invalidation (`backend/app/core/`)
- **Session Cookie Identification**:
  - In `http_cache.py`: add `SESSION_COOKIE_NAME` (`"lemondbd_session"`) to `_is_personal()`. Requests with the session cookie will bypass public catalog caching.
- **In-Memory Version Invalidation**:
  - In `redis_cache.py`: add a module-level variable `_local_catalog_version: int = 1`.
  - When `bump_catalog_version()` is called and Redis is absent (`client is None`), increment `_local_catalog_version += 1`.
  - `catalog_version()` returns `_local_catalog_version` when Redis is absent, ensuring ETag updates and preventing false `304 Not Modified` responses.

### 5.2 Draft & Published State (`is_active`)
- **Database Models**:
  - `TierList`, `Roster`, and `MinigameDailyChallenge` models retain/utilize `is_active: Mapped[bool]`.
- **API Endpoints**:
  - `POST /api/v1/tier-lists`: accepts `is_active: bool = True` in `TierListAdminCreate`.
  - `PUT /api/v1/tier-lists/<slug>`: accepts `is_active: bool | None = None` in `TierListAdminUpdate` and updates `row.is_active`.
  - `GET /api/v1/tier-lists`:
    - Checks admin authentication (`g.current_user` or session). If admin, returns all lists including `is_active == False` with an `is_active` attribute.
    - If non-admin / anonymous, returns only `is_active == True`.
  - `GET /api/v1/tier-lists/<slug>`:
    - If `is_active == False`, allows admin access; returns 404 for non-admin.
  - Analogous updates in `roster_admin.py` for Smash or Pass and `minigames.py` for minigames.
- **Frontend Creator & Editor**:
  - Add "Published" / "Draft" switch in `TierListCreator.tsx` when `isAdmin`.
  - On the hub (`TierListHub.tsx` / `OfficialTierListCard.tsx`), display `<Badge tone="amber">Draft</Badge>` on inactive cards visible to admins.

### 5.3 Admin Deletion Endpoints
- **Endpoints**:
  - `DELETE /api/v1/tier-lists/<slug>`: requires admin; deletes the row from Postgres, rewrites `seeds/data/content/tier_lists.json` via `_rewrite_seed_file()`, calls `bump_catalog_version()`, and logs admin action in audit log.
  - `DELETE /api/v1/smash-or-pass/admin/rosters/<slug>`: requires admin; removes roster and associated entity rows/stats, bumps catalog version.
  - `DELETE /api/v1/minigames/official/<challenge_id>`: requires admin; deletes official challenge.
- **Frontend**:
  - In `OfficialTierListView.tsx`: include delete button in header toolbar for admins with `<ConfirmModal>`. On confirm, calls `deleteOfficialTierList(slug)` and redirects to hub with toast.
  - In `OfficialTierListCard.tsx`: include delete action for admins.

---

## 6. Verification & Quality Gates

1. **Frontend Linters & Tests**:
   - Run `npm run check` in `frontend/` (TypeScript, ESLint, style-sources, duplication guards).
   - Run unit tests: `npm run test:unit`.
2. **Backend Unit Tests**:
   - Run pytest for tier list, smash or pass, and http_cache routes.
3. **Manual Verification**:
   - Verify drag & drop background upload on creator.
   - Verify unchecking NSFW and saving immediately updates without stale badge.
   - Verify row clear button clears tier items.
   - Verify global NSFW toggle unblurs all cards and syncs with Smash or Pass.
   - Verify draft toggle keeps list invisible to guests but visible to admin.
