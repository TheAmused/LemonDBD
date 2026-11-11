# Multimedia Thumbnails & Static Optimization Design

**Date:** 2026-11-11
**Branch:** `feature/multimedia-thumbnails-optimization`
**Status:** Approved

## 1. Goals & Scope

Eliminate oversized bitmap transfers and excessive client-side image decoding across LemonDBD by establishing an end-to-end, automatic thumbnail pipeline covering:

1. **Backend static raster assets (`backend/app/static/`)**: `avatars`, `maps`, `chapters`, `realms`, `icons`, `smash-or-pass`, and `tier-lists`, plus wiring all frontend grid/list/picker views to use thumbnails instead of full-resolution originals.
2. **Bundled frontend images (`frontend/public/images/`)**: pre-generated WebP thumbnails for tarot cards, streak mode cards, ID Please tiles, and randomizer illustrations.
3. **Community & user-submitted images**: client-side upload downscaling across both Tier Lists and Smash or Pass (including candidate portraits and cover crops), plus optional backend ingestion of admin-published `data:image/*` assets.
4. **Zero-setup automation for coworkers**: static assets under `backend/app/static/` are mostly gitignored and bind-mounted at runtime, while `frontend/public/images/` is tracked in Git. Running `docker compose up -d --build`, `up.ps1`, `up.sh`, or `npm run build` / `npm run dev` must generate all thumbnails automatically with zero manual steps.

Non-goals / explicit exclusions:
- `backend/app/static/audio/*.mp3` (audio streams, not raster images)
- `backend/app/static/email/logo.png` (52x68, 6.3 KB)
- Private bug report screenshots under `bug_reports` (already capped at 2560 px WebP and gated by auth)
- Server-side proxying/caching of arbitrary third-party `https://` URLs pasted by users (to avoid open-proxy bandwidth/storage abuse; external URLs stay direct).

---

## 2. Backend Thumbnail Architecture

### 2.1 Unified Thumbnail Engine (`backend/app/utils/thumbnails.py`)

Generalize `serve_thumb` and add a strict category/size registry so arbitrary widths or folders cannot be used for disk-fill DoS:

| Category (`subdir`) | Allowed Widths (px) | Aspect Cap | Notes / Typical Savings |
| :--- | :--- | :--- | :--- |
| `avatars` | `128`, `256` | `2.0` | `killers/`, `survivors/`, `rosters/` (512x512 / 620x1000 -> 128 px for small tiles, 256 px for grids) |
| `maps` | `320` | `2.0` | `callouts/` (up to 2000x2200 -> ~15–25 KB WebP) |
| `chapters` | `480` | `1.0` | `chapters/*.webp` (up to 3840x2160 / 2.17 MB -> ~15–25 KB WebP) |
| `realms` | `320` | `1.5` | `realms/*.webp` (526x350 / up to 297 KB -> ~10–15 KB WebP) |
| `icons` | `96`, `128` | `1.0` | `addons/`, `items/`, `killers/`, `offerings/`, `powers/`, `survivors/` (256x256 -> 4x–7x less decoded RGBA memory in 300+ item grids) |
| `smash-or-pass` | `256`, `480` | `2.0` | `covers/`, placeholders |
| `tier-lists` | `480` | `1.0` | banners |
| `community` | `128`, `256`, `480` | `2.0` | maps to `static/uploads/community/` for admin-ingested community assets |

Encoding and caching guarantees:
- **Path containment**: `root in source.parents` and `_thumbs` not in `source.relative_to(root).parts`; only `.webp`, `.png`, `.jpg`, `.jpeg` sources accepted (404 otherwise).
- **Alpha & mode safety**: convert `P` / `LA` / palette-transparent modes to `RGBA` (opaque modes to `RGB`) before `Image.thumbnail(..., Image.Resampling.LANCZOS)` and `save(..., "WEBP", quality=82, method=4)`.
- **Cache path & freshness**: `<static>/<subdir>/_thumbs/<width>/<rel>.webp`, `mtime_ns` matched to the source file (`os.utime`), atomic temp file + `os.replace`, per-target `threading.Lock`, `Cache-Control: public, max-age=86400`.

### 2.2 Routes & Nginx (`backend/app/routes/thumbs.py`, `nginx/default.conf`)

- **New unified route**: `GET /api/v1/thumbs/<string:category>/<int:width>/<path:rel>`
  - Validates `(category, width)` against the allow-list (404 if disallowed) and delegates to `serve_thumb`.
- **Legacy aliases preserved**:
  - `GET /api/v1/avatars/thumb/<path:rel>` -> `serve_thumb("avatars", rel, 256, aspect=2.0)`
  - `GET /api/v1/maps/thumb/<path:rel>` -> `serve_thumb("maps", rel, 320, aspect=2.0)`
