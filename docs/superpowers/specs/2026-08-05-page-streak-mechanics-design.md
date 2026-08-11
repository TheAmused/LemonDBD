# Page Streak Mechanics — Design

**Date:** 2026-08-05
**Branch:** `feature/page-streak-mechanics`
**Status:** Approved
**Builds on:** `docs/superpowers/specs/2026-08-05-streaks-design.md` (the Streaks scaffold, already merged)
**Mockups:** https://claude.ai/code/artifact/85175ea2-64e3-4f7a-beaf-273643a59830

## Goal

Turn the Page streak placeholder into the working challenge: pick a killer, build
four perks from the current perk page, report the match result, advance a page on
a win, restart from page one on a loss — with progress persisted per killer so a
run can span days.

## The challenge

Perks in Dead by Daylight sit on pages in the loadout grid. The challenge is to
win one match using perks from page 1, then a match with perks from page 2, and
so on until every page has been cleared. This is a killer-only challenge and can
be run on any killer, independently.

## Scope

In scope:

- Killer roster with per-killer progress and a completed marker.
- Global "perks I don't own" exclusion list that shrinks the pool and the page count.
- Run lifecycle: start (freezes the page layout), pick 4 perks, confirm build,
  report win/loss, advance or reset.
- Per-attempt history that survives resets, plus a personal best page.
- Backend persistence in SQLite with server-side validation.
- Six animations, all disabled under `prefers-reduced-motion`.

Out of scope:

- Survivor streaks (the Survivor tab stays empty).
- History streak and Chaos streak (still "Coming soon").
- Per-killer exclusion lists — one global list only (see Decisions).
- Editing or deleting history entries.
- Any change to the perk scraper or the wiki data source.

## Domain data — verified against the live database

Numbers below were read from the running instance on 2026-08-05 and drive
several decisions:

- **133 killer perks** (`/api/v1/perks?category=Killer`). At 15 per page that is
  **9 pages**, the last holding 13.
- **40 killers.** `/api/v1/characters?category=Killer` returns 51 entries, but it
  is polluted with powers and items ("Bear Traps"). The clean roster is the set
  of distinct `character` values across killer perks — 41 values, minus the
  pseudo-character `General` that owns the shared perks.
- The perk grid page convention already exists in this project:
  `PerkGenerator.tsx` computes `page = floor(indexInSorted / perksPerPage) + 1`
  over the role's perks sorted by `name.localeCompare`. Page streak reuses that
  definition so both features agree on what "page 4" means.
- `generator_settings` carries `total_pages`, `perks_per_page` (15) and
  `last_page_perks`. Page streak reads **`perks_per_page` only**; its page count
  is always derived from the actual pool, never from `total_pages`.

The database trails the live game (the user counts more killers in-game than the
wiki data provides). Nothing in this design hardcodes a roster or page count, so
a future data refresh corrects both automatically.

## Decisions

Each of these was chosen over stated alternatives:

1. **Pages are derived from the perk pool, not configured.** Excluding perks
   shifts the remaining ones up and reduces the page count. A short last page is
   fine.
2. **One global exclusion list**, not per killer. Perk ownership is technically
   per-killer in game, but a per-killer list means walking 133 perks before every
   new killer, which kills the entry point.
3. **The page layout is frozen when a run starts.** A run spans days; if editing
   the exclusion list or re-scraping the wiki could renumber pages mid-run,
   "cleared pages" would stop meaning anything.
4. **A loss keeps the history.** The attempt counter increments and progress
   returns to page 1, but past builds and the best page reached remain. Wiping
   everything leaves an empty panel and no reason to return.
5. **A short page yields a short build.** If the last page has 2 perks after
   exclusions, the build is 2 perks. Borrowing from cleared pages would break the
   one rule the challenge has.
6. **Several killers can be in progress at once.** Progress is per killer by
   construction; forcing a single active run would need an extra lock and buys
   nothing.

## Run lifecycle

```
no run ──start──▶ in_progress (page 1)
                     │
        confirm build + win ──▶ next page ──▶ … ──▶ last page won ──▶ completed
                     │
        confirm build + loss ──▶ attempt + 1, back to page 1
                     │
                  reset (manual, confirmed) ──▶ attempt + 1, back to page 1

completed ──reset (manual, confirmed)──▶ in_progress (page 1), new snapshot
```

Rules:

