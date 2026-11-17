# UI Inventory — Tier Lists (`/tier-lists`, `/tier-lists/[slug]`, `/tier-lists/custom/[id]`, `/tier-lists/new`)

## /tier-lists

### Page & files
- Page: `app/[locale]/tier-lists/page.tsx` (`TierListsPage`)
- Route loading boundary: `app/[locale]/tier-lists/loading.tsx` (`TierListsLoading` -> `components/layout/RouteLoading.tsx`, `components/common/DbdSpinner.tsx`)
- Feature entry: `features/tier-lists/index.ts`
- Main view: `components/tier-lists/TierListHub.tsx` (`TierListHub`)
- Cards: `components/tier-lists/TierListCards.tsx` (`OfficialTierListCard`, `CustomTierListCard`, `DescriptionPeek`)
- Import modal: `components/tier-lists/TierListImportModal.tsx` (`TierListImportModal`) -> `components/common/ImportModal.tsx` (`ImportModal`, `ImportPreview`, `Notice`)
- Skeleton: `components/tier-lists/TierListSkeleton.tsx` (`TierListSkeleton`)
- Shared UI: `components/common/AccordionSection.tsx`, `components/common/Alert.tsx`, `components/common/EmptyState.tsx`, `components/common/AuthRequiredState.tsx`, `components/common/ConfirmModal.tsx`, `components/common/PreferencesPromptModal.tsx`, `components/common/AtmospherePreferencesList.tsx`, `components/AuthModal.tsx`, `components/common/Tooltip.tsx`, `components/common/Badge.tsx`, `components/common/NsfwBadge.tsx`

### Layout elements
- **Screen-reader heading**: `<h1>` `"LemonDBD - Tier Lists"` (`tierLists.pageTitle`, `sr-only`).
- **Save Error Alert** (`components/common/Alert.tsx`, shown when `saveError && !saveError.ok`):
  - Quota error: `"Browser storage is full, so this change isn't saved. Remove some images or lists."` (`tierLists.saveFailedQuota`).
  - Unavailable error: `"This browser blocks local storage, so changes only last until you leave the page."` (`tierLists.saveFailedUnavailable`).
- **Official Lists Collapsible Drawer** (`AccordionSection`, `titleId="tier-lists-official"`, persisted via `lemondbd_drawer_tier_lists_official`, default open):
  - Banner background: `/images/banners/banner_loadouts.webp`.
  - Section heading `<h2>`: `"Official lists"` (`tierLists.officialSection`) + `ChevronDown` toggle icon.
  - Header action button: Secondary icon button (`Settings` icon, `aria-label="Settings"` / `sidebar.settings`) wrapped in `Tooltip` (`"Settings"`, placement `bottom`), navigates to `/${locale}/settings`.
  - **Official Cards Grid** (`1` col mobile, `2` cols `sm`, `3` cols `xl`, `4` cols `wide`): each `OfficialTierListCard` (`Link` to `/${locale}/tier-lists/${list.slug}`) contains:
    - Top banner (`h-32`): cover image (`list.cover_image_url` or fallback `/static/tier-lists/banner_{survivor_perks|killer_perks|survivors|killers|maps}.webp` or `banner_custom_default_{1..3}.webp` for custom kind).
    - Top-left badge (when `rankedCount > 0`): `"Ranked: {rankedCount}/{item_count}"` (`tierLists.rankedCount`, green text when fully ranked, muted otherwise).
    - Top-center badge (when `list.is_nsfw && showNsfw`): `NsfwBadge` `"NSFW"` (`tierLists.nsfw.badge`).
    - Top-right badges:
      - When `list.is_active === false` (admin draft visibility): Amber badge `"Draft"` (`tierLists.draft`).
      - When `list.kind !== 'custom'` and kind label differs from title: Overlay badge with kind name (`tierLists.kinds.*`: `"Survivor perks"`, `"Killer perks"`, `"Survivors"`, `"Killers"`, `"Maps"`).
    - Bottom-left description peek (`DescriptionPeek`, rendered only when `list.description` overflows 1 line): `Info` icon overlay button (`aria-expanded`, `aria-label={list.description}`) that reveals a frosted overlay across the banner with up to 6 lines of `list.description` on hover/focus/tap.
    - NSFW blur overlay (when `list.is_nsfw && !showNsfw`): blurs banner image, shows red badge `"NSFW"` (`tierLists.nsfw.badge`) and secondary button `"Show NSFW content"` (`tierLists.nsfw.reveal`, sets global NSFW preference to true).
    - Card body:
      - Heading `<h3>`: `{list.title}` (1-line clamp).
      - Description `<p>`: `{list.description}` (1-line clamp, fades out when `DescriptionPeek` is open).
    - Card footer:
      - Item count (when `list.item_count !== null`): `"Items: {count}"` (`tierLists.itemsCount`).
      - CTA text + `ChevronRight` icon: `"Start ranking"` (`tierLists.startRanking`, when `rankedCount === 0`) or `"Continue"` (`tierLists.continueRanking`, when `rankedCount > 0`).
- **My Custom Lists Collapsible Drawer** (`AccordionSection`, `titleId="tier-lists-custom"`, persisted via `lemondbd_drawer_tier_lists_custom`, default open, `stickyHeader`):
  - Banner background: `/images/banners/banner_account.webp`.
  - Section heading `<h2>`: `"My custom lists"` (`tierLists.mySection`) + `ChevronDown` toggle icon.
  - Header action buttons:
    - Secondary button: `FileJson` icon + `"Import JSON"` (`tierLists.importJson`, label hidden on `<sm`; triggers `signIn.run` -> opens `TierListImportModal`).
    - Primary button: `Plus` icon + `"New custom list"` (`tierLists.newCustomList`, label hidden on `<sm`; triggers `signIn.run` -> navigates to `/${locale}/tier-lists/new`).
  - **Custom Cards Grid** (sorted by `updatedAt` desc): each `CustomTierListCard` (`Link` to `/${locale}/tier-lists/custom/${list.id}`) contains:
    - Top banner (`h-32`): custom `backgroundImage` or deterministic fallback `/static/tier-lists/banner_custom_default_{1..3}.webp`.
    - Top-left badge: `"Ranked: {ranked}/{total}"` (`tierLists.rankedCount`, green when `ranked >= total && total > 0`).
    - Top-center badge (when `list.is_nsfw && showNsfw`): `NsfwBadge` `"NSFW"` (`tierLists.nsfw.badge`).
    - Top-right button: `Trash2` icon overlay button (`aria-label="Delete list {title}"`, tooltip `"Delete list"` / `tierLists.deleteList`, opens delete `ConfirmModal`).
    - Bottom-left description peek (`DescriptionPeek`, when `list.description` is clamped): `Info` icon button + frosted text overlay.
    - NSFW blur overlay (when `list.is_nsfw && !showNsfw`): red `"NSFW"` badge + `"Show NSFW content"` button (`tierLists.nsfw.reveal`).
    - Card body:
      - Title row: `<h3>` `{list.title || "Untitled tier list"}` (`tierLists.untitled`) + ownership badge on right:
        - Imported list (`_manifest.author_login !== user?.username`): muted overlay badge `"@{author_login}"`.
        - Own list: amber overlay badge `"Yours"` (`smashOrPass.picker.yours`).
      - Description `<p>` (optional): `{list.description}` (1-line clamp).
      - Item showcase strip (`h-10`):
        - When `total === 0`: italic caption `"No items yet. Add one, or import a JSON payload."` (`tierLists.poolEmptyCustom`).
        - Otherwise: up to 4 (`SHOWCASE_MAX`) `40x40` item thumbnails (`Img` or uppercase first-letter initial tile fallback) + dashed overflow counter tile `"+{overflow}"` when `total > 4`.
    - Card footer:
      - Updated date: `"Updated {date}"` (`tierLists.updatedOn`).
      - CTA text + `ChevronRight` icon: `"Open"` (`tierLists.openList`).

