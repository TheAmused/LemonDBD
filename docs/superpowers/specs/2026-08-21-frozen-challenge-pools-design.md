# Frozen Challenge Pools Design Spec

## Problem

`GauntletService`, `ChaosService`, and `HistoryService` all re-derive "what's
in play for this run" from the player's *current* ownership on essentially
every read and write:

- **Gauntlet**: `get_owned_character_names(...)` is called fresh inside
  `pick_initial_target`, `roll_gauntlet_target` (every roll), and inside
  `submit_result`'s win-completion check.
- **Chaos**: `get_owned_killer_names(...)` (completion check) and
  `get_unlocked_killer_perks(...)` (perk draw pool, called on every match via
  `_draw_build`) are both live.
- **History**: `_owned_names(...)` → `build_rows(...)` is live on every read
  (`get_or_create_run`, `submit_result`), which is how row composition is
  computed. This was a deliberate decision in the original
  [History Streak design](2026-08-20-history-streak-design.md) ("newly
  acquired killers can extend the tail of an existing row ... without a
  migration"). **This spec reverses that decision** — see Resolution below.

Marking a new character/killer as owned, or unlocking a new perk, while a
run is `in_progress` therefore changes that run's rules mid-flight: the
Gauntlet's win condition silently grows (`all(name in completed for name in
owned)` now needs one more clear), a freshly-unlocked perk can appear in a
Chaos match the player is mid-streak on, and in History a newly-owned killer
can shuffle row membership under an already-active row.

Page Streak does not have this problem — its `pages_json` is a snapshot
taken once at run creation (and again at explicit reset), so it does not
need to change under this spec. Its Rules modal still gets a copy addition
for consistency (see UI Copy below).

## Resolution

Each of the three affected runs freezes its pool at creation time and only
re-freezes at exactly three points:

1. **Manual reset** (`reset_run` service method for that mode).
2. **A loss that fully resets progress to zero** — i.e. a loss with no
   checkpoint to fall back to (Gauntlet/Chaos: `CHECKPOINT_INTERVAL == 0` or
   no checkpoint banked yet; History hell mode: always; History medium mode:
   never, since medium always has a row-start checkpoint). A loss that falls
   back to an already-banked checkpoint does **not** re-freeze — the
   checkpoint state was itself played out against the pool already frozen
   for this run, so the pool it resumes into must stay the one already in
   use.
3. **A win that completes the whole run** (`status` flips to `"completed"`).
   The pool refreezes immediately so that starting a fresh run right after
   (via reset) is not the only way to pick up new unlocks — the just-shown
   "run complete" state already reflects the current pool for stats/copy
   purposes, and the *next* `get_or_create_run` after a reset reads this
   fresh snapshot instead of re-querying ownership itself.

Between those points, every place in the service layer that currently calls
a live ownership/perk query for "what's available in this run" reads the
stored snapshot instead.

## Data model changes

Add one JSON column to each run model, holding the frozen pool as a plain
list of names (matching the existing convention in these tables —
`completed_characters_json`, `completed_killers_json` etc. are all
name-string lists already; switching the whole run schema to ID-based
references is out of scope for this change, see
[[prefer-perk-id-over-name]] for the forward-looking guidance this doesn't
retroactively apply everywhere):

- **`GauntletRun.owned_characters_json`** (`Text`, default `"[]"`): the
  character-name roster for this run's role, filtered by the Original-mode
  release cutoff exactly as `get_owned_character_names` does today.
- **`ChaosRun.owned_killers_json`** (`Text`, default `"[]"`): killer-name
  roster used for the win-completion check and the frontend's killer picker.
- **`ChaosRun.unlocked_perks_json`** (`Text`, default `"[]"`): the killer
  perk pool as a plain name list, matching every other column in this
  table. `get_unlocked_killer_perks` returns full perk dicts (description,
  icon paths, translations) — storing those verbatim would run ~40-60KB per
  frozen snapshot for ~145 killer perks, against ~1-2KB for the name-only
  columns elsewhere. Full objects for the *drawn* 4 perks a match actually
  shows still go in `current_perks_json` exactly as today (that column was
  already storing full dicts and stays tiny, since it's only ever 4
  entries) — only the *pool* shrinks to names. A new
  `resolve_perks_by_names(names: List[str]) -> List[dict]` helper (plain
  `select(Perk).where(Perk.name.in_(names), Perk.category == "Killer")`,
  no `lang` involved — this is an internal service call, not the
  locale-aware `/api/v1/perks` route, so it can't reintroduce the
  Page-Streak-icon-style name/translation drift) resolves the frozen names
  back to full dicts wherever a full object is actually needed (drawing,
  and the frontend's perk-pool modal).
- **`HistoryRun.owned_killers_json`** (`Text`, default `"[]"`): killer-name
  roster (sorted by release) that `build_rows` chunks into rows of 5.

All four columns are nullable-with-default so existing rows created before
this migration don't need backfilling in the migration itself — see
"Existing runs" below for how the service layer lazily populates them.

## Existing runs (no backfill migration)

An already-`in_progress` run has `owned_*_json = "[]"` right after the
migration runs. Each service's read path (`get_or_create_run` /
`_augment`-equivalent) treats an empty/missing snapshot on an
already-existing run as "never frozen yet" and freezes it *once*, in place,
from current live ownership, the first time that run is loaded post-migration
— then never again until one of the three trigger points. This is the same
snapshot-writing code path the trigger points use, just invoked lazily
instead of eagerly, so there is no separate migration data script.

## Service layer changes

### `GauntletService` (`backend/app/services/gauntlet_service.py`)

- Add `_freeze_pool(r: GauntletRun) -> List[str]`: computes
  `get_owned_character_names(r.user_id, r.role, self.ownership_service)`,
  writes it to `r.owned_characters_json`, returns the list. Does **not**
  commit — callers commit as part of their existing transaction.
- `get_or_create_run`: on creation, call `_freeze_pool` before building
  `initial_loadout`/committing. On the existing-run path, if
  `json.loads(run.owned_characters_json or "[]")` is empty, call
  `_freeze_pool(run)` and commit before returning.
- `roll`: replace the live roster read inside `roll_gauntlet_target` — pass
  the frozen list in instead of having `roll_gauntlet_target` call
  `get_owned_character_names` itself. `roll_gauntlet_target`'s signature
  changes from taking `ownership_service` (used only for that live call) to
  taking `owned_characters: List[str]` directly.
- `submit_result`: replace `get_owned_character_names(user_id, r.role,
  self.ownership_service)` with `json.loads(r.owned_characters_json or
  "[]")`. On `result == "loss"` with `CHECKPOINT_INTERVAL == 0` (a full
  reset to zero), call `_freeze_pool(r)` after resetting `completed`/
  `checkpoint_chars`. On the win branch, when `r.status` flips to
  `"completed"`, call `_freeze_pool(r)` too (refreezes for whenever the
  player next resets).
- `reset_run`: unchanged in shape (still deletes and recreates via
  `get_or_create_run`, which freezes on creation).

### `ChaosService` (`backend/app/services/chaos_service.py`)

- Add `_freeze_pools(r: ChaosRun) -> tuple[List[str], List[dict]]`:
  computes `get_owned_killer_names(...)` and
  `get_unlocked_killer_perks(...)`, writes both JSON columns, returns both.
- `get_or_create_run` (wherever it lives — check `ChaosService.__init__`
  call site currently at run creation before `_draw_build`'s first call):
  freeze on creation; lazily freeze on read if either snapshot is empty.
- `_draw_build` (or its caller): stop calling `get_unlocked_killer_perks`
  live — read `json.loads(r.unlocked_perks_json or "[]")` instead.
- `submit_result`: replace the live `get_owned_killer_names(...)` completion
  check with `json.loads(r.owned_killers_json or "[]")`. Re-freeze
  (`_freeze_pools`) in the same two spots as Gauntlet: a loss that resets to
  zero (`interval == 0` branch, or `interval > 0` but `last_checkpoint ==
  0`), and a win that sets `status = "completed"`.

### `HistoryService` (`backend/app/services/history_service.py`)

- Add `_freeze_pool(run: HistoryRun) -> List[str]`: computes
  `get_owned_killer_names_by_release(user_id, self.ownership_service)`,
  writes `run.owned_killers_json`, returns it.
- `_augment`: change its `owned_names` parameter source — instead of always
  calling `self._owned_names(user_id)`, callers read
  `json.loads(run.owned_killers_json or "[]")` and freeze-if-empty exactly
  like the other two services.
- `get_or_create_run`: freeze on creation before the first `_augment` call.
- `submit_result`: hell-mode loss (full reset branch) re-freezes; row
  completion that sets `status = "completed"` re-freezes. Medium-mode loss
  (checkpoint fallback) does **not** re-freeze, matching Chaos/Gauntlet.
- This intentionally supersedes the "rows recomputed live, no migration
  needed" line in the original History Streak design spec — that tradeoff
  is what this spec fixes.

## Frontend changes

Every board that currently fetches its own roster/pool live *for an active
run* switches to reading it off the run object instead. Each affected
`to_dict()` already includes the raw model fields via normal serialization
once the new JSON columns are added — parse them into a plain list/array in
`to_dict()` the same way `completed_characters`/`completed_killers` already
are (e.g. `"owned_characters": json.loads(self.owned_characters_json or
"[]")`).

- **`GauntletBoard.tsx`**: `useOwnedCharacters` currently drives both
  `CharacterRosterGrid` and `ActiveTargetStage`'s `drawPool`. Add
  `run.owned_characters: string[]` to `GauntletRun` (frontend type). When
  `run` is present, build the `characters` list passed to both children from
  `run.owned_characters` (mapped through the existing avatar-URL helper)
  instead of from `useOwnedCharacters`'s live fetch. `useOwnedCharacters`
  keeps existing for the brief window before a run exists (`get_or_create_run`
  needs *something* to seed the very first run with, which the backend
  already handles server-side — the frontend hook isn't actually needed for
  that either once this lands, but leave it in place for now since nothing
  else currently depends on removing it).
- **`ChaosBoard.tsx`**: `useOwnedKillers` (roster for `KillerPickerGrid`)
  and `useKillerPerkPool` (perk pool for `SlotMachineStage`'s reveal and
  `ChaosPerkPoolModal`) both switch to `run.owned_killers: string[]` and
  `run.unlocked_perks: Perk[]` respectively, once `run` exists.
- **`HistoryBoard.tsx`**: `current_row_killers` is already computed
  server-side and returned on the run (`_augment` already does this) — no
  frontend change needed there. `HistoryNextRowPreview` currently takes
  `killers={ownedKillers}` from the live `useOwnedKillers` hook; switch it
  to `run.owned_killers` so the "next row" preview matches what the backend
  will actually chunk into rows.

## UI copy

Add two short rule lines to each Rules modal
(`GauntletRulesModal.tsx`, `ChaosRulesModal.tsx`, `HistoryRulesModal.tsx`,
`PageStreakRunView`'s equivalent, page-streak doesn't have a dedicated
rules modal today, skip it, its "layout frozen {date}" header text already
communicates the same idea) explaining the freeze, in the same tone as the
rest of each modal's existing rules copy:

> The roster is locked in for the run you're on. New characters or perks
> you unlock mid-run won't join until you reset, lose back to zero, or
> complete it.
>
> An in-progress run untouched for 90 days automatically counts as a loss.

Exact wording can flex per-mode ("killers" vs "characters") to match each
modal's existing vocabulary. Keep the freeze note and the retention note as
two separate lines, not one combined sentence.

## Inactive-run auto-loss

Abandoned `in_progress` runs (Gauntlet, Chaos, History, and Page Streak —
this applies to all four, not just the three whose pools this spec
freezes, since it's the same "runs sit untouched forever" problem)
currently accumulate in the database forever with no consequence. Rather
than silently deleting a stale run — which would also cascade-delete its
match-log history, erasing the record along with the run — a run whose
`updated_at` is older than a configurable threshold
(`STREAK_INACTIVITY_PRUNE_DAYS`, default 90) and whose `status` is still
`"in_progress"` is made to **lose**, exactly as if the player had lost
their current match: the same checkpoint-fallback-or-reset-to-zero logic
each service already runs on a real loss applies here too (including the
Task 2/3/4 refreeze-on-loss-to-zero rule), a match-log row is written
recording that loss, and the run itself survives — it's not deleted, just
knocked back like any other loss. `"completed"` runs are never touched,
since they're a finished record, not an abandoned attempt.

**Distinguishing an auto-loss from a real one:** each match-log table
(`GauntletMatchLog`, `ChaosMatchLog`, `HistoryMatchLog`,
`PageStreakPageLog`) gets a new `triggered_by` column (`"player"` default,
`"inactivity"` for these). The stats drawer / history views don't need to
change behavior — a loss is a loss for streak-counting purposes — but the
flag exists so a future UI pass can visually distinguish "you lost" from
"we cleared this because you'd been gone 90 days" without guessing from
timestamps.

**Applying the loss:** Gauntlet's existing `submit_result` doesn't need
per-match target info to record a loss (the target character already lives
on the run) — it gains an optional `triggered_by: str = "player"`
parameter and the cleanup job calls it directly with `"loss"` +
`"inactivity"`. Chaos, History, and Page Streak's `submit_result` methods
all require per-match data (a `killer_id`, or a page/perks build) that
doesn't exist for a run nobody was actively playing — each of those three
gets a dedicated `apply_inactivity_loss(user_id, run_id)` method that
duplicates just the existing loss-branch state transition (checkpoint
fallback, refreeze-on-zero, `current_page`/`attempt` reset for Page
Streak) and writes its match-log row with an empty/placeholder per-match
field (`killer_id=""` for Chaos/History, `perks_json="[]"` for Page
Streak) and `triggered_by="inactivity"`.

**Delivery:** an in-process APScheduler `BackgroundScheduler`, started
inside `create_app()` and disabled under `TESTING` config, running a daily
cron job (03:00) that calls `apply_inactivity_losses()`. No new service,
container, or broker — the project has no Celery/Redis today, and one
daily maintenance job doesn't justify introducing them. The backend already
runs under `gunicorn --workers 4`, so `apply_inactivity_losses()` guards
itself with a Postgres advisory lock (`pg_try_advisory_lock`) so only one
worker process (whichever's scheduler tick wins the race) actually performs
the pass; the lock is skipped entirely on non-Postgres dialects (the test
suite runs on in-memory SQLite, which has no advisory lock function) so the
function stays directly unit-testable.

**UI copy:** each mode communicates the 90-day window somewhere the player
will see it before it bites them — the three Rules modals (Task 8) get a
line alongside the frozen-pool note, phrased as "counts as a loss," not
"deletes your run"; Page Streak, which has no Rules modal, gets a short
caption near its reset control instead.

## Out of scope

- Converting `completed_characters_json`/`completed_killers_json`/etc. to
  ID-based storage. [[prefer-perk-id-over-name]] is forward-looking
  guidance for new work, not a mandate to touch every existing name-based
  column in this change.
- Any change to Page Streak — it already freezes correctly.
- A data migration script to eagerly backfill snapshots for existing runs —
  the lazy-freeze-on-read path handles it without one.