- Starting a run snapshots the ordered, post-exclusion perk pool and its page
  split. The snapshot date is shown in the run header.
- On a page, the player selects exactly 4 perks from that page — or all of them
  if the page holds fewer than 4 — and confirms the build. Result buttons do not
  exist until the build is confirmed.
- A win advances to the next page. Winning the last page completes the run and
  marks the killer done on the roster.
- A loss returns to page 1 and increments the attempt counter. `best_page` keeps
  the furthest page ever reached on that killer.
- A manual reset behaves like a loss and is available on completed killers too.
  It requires a confirmation step.

## Data model

Three new tables, created in `backend/app/services/db_service.py` alongside the
existing ones:

**`page_streak_excluded_perks`** — the global exclusion list.

| Column | Type | Notes |
|---|---|---|
| `perk_name` | TEXT PRIMARY KEY | matches `perks.name` |

No versioning: in-progress runs are protected by their snapshot.

**`page_streak_runs`** — one row per killer, the single source of truth for that
killer's state.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `killer` | TEXT UNIQUE NOT NULL | the `character` value from killer perks |
| `status` | TEXT NOT NULL | `in_progress` \| `completed` |
| `attempt` | INTEGER NOT NULL DEFAULT 1 | increments on loss and manual reset |
| `current_page` | INTEGER NOT NULL DEFAULT 1 | |
| `best_page` | INTEGER NOT NULL DEFAULT 0 | furthest page cleared, all attempts |
| `pages_json` | TEXT NOT NULL | frozen snapshot: array of pages, each an array of perk names |
| `snapshot_at` | TIMESTAMP | when the layout was frozen |
| `created_at` / `updated_at` | TIMESTAMP | |

**`page_streak_page_logs`** — history, one row per reported result.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `run_id` | INTEGER NOT NULL | FK → `page_streak_runs(id)` ON DELETE CASCADE |
| `attempt` | INTEGER NOT NULL | so history survives resets |
| `page_number` | INTEGER NOT NULL | |
| `perks_json` | TEXT NOT NULL | the confirmed build |
| `result` | TEXT NOT NULL | CHECK (`win`, `loss`) |
| `timestamp` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

## Backend

`PageStreakService` in `backend/app/services/page_streak_service.py`, routes in
`backend/app/routes/page_streak.py`, following the `ChallengeService` /
`challenges.py` pattern including the app-config service injection used by the
existing tests.

Service responsibilities:

- Build the killer roster from distinct `character` values on killer perks,
  excluding `General`.
- Compute the page split: killer perks minus exclusions, sorted by name, chunked
  by `perks_per_page` from `generator_settings`.
- Own the run lifecycle and write history.