### Modes / states
- **Route-level loading (`app/[locale]/tier-lists/loading.tsx`)**: `RouteLoading` with `DbdSpinner` (`accent="blood"`, label `"Loading tier lists..."` / `tierLists.loading`).
- **Official section states**:
  - Loading (`loading && !error`): `TierListSkeleton` (`DbdSpinner` with `"Loading tier lists..."` / `tierLists.loading`).
  - Error (`error && lists.length === 0`): `EmptyState` with `CircleAlert` icon, title `"Couldn't load this tier list"` (`tierLists.loadError`), subtitle `"Check your connection and try again."` (`tierLists.loadErrorSubtitle`), action button with `RotateCcw` icon + `"Retry"` (`tierLists.retry`).
  - Empty (`lists.length === 0`): `EmptyState` with `LayoutList` icon, title `"No tier lists yet"` (`tierLists.noOfficialLists`), subtitle `"Official lists appear here once the server has seeded them."` (`tierLists.noOfficialListsSubtitle`).
- **Custom section states**:
  - Guest / unauthenticated (`!isAuthenticated`): `AuthRequiredState` (`variant="compact"`) with `LockIcon`, heading `<h2>` `"Log in to manage custom tier lists"` (`tierLists.loginToManage`), subtitle `"Log in to create, import, and save your custom tier lists."` (`tierLists.loginToManageDesc`), primary button `"Log in"` (`streaks.logIn`, opens `AuthModal`).
  - Authenticated & empty (`hydrated && customLists.length === 0`): `EmptyState` with title `"No custom lists yet"` (`tierLists.noCustomLists`), subtitle `"Import a JSON payload or start a blank list with your own images."` (`tierLists.noCustomListsSubtitle`).
- **Share link auto-import mode (`/tier-lists#import=...`)**:
  - Reads `#import=` URL hash on mount / `hashchange` once auth is loaded, strips hash from URL.
  - If unauthenticated: opens `AuthModal`.
  - If authenticated: opens `TierListImportModal` preloaded with `sharePayload`; on import, routes to `/${locale}/tier-lists/${doc.template}` (for official template rankings) or saves and routes to `/${locale}/tier-lists/custom/${id}` (for custom lists).

### Modals & drawers (file)
- **Delete Custom List ConfirmModal** (`components/common/ConfirmModal.tsx`):
  - Trigger: `Trash2` button on `CustomTierListCard`.
  - Content: title `"Delete this custom list?"` (`tierLists.deleteListTitle`), message `"{title}": It will be removed from this browser for good.` (`tierLists.deleteListMessage`), header close `X` button (`"Close"` / `modal.close`), confirm button `"Delete list"` (`tierLists.deleteList`).
- **Import Tier List Modal** (`components/tier-lists/TierListImportModal.tsx` -> `components/common/ImportModal.tsx`):
  - Trigger: `"Import JSON"` header button or `#import=` URL fragment.
  - Content:
    - Title: `"Import tier list"` (`tierLists.importTitle`), close `X` button.
    - Shared-link amber banner (when opened via `#import=`): `Info` icon + `"Someone shared a tier list with you. Check it, then import it."` (`tierLists.sharedLinkDetected`).
    - Field header: label `"JSON payload"` (`tierLists.pasteLabel`) + secondary button `Upload` icon + `"Upload .json"` (`tierLists.uploadFile`, triggers hidden `<input type="file" accept="application/json,.json">`).
    - Textarea (`#tier-list-import-json`, 10 rows): placeholder `'{ "title": "My list", "items": [{ "name": "...", "image": "https://..." }] }'` (`tierLists.pastePlaceholder`).
    - Validation / status notices (`Notice` & `ImportPreview`):
      - File error: `"Couldn't read that file."` (`tierLists.errors.readFile`).
      - Parse errors (`tierLists.errors.*`): `"That isn't valid JSON."` (`invalidJson`), `"The payload must be a JSON object."` (`notAnObject`), `"This isn't a LemonDBD tier list."` (`wrongFormat`), `"This tier list was made by a newer version of LemonDBD."` (`unsupportedVersion`), `"That payload is too large."` (`tooLarge`), `"A custom list needs at least one item with a name."` (`noItems`), `"This share link is broken or incomplete."` (`invalidShareLink`).
      - Moderation / signature errors: `"This content was removed by moderators for violating the community guidelines, so it can no longer be imported or played."` (`tierLists.contentRevoked`), `"This content has no valid account mark, so it can't be imported or played. Ask its author to share it again from their account."` (`tierLists.unsignedContent`).
      - Valid preview summary (`ImportPreview`): `"{title} · Tiers: {tiers} · Items: {items} · Ranked: {placed}"` (`tierLists.importPreview`).
      - Target context note (`Notice`): `"This is a ranking of the official \"{title}\" list. Importing replaces your current ranking of it."` (`tierLists.importAsRanking`), `"This will be saved as a new custom list in this browser."` (`tierLists.importAsCustom`), or error `"The official list \"{slug}\" doesn't exist here, so this ranking can't be opened."` (`tierLists.templateMissing`).
      - Sanitization warnings (`tierLists.warnings.*`): `droppedTiers`, `droppedItems`, `droppedImages`, `droppedPlacements`, `truncated`.
    - Footer: Primary button `Upload` icon + `"Import"` (`tierLists.importAction`, disabled until valid & verified).
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: Clicking `"New custom list"`, `"Import JSON"`, visiting `#import=` while signed out, or clicking `"Log in"` in `AuthRequiredState`.
  - Content: Login / Register / Forgot Password / 2FA / Email Verification / Account Blocked flows, ALTCHA security check, Google Sign-In, Legal doc preview modal (`components/legal/LegalDocModal.tsx`).
- **PreferencesPromptModal** (`components/common/PreferencesPromptModal.tsx`):
  - Trigger: Auto-opens on visit when `!isConfigured && !promptDismissed` (`mode="general"`).
  - Content: Title `"Experience & Atmosphere"` (`smashOrPass.effectsPrefs.promptTitle`), `AtmospherePreferencesList` switches (`"Sound Effects"`, `"Music"`, `"Interactive Animations"`, `"NSFW / 18+ Content"` with `"18+"` pill, `"Campfire Particles"` `"Full"` / `"Eco"` / `"Off"` buttons from `settings.*`), secondary button `"Defaults"` (`smashOrPass.effectsPrefs.continueDefaults`), primary button `"Settings"` (`smashOrPass.effectsPrefs.goToSettings`).

---

## /tier-lists/[slug]

### Page & files
- Page: `app/[locale]/tier-lists/[slug]/page.tsx` (`OfficialTierListPage`)
- Route loading boundary: `app/[locale]/tier-lists/loading.tsx` (`TierListsLoading`)
- Main view: `components/tier-lists/OfficialTierListView.tsx` (`OfficialTierListView`)
- Shared editor & board:
  - `components/tier-lists/TierListEditor.tsx` (`TierListEditor`)
  - `components/tier-lists/TierListScaleControl.tsx` (`TierListScaleControl` -> `components/common/ZoomControl.tsx`)
  - `components/tier-lists/TierListBoard.tsx` (`TierListBoard`)
  - `components/tier-lists/TierRow.tsx` (`TierRow`)
  - `components/tier-lists/TierBadge.tsx` (`TierBadge`)
  - `components/tier-lists/TierPool.tsx` (`TierPool`)
  - `components/tier-lists/SortableTierItem.tsx` (`SortableTierItem`)
  - `components/tier-lists/TierItemTile.tsx` (`TierItemTile` -> `components/ui/PerkIcon.tsx`, `components/common/FitText.tsx`)