- **Nginx (`nginx/default.conf`)**:
  - Update both HTTP and HTTPS server blocks from `^/api/v1/(avatars|maps)/thumb/` to `^/api/v1/(thumbs|(avatars|maps)/thumb)/` using `zone=static_limit burst=180 nodelay` so grid loads never consume `api_limit`.

### 2.3 Automatic Warming & Lifecycle Hooks

Because `./backend/app/static` is bind-mounted at runtime in `docker-compose.base.yml` and populated outside Git:
1. **`warm_all_thumbs(static_root=None, prune_orphans=False, workers=4)`** in `backend/app/utils/thumbnails.py`:
   - Walks every allow-listed category present under `static_root`, skips up-to-date thumbnails via `_is_current`, generates missing/stale thumbnails in a bounded `ThreadPoolExecutor`, and optionally removes orphaned files in `_thumbs/` whose source path no longer exists (cleaning legacy `.webp` files alongside `<name>.<ext>.webp`).
   - Exposes `warm_all_thumbs_async(static_root)` guarded by a process-wide lock/flag.
2. **CLI script `backend/scripts/warm_thumbnails.py`**:
   - Supports `--prune` and `--quiet`; uses non-blocking `fcntl.flock` on `/tmp/lemon_warm_thumbs.lock` (POSIX) so overlapping runs never collide.
3. **Container startup (`backend/entrypoint.sh`)**:
   - When starting the web server (`gunicorn`), launches `python3 scripts/warm_thumbnails.py --prune --quiet &` in the background before `exec "$@"`, so Docker's 15s `start_period` healthcheck passes immediately while all present static assets are warmed in the background. Any HTTP request arriving before warming completes falls back seamlessly to on-demand `serve_thumb` (sharing per-target locks).
4. **Post-import & seeder hooks**:
   - Trigger `warm_all_thumbs_async()` at the end of `DatabaseExportImportService.import_database` (when `static_dir` receives imported assets) and after `ensure_roster_assets`.
5. **`.gitignore`**:
   - Ignore `backend/app/static/**/_thumbs/` across all subdirectories.

---

## 3. Frontend Thumbnail Resolution & Component Wiring

### 3.1 Centralized Helper (`frontend/src/utils/thumbUrl.ts`)

Provide pure URL helpers (SSR + browser safe via `getBackendBaseUrl()`):
- `getThumbUrl(category, rawPathOrUrl, width, backendBase?)`: rewrites local `/static/<category>/<rel>` raster paths (`.webp/.png/.jpg/.jpeg`) to `/api/v1/thumbs/<category>/<width>/<rel>`; passes through external `https://`, `data:`, and `blob:` URLs untouched.
- Convenience wrappers:
  - `getAvatarThumbUrl(backendBase, char, isSurvivor, width = 256)` (re-exported / kept compatible in `character-detail/types.tsx`)
  - `avatarThumbFromPath(rawPath, width = 128, backendBase?)`
  - `getMapThumbSrc(map, backendBase?)` (`320` px)
  - `getChapterThumbSrc(chapter, backendBase?)` (`480` px)
  - `getRealmThumbSrc(rawPath, backendBase?)` (`320` px)
  - `getIconThumbUrl(rawPathOrUrl, width = 128, backendBase?)`
  - `publicImageThumb(publicPath)`: maps `/images/<subpath>` to `/images/_thumbs/<subpath>` (for `.webp` assets; or `<subpath>.webp` if non-WebP) for bundled assets that have pre-generated thumbnails.

### 3.2 Component & Call-Site Matrix

