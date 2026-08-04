# Design Specification: LemonDBD Perk Comparison & Tier List Creator

**Date**: 2026-08-03  
**Status**: Approved  
**Author**: Antigravity Assistant & LemonDBD Team  

---

## 1. Overview & Goals

LemonDBD is a Dead by Daylight perk explorer web application. This design introduces an interactive **Perk Tier List Creator** and **Side-by-Side Comparison Tool** at `/[locale]/tierlist`.

### Key Capabilities
- **Interactive Drag-and-Drop Tier List**: S, A, B, C, D tiers with customizable row headers and colors.
- **Role-Segmented Pools**: Switch seamlessly between Survivor and Killer perk tier lists.
- **Side-by-Side Comparison Drawer**: Select 2 to 4 perks from any tier or pool to view a detailed stat & perk description diff matrix in a slide-up drawer.
- **Client-Side Persistence & URL State Sharing**: Tier placements auto-save in `localStorage`. Users can export/share tier lists via encoded URL parameters (`?role=survivor&data=...`) or export as high-res PNG images.
- **Full i18n Localization**: Integrated across `en`, `es`, and `pl` locales.

---

## 2. Architecture & Route Structure

- **Route**: `frontend/src/app/[locale]/tierlist/page.tsx`
- **Navigation Integration**: Update `Navbar.tsx` to include a link to the Tier List page across all supported locales.

### UI Layout Structure
```text
+-------------------------------------------------------------------------+
| Navbar (Home | Explorer | Tier List | Locale Switcher | Dark Toggle)     |
+-------------------------------------------------------------------------+
| [ Survivor Perks ]  [ Killer Perks ]     (Search Perk...) [Export PNG]  |
+-------------------------------------------------------------------------+
| Tier List Board:                                                       |
| [ S Tier ] [ Perk Card 1 ] [ Perk Card 2 ] ...                         |
| [ A Tier ] [ Perk Card 3 ] ...                                         |
| [ B Tier ] ...                                                         |
| [ C Tier ] ...                                                         |
| [ D Tier ] ...                                                         |
+-------------------------------------------------------------------------+
| Unranked Perk Pool (Filterable Grid of available perks)                 |
| [ Card ] [ Card ] [ Card ] [ Card ] ...                                 |
+-------------------------------------------------------------------------+
| (Sticky Bottom Bar) 3 Perks Selected for Comparison [ Compare Now ^ ]    |
+-------------------------------------------------------------------------+
| (Slide-Up Drawer) Side-by-Side Perk Comparison Matrix                   |
+-------------------------------------------------------------------------+
```

---

## 3. Data Models & State Schema

### Component State Types (`frontend/src/types/tierlist.ts`)

```typescript
export type Role = 'survivor' | 'killer';

export interface Tier {
  id: string;          // e.g. "tier-s"
  name: string;        // e.g. "S Tier"
  color: string;       // HEX or CSS badge color class
  perkIds: string[];   // Array of perk IDs assigned to this tier
}

export interface TierListState {
  role: Role;
  tiers: Tier[];
  comparePerkIds: string[]; // Up to 4 selected perk IDs
}
```

### URL Encoding Schema
- URL query string parameter: `?role=survivor&data=S:1,5,12|A:8,9|B:3`
- Parser decodes `data` param on page mount and populates tier rows automatically.

---

## 4. Component Breakdowns

1. **`TierListHeader`**
   - Role selector tab buttons (Survivor / Killer).
   - Perk filter/search input.
   - Action buttons: "Export PNG", "Share Link", "Reset Tiers".

2. **`TierListBoard`**
   - Renders container holding `TierRow` items.
   - Handles drag-and-drop events between tier rows and the unranked pool.

3. **`TierRow`**
   - Renders tier label badge with background color accents.
   - Contains drop zone for perk icon cards.
   - Quick actions: clear row perks, shift row up/down.

4. **`UnrankedPool`**
   - Scrollable grid displaying unassigned perks for active role.
   - Filtered dynamically by search query or category pills.

5. **`PerkCompareDrawer`**
   - Slide-up bottom overlay containing side-by-side card grid.
   - Highlights perk attributes (Name, Character, Category, Markdown Description, Icon).
   - "Close" and "Clear Selection" buttons.

6. **`ShareModal`**
   - Generates compact share link with copy-to-clipboard button and success toast.

---

## 5. Localization (i18n) Keys

Add `"tierlist"` namespace to `frontend/src/locales/en.json`, `es.json`, `pl.json`:

```json
"tierlist": {
  "title": "Perk Tier List & Comparison",
  "survivor": "Survivor Perks",
  "killer": "Killer Perks",
  "unranked_pool": "Unranked Perks",
  "export_png": "Export PNG",
  "share_link": "Share Tier List",
  "copied": "Link copied to clipboard!",
  "reset": "Reset Tiers",
  "compare_button": "Compare Perks ({count})",
  "compare_title": "Side-by-Side Comparison",
  "compare_max_warning": "You can compare up to 4 perks at once."
}
```

---

## 6. Error Handling & Edge Cases

- **Corrupted URL data**: Unrecognized perk IDs in `?data=` are safely discarded, placing valid perks in tiers and rest in the pool.
- **CORS / Icon Image Export**: Assets fetched locally from `/api/v1/perks` ensure canvas snapshotting works cleanly with `html-to-image`.
- **LocalStorage Reset**: Fallback to default S/A/B/C/D structure if stored state is empty or invalid.

---

## 7. Testing Plan

- **Unit Testing**: Test URL encoder/decoder functions and state reducer logic.
- **Visual & UI Verification**: Validate drag-and-drop touch/mouse interactions, drawer animations, and PNG export across Chrome/Firefox.
- **i18n Check**: Verify translated strings load correctly in `/en/tierlist`, `/es/tierlist`, and `/pl/tierlist`.