- Modals & gates:
  - `components/tier-lists/TierItemPreviewModal.tsx` (`TierItemPreviewModal` -> `components/PerkDescription.tsx`)
  - `components/tier-lists/TierListExportModal.tsx` (`TierListExportModal` -> `components/common/ExportModal.tsx`)
  - `components/tier-lists/TierListImportModal.tsx` (`TierListImportModal` -> `components/common/ImportModal.tsx`)
  - `components/common/ConfirmModal.tsx` (`ConfirmModal`)
  - `components/common/NsfwContentGate.tsx` (`NsfwContentGate`)
  - `components/common/Popover.tsx` (`Popover`), `components/common/MenuItem.tsx` (`MenuItem`)

### Layout elements
- **Delete Error Alert** (admin only, when `deleteFailed` is true):
  - `Alert` with message `"Couldn't delete this list. Try again."` (`tierLists.deleteFailed`) and dismiss button (`"Dismiss"` / `tierLists.dismiss`).
- **Save Error Alert** (when `saveError` is `'quota'` or `'unavailable'`):
  - Dismissible `Alert` (`"Dismiss"` / `tierLists.dismiss`) with `tierLists.saveFailedQuota` or `tierLists.saveFailedUnavailable`.
- **Mobile Header Bar (`sm:hidden`)**:
  - Centered title stack: optional kind subtitle (`tierLists.kinds[template.kind]`, omitted if `custom` or identical to title) + `<h1>` `{template.title || "Untitled tier list"}`.
  - Right action button: `Ellipsis` icon button (`aria-label="Tier list actions"` / `tierLists.toolbarAria`) opening the mobile actions `Popover` menu.
- **Desktop Header Bar (`hidden sm:flex`)**:
  - Left column: `TierListScaleControl` (`ZoomControl`, `variant="toolbar"`):
    - Zoom out icon button (`MinusIcon`, `aria-label="Decrease scale"` / `tierLists.scaleZoomOut`, steps: `40, 55, 70, 85, 100, 115, 130`).
    - Percent reset button (`"{scale}%"` or `"Fit"`, `aria-label="Reset scale (100%)"` / `tierLists.scaleReset`).
    - Zoom in icon button (`PlusIcon`, `aria-label="Increase scale"` / `tierLists.scaleZoomIn`).
    - Fit toggle button (`FitIcon` + `"Fit"` / `tierLists.scaleFit`, `aria-pressed`, tooltip `"Fit entire tier list on screen"` / `tierLists.scaleFitHint`).
  - Center column: optional kind label (`short:hidden`) + `<h1>` `{template.title || "Untitled tier list"}`.
  - Right toolbar (`role="toolbar"`, `aria-label="Tier list actions"` / `tierLists.toolbarAria`):
    - **Touch/coarse-pointer only (`!finePointer`)**: Show/Hide names toggle button (`Eye` / `EyeOff` icon, `aria-pressed`, label/tooltip `"Show names"` / `tierLists.showNames` or `"Hide names"` / `tierLists.hideNames`).
    - Import button: `Upload` icon, tooltip `"Import"` (`tierLists.import`), opens `TierListImportModal`.
    - Export button: `Download` icon, tooltip `"Export"` (`tierLists.export`), opens `TierListExportModal`.
    - Reset button: `RotateCcw` icon, tooltip `"Reset"` (`tierLists.reset`), opens Reset `ConfirmModal`.
    - **Admin-only (`isAdmin`)**:
      - Edit details link: `Pencil` icon (`Link` to `/${locale}/tier-lists/new?official=${slug}`), tooltip `"Edit details"` (`tierLists.editDetails`).
      - Delete list button: `Trash2` icon, tooltip `"Delete list"` (`tierLists.deleteList`), opens Delete `ConfirmModal`.
- **Tier List Board (`TierListBoard`)**:
  - **DndContext** with screen-reader instructions (`tierLists.dnd.instructions`) and live announcements (`tierLists.dnd.pickedUp`, `movedOver`, `dropped`, `cancelled`).
  - **Tier Rows (`TierRow`, one `<section>` per tier in `tiers`, `aria-label="Tier {label}"` / `tierLists.tierAria`)**:
    - Left `TierBadge`: colored swatch (`s|a|b|c|d|e|f|neutral` or custom hex) with auto-fitted `tier.label` (`FitText`), or `tier.backgroundImage` cover with `sr-only` label. Clicking badge or row when an item is selected moves the selected item into this tier.
    - Middle droppable & sortable item area:
      - Renders `SortableTierItem` -> `TierItemTile` (`shape="wide"` for `maps`, `"square"` for all others; tooltip `item.name`; `PerkIcon` image or 3-line `FitText` name fallback; optional 1-line name caption below tile when `showNames` is active).
      - Empty row placeholder (when `keys.length === 0 && !canReceiveSelection`): `"Drop items here"` (`tierLists.dropHere`).
      - Tap-to-move button (when `selectedKey !== null` and item is not already in this row): dashed amber button with `ArrowDownToLine` icon + `"Move here"` (`tierLists.moveHere`).
    - Right clear-row column (hidden in `fit` mode):
      - When `keys.length > 0`: danger icon button (`Eraser` icon, `aria-label="Clear tier {label}"` / `tierLists.clearTierAria`, tooltip `"Clear tier {label}"`), returns all items in the row to the unranked pool.
      - When `keys.length === 0`: empty width spacer.
  - **Unranked Pool (`TierPool`, `<aside aria-label="Unranked">`, hidden when `scale === 'fit'`)**:
    - Collapsible header bar (`/images/banners/banner_loadouts.webp` backdrop):
      - Left search box (hidden when pool is empty and query is empty): `SearchInput` (`placeholder="Search unranked..."` / `tierLists.searchPool`, `aria-label="Filter unranked items"` / `tierLists.searchPoolAria`) + clear `X` icon button (`aria-label="Clear search"` / `tierLists.clearSearch` when `query` is non-empty).
      - Center heading `<h2>`: `"Unranked"` (`tierLists.unranked`).
      - Right collapse toggle button: `ChevronDown` icon (`aria-expanded={!collapsed}`, `aria-label="Hide unranked"` / `tierLists.hidePool` or `"Show unranked"` / `tierLists.showPool`).
    - Collapsible drawer body:
      - Tap-to-move bar (when a ranked item is selected): dashed amber button with `ArrowDownToLine` icon + `"Move here"` (`tierLists.moveHere`).
      - Droppable & sortable item grid (`SortableTierItem` tiles).
      - Inline empty state (`EmptyState variant="inline"`):
        - When all items are ranked (`keys.length === 0`): `"Everything is ranked!"` (`tierLists.poolEmpty`).
        - When search has no matches (`visibleKeys.length === 0 && keys.length > 0`): `"Nothing matches your search"` (`tierLists.poolNoMatches`).
  - **DragOverlay**: floating `TierItemTile` (`overlay` style) while dragging.

### Modes / states
- **Loading states**:
  - Route suspense / initial template load (`templateLoading && !templateError`): `TierListSkeleton` (`"Loading tier lists..."` / `tierLists.loading`).
  - Roster items or localStorage hydration load (`itemsLoading || !hydrated`): `TierListSkeleton` with label `"Gathering the roster..."` (`tierLists.loadingItems`).
- **Error & Not Found states**:
  - Invalid URL param (`safeDecodeParam(slug) === null`): Next.js `notFound()`.
  - 404 template (`isNotFoundError(templateError)`): `EmptyState` with `SearchX` icon, title `"Tier list not found"` (`tierLists.notFoundTitle`), subtitle `"It may have been retired, or the link is wrong."` (`tierLists.notFoundSubtitle`).
  - Network/server error on template or items (`templateError` or `itemsError && items.length === 0`): `EmptyState` with `CircleAlert` icon, title `"Couldn't load this tier list"` (`tierLists.loadError`), subtitle `"Check your connection and try again."` (`tierLists.loadErrorSubtitle`), `"Retry"` button (`RotateCcw` icon + `tierLists.retry`).