Endpoints under `/api/v1/page-streak`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/roster` | killers with status, current page, page count, best page |
| GET | `/excluded-perks` | the global list plus the resulting pool and page count |
| PUT | `/excluded-perks` | replace the list |
| GET | `/run?killer=X` | snapshot, current page, attempt, best page, history |
| POST | `/run/start` | `{killer}` → creates the run and freezes the snapshot |
| POST | `/run/result` | `{killer, page, perks[], result}` → advance or reset |
| POST | `/run/reset` | `{killer}` → manual reset |

**The backend is the only place that orders perks and splits pages.** The
frontend never recomputes a page split — it renders the snapshot the API returns,
and the exclusion modal shows the page count the API reports. This removes any
chance of the two disagreeing, which matters because Python's default string sort
and JavaScript's `localeCompare` do not order punctuation and case identically
(`A Nurse's Calling`, `Hex: Ruin`, `Friends 'til the End` are exactly the kind of
names where they diverge).

Concretely, the service sorts with `sorted(perks, key=lambda p: p["name"])` —
plain code-point order, deterministic and stable. It may differ slightly from the
Perk Generator's `localeCompare` ordering for punctuated names; that is accepted,
because a run's pages come from its own frozen snapshot and never from a
recomputation elsewhere.

**Validation is server-side, not merely in the UI.** `/run/result` rejects a
request whose `page` is not the run's current page, whose perks are not all on
that page in the snapshot, or whose perk count is wrong (4, or the page size when
the page is shorter). History is the one thing here that cannot be reconstructed,
so it must not be allowed to drift from the run state.

## Frontend

Routes extend the existing scaffold:

| Route | Content |
|---|---|
| `/[locale]/streaks/killer/page-streak` | killer roster (replaces the placeholder) |
| `/[locale]/streaks/killer/page-streak/[killer]` | the run view |

The exclusion list is a modal opened from the roster, mirroring
`CharacterPoolModal` in the Gauntlet — it is a setting, not a place.

Components in `frontend/src/components/streaks/page-streak/`:

- `KillerRosterGrid` — cards with three states: untouched, in progress (progress
  bar), completed (green check).
- `ExcludedPerksModal` — all 133 killer perks with checkboxes **and a search
  field** (a list that long is unusable without one), a counter, and the
  resulting page count.
- `RunHeader` — killer portrait, percentage complete, attempt number, best page,
  snapshot date.
- `PerkPageGrid` — the current page, 5 per row. **The perk icon is the primary
  element**: a diamond tile (square rotated 45°) inside a matching frame, as in
  game, with the perk name as a smaller caption beneath. Selection highlights the
  tile's frame, not just the card border. Real icons come from the `icon_local_path`
  the perk API already returns.
- `NextPagePreview` — the next page, dimmed and non-interactive.
- `BuildBar` — 4 slots with icon thumbnails plus the confirm button.
- `ResultActions` — win/loss buttons, rendered only after the build is confirmed,
  labelled with their consequence ("Win → page 4", "Loss → reset").
- `RunHistory` — attempt, page, build, result, timestamp.
- `StartRunPanel` — shown when no run exists: pool size, page count, last page
  size, and the start button that freezes the snapshot.

State lives in one hook, `usePageStreakRun(killer)`, exposing `startRun`,
`confirmBuild`, `submitResult` and `resetRun`. Components stay presentational.

`CharacterRosterGrid` from the Gauntlet is **not** reused: its props carry
`role` and `checkpointCharacters`, and generalising it across two unrelated
challenge modes would produce a component neither mode owns. The new grid copies
its card pattern and broken-image handling.

## Copy and i18n

Hardcoded English, consistent with the rest of the app and the Streaks scaffold.
No new keys in `frontend/src/locales/*.json`.

## Animations

The project has no animation plugin — `tailwindcss-animate` is not installed, so
existing `animate-in fade-in slide-in-from-top-2` classes in `Navbar.tsx` are
silently inert. Animations here are custom `@keyframes` in
`frontend/src/app/globals.css`, alongside the existing `fogMove`. No new
dependency.

| Trigger | Treatment | Duration |
|---|---|---|
| Win | cleared page slides out left, next slides in right; progress bar fills; brief green flash | ~400 ms |
| Loss | grid desaturates and collapses back to page 1; progress bar drains | ~600 ms, deliberately slower |
| Perk selected | tile scales slightly, frame lights orange; build slot snaps in | ~150 ms |
| Build confirmed | result buttons rise into place | ~200 ms |
| Killer completed | one-shot green pulse on the roster card | ~800 ms |
| `prefers-reduced-motion` | all transforms off, state changes instant | — |

## Error handling

- A failed result submission must never look like a loss: result buttons disable
  during the request and restore on failure with an inline message.
- No optimistic UI for results — the run state is re-read from the backend.
  Losing a recorded win in an 8-page streak is real damage.
- Roster or run fetch failure shows an inline error with a retry, not a blank panel.
- Starting a run when one already exists, or reporting a result with no active
  run, returns a 4xx that the UI surfaces as a message rather than a crash.

## Verification

The backend has a real test suite (`unittest`, one file per service and per route,
a temporary SQLite file per test) — `backend/tests/test_challenge_service.py` is
the model to follow. All logic worth testing lives in `PageStreakService` and is
written test-first:

- page split with a full pool, with exclusions, and with a pool shorter than one page
- snapshot freezing: changing exclusions after start does not alter a run
- win advances; winning the last page completes the run
- loss resets to page 1, increments the attempt, preserves history and `best_page`
- manual reset on an in-progress and on a completed run
- validation rejects: wrong page, perk not on the page, wrong perk count
- roster excludes `General` and contains no power/item entries

Route tests cover the seven endpoints including the 4xx paths.

The frontend has no test framework and none is added here, consistent with the
rest of the project. Its gate is `npx tsc --noEmit` plus `npm run build`, followed
by a manual pass over the roster, a full run (start → win → win → loss → reset),
and the exclusion modal.

Note: `npm run lint` is broken project-wide — Next.js 16 removed `next lint` — and
is not a gate. Out of scope to fix here.
