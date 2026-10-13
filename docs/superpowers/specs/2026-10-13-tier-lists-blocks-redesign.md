# Tier Lists Hub & Cards Redesign: DBD Atmospheric Banners, Squareish Actions & Polished Blocks

**Date:** 2026-10-13  
**Status:** PROPOSED (Awaiting User Review)  
**Scope:** `frontend` (`TierListCards.tsx`, `TierListHub.tsx`, public images) + `backend` (`tier_lists.json` seed)  

---

## 1. Executive Summary

The tier lists overview page (`/tier-lists`) currently suffers from visual and interactive inconsistencies:
1. **Delete Button Shape Mismatch:** On custom tier list cards, the delete button uses `p-1.5 rounded-xl` on a 28px box, rendering as a circular bubble, whereas inside the custom tier list editor and creator toolbar, actions use squareish `rounded-lg` buttons. It must be adjusted to be squareish.
2. **Bland, Empty Official Blocks:** The 5 official tier list cards (Survivor Perks, Killer Perks, Survivors, Killers, Maps) currently have no `cover_image_url` set in the database/seed. Consequently, they render as featureless dark empty boxes with plain text and zero Dead by Daylight atmosphere.
3. **Disjointed & "Shitty" Custom List Elements:** In custom tier list cards, preview items currently render as 3 to 5 tiny 36px circular icons clumping loosely with `-space-x-2` in the middle of a cavernous empty card. The metadata row (`Items: X`, `Ranked: Y`, `Updated: ...`) lacks structure, and background images are heavily washed out by aggressive luminosity blending.

### The Solution:
- **Squareish Delete Action:** Replace the circular delete button on custom tier list cards with a refined `h-8 w-8 rounded-lg` button matching the editor toolbar design system.
- **Bespoke Cinematic DBD Banners:** Generate 6 dedicated high-resolution banners using `image-generator` (Survivor Perks, Killer Perks, Survivors, Killers, Maps, and a Custom List Default) placed in `frontend/public/images/tier-lists/` with backend seed integration and frontend fallback resolution so cards never appear blank.
- **Redesigned Card Blocks:** Rebuild `OfficialTierListCard` and `CustomTierListCard` with 130px atmospheric banner headers, cinematic vignette gradient fades, DBD `lore-ash-card` charred cinders styling, structured status pills, and an elegant item montage showcase for custom lists.

---

## 2. Atmospheric Backgrounds & Graphic Assets

### 2.1 Generated Banners
We will generate 6 cinematic 16:9 / 21:9 Dead by Daylight themed artwork banners:
1. `banner_survivor_perks.webp`: Ethereal cyan/teal Fog aura with glowing survivor perk diamond frames and mystical Entity mist.
2. `banner_killer_perks.webp`: Fiery crimson embers, shadowy spider claw silhouettes, and glowing red killer perk diamonds.
3. `banner_survivors.webp`: Misty campfire in the Fog with survivor silhouettes (Dwight, Meg, Claudette, Jake) gazing into the embers.
4. `banner_killers.webp`: Menacing Entity claws descending through crimson mist around iconic killer silhouettes with glowing red eyes.
5. `banner_maps.webp`: Desolate haunted Entity realm landscape (MacMillan Estate / Coldwind Farm) under pale moonlight and twisted dead trees.
6. `banner_custom_default.webp`: Dark trial blueprint parchment, ancient Entity glyphs, and faint campfire sparks for custom lists lacking a custom background.

### 2.2 Storage & Fallback Architecture
- **Location:** `frontend/public/images/tier-lists/` for guaranteed immediate static delivery across all deployment environments (Localhost, Docker, Cloudflare Quick Tunnels).
- **Backend Seed Sync:** Update `backend/app/seeds/data/content/tier_lists.json` to assign `cover_image_url: "/images/tier-lists/banner_<slug>.webp"` to each of the 5 official lists.
- **Frontend Fallback Map:** In `TierListCards.tsx`, define:
  ```ts
  const DEFAULT_OFFICIAL_COVERS: Record<string, string> = {
    'survivor-perks': '/images/tier-lists/banner_survivor_perks.webp',
    'killer-perks': '/images/tier-lists/banner_killer_perks.webp',
    'survivors': '/images/tier-lists/banner_survivors.webp',
    'killers': '/images/tier-lists/banner_killers.webp',
    'maps': '/images/tier-lists/banner_maps.webp',
  };
  const DEFAULT_CUSTOM_COVER = '/images/tier-lists/banner_custom_default.webp';
  ```
  If `list.cover_image_url` is null, empty, or unseeded, the card automatically falls back to its corresponding banner. Cards will never look bland again.

---

## 3. UI Component Redesign