- **NSFW Gate (`nsfwGate.gated` when `template.is_nsfw === true` and not yet acknowledged)**:
  - Renders `NsfwContentGate` (`data-testid="nsfw-content-gate"`): `MatureIcon` tile, `<h2>` `"Contains NSFW Content"` (`tierLists.nsfw.title`), description `"This tier list is flagged as containing mature/NSFW content. Confirm you want to view it."` (`tierLists.nsfw.description`), secondary button `"Go back"` (`tierLists.nsfw.back`, navigates to `/${locale}/tier-lists`), primary button `"Confirm"` (`tierLists.nsfw.confirm`, unlocks gate).
- **Board scale & Fit mode**:
  - Percentage scale (`40%`–`130%`, persisted in `lemondbd_tier_lists_scale`): resizes tiles/badges proportionally; auto-hides item names if tile height drops below `44px` (`NAMES_MIN_TILE`).
  - `fit` mode (`scale === 'fit'`): hides `TierPool` and row clear (`Eraser`) buttons, stretches tier rows to fill viewport height for clean screenshots.
- **Pointer vs. Touch mode**:
  - Fine pointer (mouse): item names toggle button is hidden; item names are shown via hover `Tooltip` on each tile (`defaultShowNames` is `true` for `maps` and `custom` kinds, `false` otherwise, but `showNames` only activates when `!finePointer`).
  - Coarse pointer (touch): shows `"Show names"` / `"Hide names"` toggle button (persisted per kind in `lemondbd_tier_lists_names_${kind}`).
- **Tap-to-move selection mode**:
  - Clicking/tapping a tile selects it (`selectedKey`, red ring) and reveals `"Move here"` buttons on all other tier rows and the pool; pressing `Escape` or clicking the tile again cancels selection.
- **Admin vs. Visitor mode**:
  - Visitors rank items locally in `localStorage`; ladder tiers are fixed to the official template.
  - Admins (`isAdmin`) additionally see `"Edit details"` (links to `/tier-lists/new?official=${slug}`) and `"Delete list"` (deletes official list from DB via `deleteOfficialTierList` and redirects to `/tier-lists`).

### Modals & drawers (file)
- **Mobile Actions Popover Menu** (`components/tier-lists/TierListEditor.tsx` -> `components/common/Popover.tsx`):
  - Trigger: Mobile header `Ellipsis` icon button (`sm:hidden`).
  - Content: `TierListScaleControl` (`variant="menu"`), `"Show names"` / `"Hide names"` `MenuItem` (touch only), `"Import"` `MenuItem`, `"Export"` `MenuItem`, `"Reset"` `MenuItem`, admin `"Edit details"` `Link` menu item, admin `"Delete list"` `MenuItem`.
- **TierItemPreviewModal** (`components/tier-lists/TierItemPreviewModal.tsx`):
  - Trigger: Double-click / double-tap any `SortableTierItem` tile.
  - Content: `Modal` (`size="xl"`), header title `{item.name}` in red + close `X` button; optional amber subtitle `{item.subtitle}`; full-size image (`item.fullImage ?? item.image`) or 2-letter uppercase initials `Surface` fallback; formatted `PerkDescription` when `item.description` is present (for perks).
- **Reset ConfirmModal** (`components/common/ConfirmModal.tsx`):
  - Trigger: Toolbar / menu `"Reset"` button.
  - Content: Title `"Reset this tier list?"` (`tierLists.resetTitle`), message `"The list goes back to the official LemonDBD ranking. Your placements will be lost."` (`tierLists.resetToOfficialMessage`, when `template.has_default_placements` is true) or `"Every item goes back to the unranked pool. This can't be undone."` (`tierLists.resetMessage`), confirm button with `RotateCcw` icon + `"Reset"` (`tierLists.reset`).
- **Delete Official List ConfirmModal** (`components/common/ConfirmModal.tsx`, admin only):
  - Trigger: Toolbar / menu `"Delete list"` button.
  - Content: Title `"Delete this custom list?"` (`tierLists.deleteListTitle`), message `"It will be removed from this browser for good."` (`tierLists.deleteListMessage`), confirm button with `Trash2` icon + `"Delete list"` (`tierLists.deleteList`).
- **TierListExportModal** (`components/tier-lists/TierListExportModal.tsx` -> `components/common/ExportModal.tsx`):
  - Trigger: Toolbar / menu `"Export"` button.
  - Content:
    - Title: `"Export tier list"` (`tierLists.exportTitle`), close `X` button.
    - Signing error `Alert` (if server manifest signing fails): `"Couldn't add your account mark for sharing. Sign in again and retry."` (`tierLists.signFailed`).
    - Share link section: label `"Share link"` (`tierLists.shareLinkLabel`), read-only `Input` (`#tier-list-share-link`, shows `"Preparing link..."` / `tierLists.preparingLink` while encoding), primary button with `Link2` / `Check` icon + `"Copy link"` / `"Copied!"` / `"Couldn't copy. Select the text and copy it manually."` (`tierLists.copyLink`, `copied`, `copyFailed`).
    - Long link warning (when link > `8,000` chars): amber notice with `TriangleAlert` icon + `"This link is {count} characters long. Some chat apps cut long links, so send the .json file instead."` (`tierLists.linkTooLong`).
    - JSON section: label `"JSON"` (`tierLists.jsonLabel`), read-only `Textarea` (`#tier-list-json`, 10 rows), secondary button `Download` icon + `"Download .json"` (`tierLists.downloadJson`), secondary button `Copy` / `Check` icon + `"Copy JSON"` / `"Copied!"` (`tierLists.copyJson`, `copied`).
- **TierListImportModal** (`components/tier-lists/TierListImportModal.tsx` -> `components/common/ImportModal.tsx`):
  - Trigger: Toolbar / menu `"Import"` button (`importTarget={{ kind: 'template', slug, title: template.title }}`).
  - Content: Same shell as Hub import modal; validates that the JSON matches this official template (`tierLists.importAsRanking` info note, or `tierLists.wrongTemplate` error `"This JSON belongs to a different tier list."`).

---

## /tier-lists/custom/[id]

### Page & files
- Page: `app/[locale]/tier-lists/custom/[id]/page.tsx` (`CustomTierListPage`)
- Route loading boundary: `app/[locale]/tier-lists/loading.tsx` (`TierListsLoading`)
- Main view: `components/tier-lists/CustomTierListView.tsx` (`CustomTierListView`)
- Shared editor & board: `components/tier-lists/TierListEditor.tsx`, `components/tier-lists/TierListScaleControl.tsx`, `components/tier-lists/TierListBoard.tsx`, `components/tier-lists/TierRow.tsx`, `components/tier-lists/TierBadge.tsx`, `components/tier-lists/TierPool.tsx`, `components/tier-lists/SortableTierItem.tsx`, `components/tier-lists/TierItemTile.tsx`
- Modals & gates: `components/tier-lists/TierItemPreviewModal.tsx`, `components/tier-lists/TierListExportModal.tsx`, `components/tier-lists/TierListImportModal.tsx`, `components/common/ConfirmModal.tsx`, `components/common/NsfwContentGate.tsx`, `components/common/AuthRequiredState.tsx`, `components/common/ReportContentModal.tsx`, `components/AuthModal.tsx`