| View / Component | Asset Type | Target Variant |
| :--- | :--- | :--- |
| Characters Hub (`CharacterCard`) | Avatar | `256` px thumb (`onError` falls back to full) |
| Smash or Pass (`CharacterCard`, `CharacterStatsModal`, `SmashLeaderboardParts`, `PersonaBreakdown`) | Avatar / Cover | `256` px thumb on swipe card; `128` px on stats/leaderboard/persona; `480` px on `/static/smash-or-pass/` covers |
| Tier Lists (`charactersToItems`, `mapsToItems`, `perksToItems`, `TierListCards`) | Avatar, Map, Perk, Banner | `128` px avatar, `320` px map (`fullImage` kept), `128` px icon, `480` px banner |
| Streaks (`CharacterRosterGrid`, `GauntletBoard`, `ActiveTargetStageParts`, `KillerPickerGrid`, `IdPleaseTiles`, `KillerRosterGrid`, `ChaosPerkPoolModal`, `HistoryPerkPoolPanel`) | Avatar & Icon | `128` px avatar & `128` px icon |
| Onboarding (`ChapterCard`, `CharacterOnboardingWizardParts`) | Chapter, Avatar | `480` px chapter banner, `128` px avatar |
| Build Generator (`SlotReelColumnDesktop`, `SlotReelRowMobile`, `useWheelStage`, `PerkCard`, `PerkDiamondSlot`, `Thumb`) | Avatar, Icon | `128` px avatar; `96` px icon in `Thumb` `sm`/`md` & `PerkDiamondSlot`, `128` px in `PerkCard`/reels/wheel |
| Profile Showcase (`ShowcaseCharacterModal`), `ImagePreloadProvider` | Avatar, Icon | `128` px thumb |
| Detail / Fullscreen Views (`CharacterHeroAvatar`, `Model3DModal`, `FullscreenMapEngine`, `PerkModal`, `EquipmentDetailModal`) | Avatar, Map, Icon | **Full resolution** (unchanged) |

---

## 4. Bundled Frontend Assets (`frontend/public/images/`)

- Add `frontend/scripts/build-public-thumbs.mjs` using `sharp` (already in `frontend/package-lock.json` v0.35.5; declared in `devDependencies` so `dependencyGuards.test.ts` stays clean and the standalone Docker runner stays slim).
- Generates incremental (`mtimeMs`-checked, atomic, orphan-pruning) WebP thumbnails under `frontend/public/images/_thumbs/`:
  - `tarot/*.webp` & `tarot/faces/*.webp` -> `320` px wide
  - `streaks/modes/*.webp` -> `360` px wide
  - `streaks/*.webp` & `streaks/id-please/*.webp` -> `256` px wide
  - `randomizer/*.webp` -> `400` px wide
- Wired in `frontend/package.json`:
  - `"thumbs": "node scripts/build-public-thumbs.mjs"`
  - `"prebuild": "npm run thumbs && npm run lint"` (automatically executes in `frontend/Dockerfile` during `docker compose up -d --build` and `up.ps1`/`up.sh`)
  - `"predev": "npm run thumbs"`
- Gitignore `frontend/public/images/_thumbs/`.

---

## 5. Community & User-Submitted Media

1. **Shared client-side raster optimizer (`frontend/src/utils/imageResize.ts`)**:
   - Consolidate canvas decode + resize + WebP/PNG size-capped encoding shared by `fileToTileImage` (`tierLists/imageFiles.ts`) and `processImageFile` (`ImageUploadDropzone.tsx`).
   - Presets: `tile` (`[160, 128, 96]` px), `portrait` (`[512, 384, 256]` px), `banner` (`[800, 600, 400]` px), preserving animated GIFs under the 131,072-char cap.
   - Add file upload + `portrait` downscaling (`512` px WebP) to Smash or Pass [`EntityEditor`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/smash-or-pass/creator/EntityEditor.tsx), default `ImageUploadDropzone` banners to `800` px, and ensure [`CoverImageCropModal`](file:///c:/Users/bezie/Desktop/proje/LemonDBD/frontend/src/components/smash-or-pass/creator/CoverImageCropModal.tsx) exports bounded `<= 800x450` WebP.
2. **Backend official community ingest (`backend/app/services/community_media.py`)**:
   - When admins publish/update official Tier Lists or Smash or Pass rosters containing `data:image/*` blobs, decode/validate with Pillow, re-encode to WebP (`max 800` px for covers, `max 512` px for items/entities), store under `static/uploads/community/`, and rewrite the saved URL to `/static/uploads/community/<hash>.webp` so it benefits from HTTP caching and `/api/v1/thumbs/community/<width>/<hash>.webp`.

---

## 6. Verification & Guard Compliance

- **Backend unit tests** (`backend/tests/unit/core/test_static_assets_and_thumbnails.py`):
  - Category/width allow-list enforcement (404 on unknown category or disallowed width)
  - Legacy `/api/v1/avatars/thumb/...` and `/api/v1/maps/thumb/...` compatibility
  - Palette/RGBA transparency preservation in `_write_thumb`
  - `warm_all_thumbs` generation + incremental skip + orphan pruning
  - Community `data:image/*` ingest service tests
- **Frontend unit & guard tests**:
  - `thumbUrl.ts` & `imageResize.ts` unit tests
  - Update existing tests referencing avatar/map thumb URLs (`avatarThumbUrl.test.ts`, `mapCard.test.ts`, `publicMapViewer.test.ts`, `tierLists` / `streaks` / `onboarding` tests)
  - Verify `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` (including `check:built`), and `pytest --testmon tests/unit tests/guards` all pass.