### 3.1 Custom Tier List Card (`CustomTierListCard`)
- **Container:**
  - Rounded `rounded-3xl` card with `bg-bg-surface border border-border-color/80 shadow-md transition-all hover:-translate-y-1 hover:border-accent-red/50 hover:shadow-xl overflow-hidden`.
  - Top 130px banner header rendering user `backgroundImage` (if provided) or `DEFAULT_CUSTOM_COVER`, overlaid with a dark gradient scrim (`from-transparent via-bg-surface/75 to-bg-surface`).
- **Header & Title Area:**
  - Kind pill: `CUSTOM LADDER` with `type-label-2xs text-text-muted bg-bg-elevated/70 px-2 py-0.5 rounded-md border border-border-color/60`.
  - Title: bold, expressive `text-lg font-black text-text-primary group-hover:text-accent-red transition-colors line-clamp-1`.
  - Optional description preview (1-line clamp) if present.
- **Item Showcase Element (Redesigned):**
  - Instead of floating loose icons, render a dedicated **Item Showcase Strip**:
    - Up to 4 item thumbnails rendered in crisp `h-10 w-10 rounded-lg border border-border-color bg-bg-elevated object-cover shadow-xs`.
    - If `list.items.length > 4`, an overflow pill `+N` (`h-10 w-10 rounded-lg border border-dashed border-border-color bg-bg-surface/80 flex items-center justify-center type-strong-xs text-text-muted`).
    - Mini tier badge indicators showing the list's ladder distribution (e.g. small colored dots or pill badges for S, A, B, C, D).
- **Footer Meta & Actions:**
  - Meta chips:
    - Items counter: `<span className="type-strong text-text-muted">N items</span>`.
    - Ranked status: If ranked count > 0, an emerald badge `<span className="rounded-md bg-accent-green/15 border border-accent-green/25 px-2 py-0.5 text-accent-green type-strong">N ranked</span>`.
    - Date: `<span className="text-text-muted type-caption">{date}</span>`.
  - Actions cluster:
    - **Squareish Delete Button:**
      ```tsx
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(list.id, customTitle);
        }}
        {...tip(t.deleteList, undefined, 'action')}
        aria-label={`${t.deleteList} ${customTitle}`}
        className="h-8 w-8 rounded-lg border border-border-color bg-bg-surface text-text-muted hover:text-accent-red hover:border-accent-red/40 hover:bg-accent-red/15 transition-all flex items-center justify-center cursor-pointer shadow-xs"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
      ```
    - **Open Link:** `<span className="inline-flex items-center gap-1 type-strong text-accent-red group-hover:translate-x-0.5 transition-transform">{t.openList} <ChevronRight className="h-4 w-4" /></span>`.

### 3.2 Official Tier List Card (`OfficialTierListCard`)
- **Banner Header:**
  - 130px height hero banner displaying the high-res DBD artwork with gradient scrim into card surface.
  - Floating Kind badge (e.g. `SURVIVOR PERKS`, `KILLER PERKS`, `ROSTER`, `MAPS`) in top left with subtle themed color border.
- **Card Body:**
  - Title: `text-lg font-black text-text-primary group-hover:text-accent-red transition-colors`.
  - Description: 1-line clamped subtitle explaining the list scope.
- **Footer Meta:**
  - Item count pill (`formatMessage(t.itemsCount, { count: list.item_count })`).
  - Official Crown badge (`<Crown className="h-3.5 w-3.5 text-accent-amber" /> {t.officialRanking}`).
  - User progress indicator (`{rankedCount} ranked`) in green pill if user has started ranking.
  - Call to action: `{rankedCount > 0 ? t.continueRanking : t.startRanking}` with animated `ChevronRight`.

### 3.3 Hub Section Drawer Polish (`TierListHub.tsx`)
- Section header drawers:
  - Official Lists: Add count badge pill (`5 Official Lists`) next to title.
  - Custom Lists: Add count badge pill (`{customCount} Custom Lists`) next to title.
  - Polish the drawer header banner opacity and edge borders.
  - Clean responsive wrapping for the header action buttons (`Import JSON` and `+ New custom list`).

---

## 4. Verification & Quality Gates

1. **Type & Lint Safety:** Run `pnpm run check:types` and `pnpm run check:typography` to guarantee zero regressions and strict compliance with design tokens and type roles.
2. **Visual Inspection:** Verify `/en/tier-lists` on desktop, tablet, and mobile viewports.
3. **Live Preview Sync:** Verify that `CreatorPreview.tsx` (the "how it will look" modal in the tier list creator) seamlessly mirrors the redesigned custom card without layout breaks.
4. **Delete Flow:** Confirm clicking the squareish delete button properly triggers the `ConfirmModal` without triggering link navigation (`e.preventDefault()`, `e.stopPropagation()`).