### Layout elements
- **Shared `TierListEditor` & `TierListBoard`** (same layout as `/tier-lists/[slug]`, with custom-list specifics):
  - **Header subtitle (`kindLabel`)**:
    - Imported list (`list._manifest?.author_login !== user?.username`): `"@{author_login}"`.
    - Own list: `"Yours"` (`smashOrPass.picker.yours`).
  - **Header title `<h1>`**: `{list.title || "Untitled tier list"}` (`tierLists.untitled`).
  - **Desktop Toolbar & Mobile Popover Menu actions** (available to any authenticated viewer of the custom list):
    - `TierListScaleControl` (`-`, `{scale}%`/`Fit`, `+`, `Fit`).
    - `"Show names"` / `"Hide names"` toggle (on touch/coarse-pointer devices; `defaultShowNames` is `true`).
    - `"Import"` button (`Upload` icon) -> opens `TierListImportModal` (`target={{ kind: 'custom' }}`).
    - `"Export"` button (`Download` icon) -> opens `TierListExportModal`.
    - `"Reset"` button (`RotateCcw` icon) -> opens Reset `ConfirmModal`.
    - `"Report"` button (`Flag` icon, `aria-label="Report content"` / `tierLists.reportButtonAria`, tooltip `"Report"` / `tierLists.reportButton`) -> opens `ReportContentModal`.
    - `"Edit details"` link (`Pencil` icon, `Link` to `/${locale}/tier-lists/new?edit=${id}`, tooltip `"Edit details"` / `tierLists.editDetails`).
    - `"Delete list"` button (`Trash2` icon, tooltip `"Delete list"` / `tierLists.deleteList`) -> opens Delete `ConfirmModal`.
  - **Board & Unranked Pool**:
    - Tiles use `shape="square"`.
    - Pool empty message:
      - When list has 0 items total (`list.items.length === 0`): `"No items yet. Add one, or import a JSON payload."` (`tierLists.poolEmptyCustom`).
      - When all items are placed in tiers: `"Everything is ranked!"` (`tierLists.poolEmpty`).

### Modes / states
- **Loading state (`authLoading || !hydrated`)**: `TierListSkeleton` (`"Loading tier lists..."` / `tierLists.loading`).
- **Auth-gated state (`!isAuthenticated`)**:
  - Renders `AuthRequiredState` (`variant="dashed"`): `LockIcon` tile, `<h2>` `"Log in required"` (`tierLists.authRequiredTitle`), subtitle `"You must be logged in to create, edit, or view custom tier lists."` (`tierLists.authRequiredDesc`), primary button `"Log in"` (`streaks.logIn`, opens `AuthModal`).
- **Not Found state (`!list` in `localStorage` or invalid param)**:
  - `EmptyState` with `SearchX` icon, title `"Custom list not found"` (`tierLists.customNotFoundTitle`), subtitle `"Custom lists live in this browser only. It may have been deleted, or created on another device."` (`tierLists.customNotFoundSubtitle`).
- **NSFW Gate (`nsfwGate.gated` when `list.is_nsfw === true` and not acknowledged)**:
  - Renders `NsfwContentGate` with `"Contains NSFW Content"` (`tierLists.nsfw.title`), `"This tier list is flagged as containing mature/NSFW content. Confirm you want to view it."` (`tierLists.nsfw.description`), `"Go back"` (`tierLists.nsfw.back`), and `"Confirm"` (`tierLists.nsfw.confirm`).
- **Scale / Fit / Touch / Tap-to-move modes**: Identical to `/tier-lists/[slug]`.

### Modals & drawers (file)
- **Mobile Actions Popover Menu** (`components/tier-lists/TierListEditor.tsx` -> `components/common/Popover.tsx`):
  - Trigger: Mobile header `Ellipsis` button.
  - Content: Scale control, Show/Hide names (touch), Import, Export, Reset, Edit details, Delete list, Report.
- **TierItemPreviewModal** (`components/tier-lists/TierItemPreviewModal.tsx`):
  - Trigger: Double-click / double-tap any item tile.
- **Reset ConfirmModal** (`components/common/ConfirmModal.tsx`):
  - Trigger: Toolbar / menu `"Reset"` button.
  - Content: Title `"Reset this tier list?"` (`tierLists.resetTitle`), message `"Every item goes back to the unranked pool. This can't be undone."` (`tierLists.resetMessage`), confirm button `"Reset"` (`tierLists.reset`).
- **Delete ConfirmModal** (`components/common/ConfirmModal.tsx`):
  - Trigger: Toolbar / menu `"Delete list"` button.
  - Content: Title `"Delete this custom list?"` (`tierLists.deleteListTitle`), message `"It will be removed from this browser for good."` (`tierLists.deleteListMessage`), confirm button `"Delete list"` (`tierLists.deleteList`, deletes from `localStorage` and navigates to `/${locale}/tier-lists`).
- **TierListExportModal** (`components/tier-lists/TierListExportModal.tsx` -> `components/common/ExportModal.tsx`):
  - Trigger: Toolbar / menu `"Export"` button. Signs custom payload with author's account manifest via `/api/v1/content/sign` before enabling share link & JSON download/copy.
- **TierListImportModal** (`components/tier-lists/TierListImportModal.tsx` -> `components/common/ImportModal.tsx`):
  - Trigger: Toolbar / menu `"Import"` button (`target={{ kind: 'custom' }}`).
  - Content: Shows info notice `"This replaces the items, tiers and placements of the list you have open."` (`tierLists.importReplacesCustom`), or error `"This JSON is a ranking of an official list. Import it from the Tier Lists page instead."` (`tierLists.expectedCustom`) if an official template ranking is pasted.
- **ReportContentModal** (`components/common/ReportContentModal.tsx`):
  - Trigger: Toolbar / menu `"Report"` (`Flag`) button.
  - Content:
    - Modal (`size="md"`), title `"Report content"` (`tierLists.reportTitle`), close `X` button, subtitle showing `{list.title}`.
    - **Idle / Form view** (when `features.contentReportsOpen` is true):
      - Unsigned warning banner (when `!list._manifest`): `ShieldAlert` icon + `"This copy has no valid account mark, so moderators will not be able to trace it to an account. You can still report it and they will review the content itself."` (`tierLists.reportNoManifest`).
      - Error alert (when `status === 'error'`): `CircleAlert` icon + `"Failed to submit report. Please try again."` (`tierLists.reportError`).
      - Reason dropdown (`CustomDropdown`, label `"Reason for report"` / `tierLists.reportReasonLabel`):
        - `"Hate speech or symbols"` (`tierLists.reportReasonHate`)
        - `"Harassment or bullying"` (`tierLists.reportReasonHarassment`)
        - `"Explicit or NSFW content"` (`tierLists.reportReasonExplicit`)
        - `"Illegal or dangerous content"` (`tierLists.reportReasonIllegal`)
        - `"Other violation"` (`tierLists.reportReasonOther`)
      - Notes textarea (`#report-notes`, label `"Additional details (optional)"` / `tierLists.reportReasonLabel` / `reportNotesLabel`, placeholder `"Explain what makes this content inappropriate..."` / `tierLists.reportNotesPlaceholder`, `maxLength={500}`, 3 rows).
      - Submit button: Danger button `"Submit report"` (`tierLists.reportSubmit`) / `"Submitting..."` (`tierLists.reportSubmitting`).
    - **Reports Paused view** (`!features.contentReportsOpen`): Amber `TriangleAlert` icon tile, `"Reporting is paused at the moment. Please try again later."` (`tierLists.reportPaused`), primary `"Dismiss"` button (`tierLists.dismiss`).
    - **Success view** (`status === 'success'`): Green `CheckCircle2` icon tile, `"Report submitted. Thank you for helping keep LemonDBD safe."` (`tierLists.reportSuccess`), primary `"Dismiss"` button (`tierLists.dismiss`).
    - **Already Banned view** (`status === 'already_banned'`): Amber `TriangleAlert` icon tile, `"This content was already banned and has been removed."` (`tierLists.reportAlreadyBanned`), primary `"Dismiss"` button (`tierLists.dismiss`, triggers `checkAndPurgeRevokedContent()`).
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: `"Log in"` button inside `AuthRequiredState` when visiting while signed out.

---

## /tier-lists/new

### Page & files
- Page: `app/[locale]/tier-lists/new/page.tsx` (`NewTierListPage`, reads `searchParams.edit` and `searchParams.official`, wraps in `<Suspense fallback={<TierListSkeleton />}>`)
- Route loading boundary: `app/[locale]/tier-lists/loading.tsx` (`TierListsLoading`)
- Main creator view: `components/tier-lists/creator/TierListCreator.tsx` (`TierListCreator`)
- Creator sub-components:
  - `components/tier-lists/creator/TierListCreatorParts.tsx` (`Section`, `Feedback`, `TierListBasicsSection`)
  - `components/tier-lists/creator/LadderEditor.tsx` (`LadderEditor`, `PresetSwatch`)
  - `components/tier-lists/creator/ItemSources.tsx` (`ItemSources`, `CatalogSource`, `LinksSource`, `UploadSource`)
  - `components/tier-lists/creator/CreatorItems.tsx` (`CreatorItems`)
  - `components/tier-lists/creator/CreatorPreview.tsx` (`CreatorPreview`, `CreatorPreviewModal`)
  - `components/tier-lists/creator/TierItemEditModal.tsx` (`TierItemEditModal`)
- Shared components:
  - `components/tier-lists/TierColorPicker.tsx` (`TierColorPicker` -> `react-colorful` `HexColorPicker`, `HexColorInput`)
  - `components/tier-lists/TierBadge.tsx` (`TierBadge`)
  - `components/tier-lists/TierItemTile.tsx` (`TierItemTile`)
  - `components/tier-lists/TierListCards.tsx` (`CustomTierListCard` in `disabled` preview mode)
  - `components/common/ImageUploadDropzone.tsx` (`ImageUploadDropzone`)
  - `components/smash-or-pass/creator/CoverImageCropModal.tsx` (`CoverImageCropModal`)
  - `components/common/NsfwSwitch.tsx` (`NsfwSwitch` -> `LabeledSwitch`)
  - `components/common/Toast.tsx` (`Toast`)

### Layout elements
- **Screen-reader heading `<h1>`**: `"LemonDBD - Create a tier list"` (`tierLists.creator.pageTitle`) when creating, or `"Edit details"` (`tierLists.editDetails`) when editing (`editId` or `officialSlug`).
- **Draft Restored Toast** (`components/common/Toast.tsx`, shown for 4.5s when a saved scratch draft is restored from `lemondbd_tier_list_draft`):
  - `History` icon + `"Your unfinished draft was restored."` (`tierLists.creator.draftRestored`).
  - Secondary action button `"Start over"` (`tierLists.creator.startOver`, resets draft).
  - Close `X` button (`aria-label="Dismiss"` / `tierLists.creator.closeToast`).
- **Validation & Save/Publish Error Banner (`Feedback`, `role="alert"`)**:
  - Lists any active errors with `CircleAlert` icons and auto-scrolls into view on submit:
    - `"Give your list a title."` (`tierLists.creator.titleRequired`, when `attempted && !title.trim()`)
    - `"Add at least one item."` (`tierLists.creator.itemsRequired`, when `attempted && items.length === 0 && !isCatalogOfficial`)
    - `"That image isn't allowed. Use an https:// link."` (`tierLists.invalidImage`, when `attempted && backgroundInvalid`)
    - Storage errors: `tierLists.saveFailedQuota` or `tierLists.saveFailedUnavailable`
    - Admin publish errors: `"This list is too large to publish (over {size} MB). Use image links instead of uploaded images, or remove some items."` (`tierLists.creator.publishTooLarge`, when payload > `19 MB`) or `"Couldn't publish this list. Try again."` (`tierLists.creator.publishFailed` / server error message).
- **Section 1: The Basics (`TierListBasicsSection`, collapsible `AccordionSection`, title `"The basics"` / `tierLists.creator.stepBasics`, persisted via `lemondbd_tierlist_creator_section_basics`)**:
  - **Switches Row**:
    - `NsfwSwitch`: `"Contains NSFW content"` (`tierLists.nsfw.label`).
    - **Admin-only (`isAdmin && !officialSlug`)**: `LabeledSwitch` `"Publish as an official list"` (`tierLists.creator.official`).
    - **Admin-only (`isAdmin && (official || Boolean(officialSlug))`)**: `LabeledSwitch` `"Published (visible to public)"` (`tierLists.creator.publishedLabel`, controls `is_active`).
  - **Title Input**: Label `"Title *"` (`tierLists.creator.titleLabel`), `Input` (`maxLength={120}`).
  - **Description Input**: Label `"Description"` (`tierLists.creator.descriptionLabel`), `Input` (`maxLength={200}`).
  - **Background Image Dropzone (`ImageUploadDropzone`, `aspectRatio="banner"`)**:
    - Label: `"Background image URL"` (`tierLists.creator.backgroundImageLabel`).
    - Empty state:
      - `ImagePlus` icon badge.
      - **Admin-only (`allowFileUpload={isAdmin}`)**: Secondary button `Upload` icon + `"Choose images"` (`tierLists.creator.chooseFiles`) + drag-and-drop / clipboard image file paste support.
      - URL input (`placeholder="https://..."` / `tierLists.creator.backgroundImagePlaceholder`) + commit `Check` icon button (`aria-label="Save"` / `tierLists.save`).
    - Populated preview state (`16:9` aspect-video frame):
      - Cover `Img` preview.
      - **Admin-only (`isAdmin`)**: Clicking image or hover overlay (`Crop` icon + `"Click to Crop / Reframe (16:9)"` / `tierLists.creator.cropClickPrompt`) or top-right `Crop` icon pill button (tooltip `"Crop / Reframe cover image"` / `tierLists.creator.cropCoverTitle`) opens `CoverImageCropModal`.
      - Top-right remove button: `Trash2` icon pill button (`aria-label="Remove image"` / `tierLists.creator.removeImage`).
    - Hints & validation alerts below dropzone:
      - **Admin hint**: `"An https:// link or a data:image URI. Shown behind the card in My Custom Lists."` (`tierLists.creator.backgroundImageHint`).
      - Invalid URL alert: `"That image isn't allowed. Use an https:// link."` (`tierLists.invalidImage`).
      - Blob URL pasted error: `tierLists.creator.blobUrlUnsupportedAdmin` (for admins) or `tierLists.creator.blobUrlUnsupportedUser` (for non-admins).
      - Oversized/failed file upload error: `"Skipped files: 1. They weren't images, or stayed too large even when shrunk."` (`tierLists.creator.uploadSkipped`).
- **Section 2: Tiers (`LadderEditor`, collapsible `AccordionSection`, title `"Tiers"` / `tierLists.creator.stepTiers`, persisted via `lemondbd_tierlist_creator_section_tiers`)**:
  - **Presets Selector**:
    - Label: `"Start from"` (`tierLists.creator.presetsLabel`).
    - Mobile (`sm:hidden`): `CustomDropdown` with color swatch strips (`PresetSwatch`).
    - Desktop (`hidden sm:flex`): `ToggleChip` buttons with `PresetSwatch`:
      - `"S to F"` (`tierLists.creator.presets.classic`: `S, A, B, C, D, F`)
      - `"S to C"` (`tierLists.creator.presets.short`: `S, A, B, C`)
      - `"1 to 5"` (`tierLists.creator.presets.numbers`: `1, 2, 3, 4, 5`)
      - `"Love it to hate it"` (`tierLists.creator.presets.feelings`: `"Love it"`, `"Like it"`, `"Meh"`, `"Hate it"` / `tierLists.creator.feelings.*`)
  - **Ordered Tier Rows List (`<ol>`, up to 20 tiers `TIER_LIST_LIMITS.maxTiers`)**: each row (`<li>`) contains:
    - Drag handle (`TileButton` with `GripVertical` icon, `aria-label="Tier {label}"` / `tierLists.tierAria`, reorders rows via `useDragReorder`).
    - Tier badge preview button (`TileButton` with `TierBadge`, `aria-expanded`, `aria-label="Change the color of tier {label}"` / `tierLists.creator.tierColorAria`) + clickable middle row bar to toggle the row's expandable palette drawer.
    - Delete tier button (`X` icon, `aria-label="Remove tier {label}"` / `tierLists.creator.removeTierAria`, disabled when `tiers.length <= 1`).
    - **Expandable Palette Drawer** (open for at most one tier at a time, auto-opens on newly added tier):
      - 8 preset `ColorSwatch` buttons (`s, a, b, c, d, e, f, neutral`, `aria-label="Use color {NAME}"` / `tierLists.colorSwatchAria`).
      - Custom `TierColorPicker` button: conic-gradient rainbow `ColorSwatch` (`aria-label="Custom color"` / `tierLists.customColor`, shows `Check` mark when hex color active); clicking expands inline `HexColorPicker` saturation/hue canvas + `HexColorInput` (`#RRGGBB`) + optional `Pipette` icon button (`aria-label="Pick a color from the screen"` / `tierLists.pickFromScreen`, rendered when browser supports `window.EyeDropper`).
      - Label input: `"Label"` (`tierLists.tierLabel`), `Input` (`maxLength={32}`, `aria-label="Label of tier {index}"` / `tierLists.creator.tierLabelAria`).
      - Tier image input: `"Tier image"` (`tierLists.tierBackgroundImage`), `Input` (`placeholder="https://..."` / `tierLists.tierBackgroundImagePlaceholder`), with hint `"An https:// link or a data:image URI. Replaces the color and letter with this picture."` (`tierLists.tierBackgroundImageHint`) or red error `"That image isn't allowed. Use an https:// link."` (`tierLists.invalidImage`).
  - **Add Tier Button**: Secondary button with `Plus` icon + `"Add tier"` (`tierLists.addTier`, adds tier labeled `"New"` / `tierLists.newTierLabel`, disabled at 20 tiers).
- **Section 3: Items (`Section` title `"Items"` / `tierLists.creator.stepItems`, persisted via `lemondbd_tierlist_creator_section_items`, hidden when editing a non-custom catalog official list)**:
  - **Item Sources (`ItemSources`)**:
    - Boxed `Tabs` bar (`aria-label="Where to add items from"` / `tierLists.creator.itemSourceAria`):
      1. `"From the game"` (`tierLists.creator.tabCatalog`, `Library` icon) — default tab.
      2. `"Paste links"` (`tierLists.creator.tabLinks`, `ClipboardPaste` icon).
      3. **Admin-only (`isAdmin`)**: `"Upload"` (`tierLists.creator.tabUpload`, `Upload` icon).
    - **Tab 1: `"From the game"` (`CatalogSource`)**:
      - Category selector (`survivors`, `killers`, `survivor_perks`, `killer_perks`, `maps` with labels from `tierLists.kinds.*`): `ToggleChip` pills on desktop (`hidden sm:flex`), `CustomDropdown` on mobile (`sm:hidden`).
      - Search input: `SearchInput` (`placeholder="Search..."` / `tierLists.creator.catalogSearch`, `aria-label="Search the catalog"` / `tierLists.creator.catalogSearchAria`).
      - Select/Clear All button: Secondary button `"Select all shown"` (`tierLists.creator.selectAll`) or `"Clear"` (`tierLists.creator.clearSelection` when all visible selectable items are selected).
      - Scrollable catalog tile grid (`h-96 sm:h-136`, infinite-scroll chunked by 40 items with `IntersectionObserver` + `Spinner`):
        - Loading state: `Spinner` + `"Loading the catalog..."` (`tierLists.creator.catalogLoading`).
        - Each item is a `TileButton` wrapping `TierItemTile` (`size="lg"`, `showName`, `shape="wide"` for maps, `"square"` otherwise). Selected or already-added items display a red circle badge with `Check` icon (`sr-only` `"Added"` / `tierLists.creator.alreadyAdded` and `disabled` when already in the list).
      - Bottom CTA: Primary button with `Plus` icon + `"Add selected ({count})"` (`tierLists.creator.addSelected`, disabled when `selected.size === 0`).
    - **Tab 2: `"Paste links"` (`LinksSource`)**:
      - Name field: Label `"Name *"` (`tierLists.itemName`), `Input` (`maxLength={80}`).
      - Image URL field: Label `"Image URL"` (`tierLists.itemImage`), `Input` (`placeholder="https://..."` / `tierLists.itemImagePlaceholder`), hint `"An https:// link or a data:image URI. Leave it empty for a text tile."` (`tierLists.itemImageHint`).
      - Validation alert (`role="alert"`): `"Give the item a name."` (`tierLists.itemNameRequired`) or `"That image isn't allowed. Use an https:// link."` (`tierLists.invalidImage`).
      - Live Preview box (`aria-live="polite"`):
        - Heading `"Preview"` (`tierLists.creator.linkPreviewHeading`).
        - Renders `TierItemTile` (`size="lg"`) + `Spinner` while probing image URL, or `ImagePlus` placeholder icon when empty.
        - Status caption: `"Paste an image link to see it here."` (`linkPreviewEmpty`), `"Checking the image..."` (`linkPreviewLoading`), `"Image found. This is how the tile will look."` (`linkPreviewOk`), `"That link didn't load as an image. The tile will show initials instead."` (`linkPreviewFailed`), or `"That image isn't allowed. Use an https:// link."` (`invalidImage`).
      - Bottom CTA: Primary button with `Plus` icon + `"Add an item"` (`tierLists.addItemTitle`, disabled when name is empty).
    - **Tab 3: `"Upload"` (`UploadSource`, admin only)**:
      - Dashed dropzone: `ImagePlus` icon tile, heading `"Drop images here"` (`tierLists.creator.dropTitle`), subtitle `"Images are kept in this browser."` (`tierLists.creator.dropSubtitle`), primary button `Upload` icon + `"Choose images"` (`tierLists.creator.chooseFiles`, opens multi-file `<input type="file" accept="image/*" multiple>`).
      - Processing status: `"Processing images..."` (`tierLists.creator.processing`).
      - Skipped alert (`role="alert"`): `"Skipped files: {count}. They weren't images, or stayed too large even when shrunk."` (`tierLists.creator.uploadSkipped`).
  - **Cap Warning** (when items exceed `400` / `TIER_LIST_LIMITS.maxItems`):
    - Amber notice: `"The list is full, so {count, plural, one {# item wasn't} other {# items weren't}} added."` (`tierLists.creator.itemsSkipped`).
  - **Added Items Grid (`CreatorItems`)**:
    - Header row: centered `<h3>` `"Items: {count} / 400"` (`tierLists.creator.itemsHeading`) + right secondary button with `Trash2` icon + `"Remove all"` (`tierLists.creator.removeAll`, shown when `items.length > 0`).
    - Empty state (`items.length === 0`): compact `EmptyState` `"Nothing to rank yet. Upload images, paste links or pick from the game."` (`tierLists.creator.noItems`).
    - Items grid (`<ul>`): each item `<li>` has:
      - Square tile with `Img` or 2-letter uppercase initials fallback.
      - Hover edit overlay button covering the tile (`Pencil` icon, `aria-label="Edit {name}"` / `tierLists.creator.editItemAria`, `sr-only` `"Edit item"` / `tierLists.creator.editItem`, opens `TierItemEditModal`).
      - Top-right remove pill button (`X` icon, `aria-label="Remove {name}"` / `tierLists.creator.removeItemAria`).
      - Inline rename `<input>` underneath (`maxLength={80}`, `aria-label="Name of {name}"` / `tierLists.creator.renameItemAria`).
  - **Browser Storage Estimate** (shown when any item uses an inline `data:` image):
    - `"Images use about {size} of browser storage."` (`tierLists.creator.storageUsage`) + amber warning when `bytes > 2.5 MB`: `"That's a lot for browser storage. Consider fewer or smaller images."` (`tierLists.creator.storageWarning`).
- **Bottom Action Bar**:
  - Secondary button: `"Preview"` (`tierLists.creator.previewHeading`, opens `CreatorPreviewModal`).
  - Primary submit button (`data-tier-create`):
    - Creating custom list: `"Create"` (`tierLists.creator.create`).
    - Editing custom list (`?edit=<id>`) or editing official list (`?official=<slug>`): `"Save"` (`tierLists.save`).
    - Admin creating official list (`official` switch ON): `"Publish"` (`tierLists.creator.publish`).
    - Admin while publishing/saving to server (`publishingNow`): `"Publishing..."` (`tierLists.creator.publishing`, disabled).

### Modes / states
- **Suspense / Auth loading**: `<Suspense>` shows `TierListSkeleton`; while `authLoading` is true, renders a `min-h-100` placeholder.
- **Unauthenticated state (`!isAuthenticated`)**:
  - Renders `AuthRequiredState` (`variant="dashed"`) with `LockIcon`, `"Log in required"` (`tierLists.authRequiredTitle`), `"You must be logged in to create, edit, or view custom tier lists."` (`tierLists.authRequiredDesc`), and `"Log in"` button (`streaks.logIn`, opens `AuthModal`).
- **Creator modes (via query params & admin switches)**:
  1. **New Custom List (`/tier-lists/new`)**: starts from `classic` (`S`–`F`) preset, autosaves scratch draft to `localStorage` (`lemondbd_tier_list_draft`), restores unfinished draft with a `Toast` on revisit, creates a local custom list and navigates to `/${locale}/tier-lists/custom/${id}`.
  2. **Edit Custom List (`/tier-lists/new?edit=<id>`)**: seeds form from `storeState.custom[editId]` without touching the scratch draft, normalizes existing placements on save, and navigates back to `/${locale}/tier-lists/custom/${editId}`.
  3. **Admin Publish New Official List (`/tier-lists/new` with `"Publish as an official list"` switch ON)**: reveals `"Published (visible to public)"` switch, posts to `createOfficialTierList`, and navigates to `/${locale}/tier-lists/${created.slug}`.
  4. **Admin Edit Official List (`/tier-lists/new?official=<slug>`)**:
     - For `custom`-kind official lists: seeds title, description, cover image, NSFW, `is_active`, ladder tiers, and custom items.
     - For catalog-backed official lists (`survivor_perks`, `killer_perks`, `survivors`, `killers`, `maps`): hides **Section 3 (Items)** (`isCatalogOfficial = true`) so only basics and ladder tiers are edited.
- **Not Found / Unauthorized Edit state**:
  - Shown when `?edit=<id>` does not exist in `localStorage`, or `?official=<slug>` is visited by a non-admin (`!isAdmin`) or when the official slug does not exist: renders `EmptyState` with `SearchX` icon, title `"Custom list not found"` (`tierLists.customNotFoundTitle`), subtitle `"Custom lists live in this browser only. It may have been deleted, or created on another device."` (`tierLists.customNotFoundSubtitle`).

### Modals & drawers (file)
- **CreatorPreviewModal** (`components/tier-lists/creator/CreatorPreview.tsx`):
  - Trigger: Bottom `"Preview"` button.
  - Content:
    - `Modal` (`size="5xl"`, title `"Preview"` / `tierLists.creator.previewHeading`, close `X` button `"Close"` / `characterDetail.close`).
    - Card preview section: heading `"How it'll look in My Custom Lists"` (`tierLists.creator.cardPreviewHeading`) + inert `CustomTierListCard` (`disabled`).
    - Board preview section: `<h3>` `{title || "Untitled tier list"}`, non-interactive tier rows (`Surface` + `TierBadge`), and `"Unranked"` (`tierLists.unranked`) pool box showing all `TierItemTile` items (or `"Nothing to rank yet. Upload images, paste links or pick from the game."` / `tierLists.creator.noItems`).
- **TierItemEditModal** (`components/tier-lists/creator/TierItemEditModal.tsx`):
  - Trigger: Clicking the `Pencil` edit overlay on any added item tile in `CreatorItems`.
  - Content:
    - `Modal` (`size="md"`, title `"Edit item"` / `tierLists.creator.editItem`, close `X` button).
    - Centered live preview: square image (`Img`) or 2-letter uppercase initials box, `<h3>` item name, caption `"Preview"` (`tierLists.creator.previewHeading`), and soft button with `ImageOff` icon + `"Remove image"` (`tierLists.creator.removeImage`, shown when an image URL is set).
    - Form fields:
      - `"Name *"` (`tierLists.itemName`) `Input` (`maxLength={80}`).
      - `"Image URL"` (`tierLists.itemImage`) `Input` (`placeholder="https://..."` / `tierLists.itemImagePlaceholder`), with inline validation error `"That image isn't allowed. Use an https:// link."` (`tierLists.invalidImage`) or `"Give the item a name."` (`tierLists.itemNameRequired`).
    - Footer: Primary button with `Check` icon + `"Save"` (`tierLists.save`, disabled if name is empty or URL is invalid).
- **CoverImageCropModal** (`components/smash-or-pass/creator/CoverImageCropModal.tsx`, admin only):
  - Trigger: Clicking the cover image preview or the `Crop` button inside `ImageUploadDropzone` (`isAdmin`).
  - Content:
    - `Modal` (`size="3xl"`, `aspectRatio="banner"` `16:9`), title `"Crop & Frame Cover Image"` (`smashOrPass.cropModal.title`), subtitle `"Drag to reposition, use mouse wheel or zoom slider to scale up any specific part (up to 500%)."` (`smashOrPass.cropModal.subtitle`).
    - Interactive `16:9` crop viewport with 3x3 rule-of-thirds grid overlay and bottom-left badge `"Drag to pan • Wheel to zoom ({zoom}%) • 16:9 banner"` (`smashOrPass.cropModal.dragHint`).
    - Fallback inside viewport (if image fails or is empty): `ImageIcon`, `"Unable to display image from external URL"` / `"No image URL specified"`, `"Upload Local File"` button.
    - Controls bar (`Surface`): `ZoomOut` button, `{zoom}%` indicator, range slider (`1`–`5`, step `0.05`), `ZoomIn` button, `"Reset"` button (`RotateCcw` icon), and admin `"Upload File"` button (`Upload` icon + hidden file input).
    - CORS warning box (when external host blocks canvas export): `TriangleAlert` icon, `"Third-party image host blocked canvas export"` (`smashOrPass.cropModal.corsTitle`), `"Upload File"` button, and `"Use Uncropped URL"` button (`smashOrPass.cropModal.useUncropped`).
    - Footer buttons: Ghost `"Cancel"` (`smashOrPass.cropModal.cancel`) and Primary `Check` icon + `"Apply Crop"` (`smashOrPass.cropModal.applyCrop`).
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: `"Log in"` button inside `AuthRequiredState` when visiting `/tier-lists/new` while signed out.
