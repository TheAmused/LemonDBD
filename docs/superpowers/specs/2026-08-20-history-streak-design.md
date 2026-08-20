# History Streak Design Spec

## Concept

A killer-only streak challenge where the player's owned killers, sorted by
release order, are grouped into rows of 5. The first row starts unlocked;
clearing every killer in a row unlocks the next. Perks start at just the
General pool; beating a killer adds that killer's own teachable perks to the
player's unlocked pool. Addons and perk/build drawing play no role at all —
this challenge is about roster progression and perk collection, not builds.

Two modes:
- **Medium**: a checkpoint banks every time a row is fully cleared. A loss
  before that falls back to the start of the current row (previously cleared
  killers in that row must be replayed), not to zero.
- **Hell**: no checkpoints. Any loss resets the entire run (all rows, all
  unlocked perks) to zero.

## Data model

**`HistoryRun`** (one per user per mode, mirrors `ChaosRun`'s shape):
- `id`, `user_id`, `mode` (`'medium' | 'hell'`), `status` (`'in_progress' |
  'completed'`)
- `current_row_index` (int, 0-based)
- `completed_killers_json` (killers beaten in the current, still-open row)
- `unlocked_perk_names_json` (accumulated across the whole run; starts as
  every General-category perk name)
- `checkpoint_row_index`, `checkpoint_completed_killers_json`,
  `checkpoint_unlocked_perk_names_json` (medium only; unused/mirrors current
  state in hell)
- `created_at`, `updated_at`

**`HistoryMatchLog`** (mirrors `ChaosMatchLog`): `id`, `run_id`, `killer_id`,
`result`, `row_index`, `streak_before`, `streak_after`, `timestamp`. Streak
here counts total killers beaten across the whole run (for the stats
drawer's win-rate view), not row count.

Rows are never persisted — they're derived on every read from the player's
current owned-killer list (sorted by `Character.release_number`, nulls last)
chunked into groups of 5: `row_index = position_in_owned_list // 5`. This
means newly-acquired killers can extend the tail of an existing row or start
a new one on the player's *next* fetch, without a migration.

## Backend service (`HistoryService`)

- `get_or_create_run(user_id, mode)`: fetches or creates the run row, then
  computes the live roster/rows and returns them alongside run state (which
  row is active, which killers in it are done, remaining count).
- `submit_result(run_id, result, killer_id)`:
  - **win**: append `killer_id` to `completed_killers`; add that killer's
    teachable perk names to `unlocked_perk_names` (dedup). If every killer in
    the current row is now in `completed_killers`, advance
    `current_row_index` and reset `completed_killers` to `[]` for the new
    row. In medium mode, if this win completed the row, also snapshot the
    checkpoint (`checkpoint_row_index`, `checkpoint_completed_killers`,
    `checkpoint_unlocked_perk_names`) at the new state.
  - **loss**: medium → restore `current_row_index`,
    `completed_killers_json`, `unlocked_perk_names_json` from the checkpoint
    fields. hell → reset all four to their initial values (row 0, empty
    completed list, General-only perks).
  - If the row just completed was the last row (no further owned killers
    beyond it), mark `status = 'completed'` instead of advancing to a next
    row.
- `get_stats(user_id, mode)`: same shape as Chaos's (`total_matches`, `wins`,
  `losses`, `win_rate`, `recent_logs`).
- No roller, no addon logic — this service is simpler than
  `ChaosService`/`GauntletService`.

## Routes

`/api/v1/history-streak/run` (GET, auto-creates), `/result` (POST),
`/run/reset` (POST), `/stats` (GET) — same contract shape as the
`chaos-streak` blueprint, swapping `difficulty` for `mode`.

## Frontend

- `panels.ts`: flip `history-streak` from `comingSoon: true` to a real
  entry; `HistoryModeModal` (medium/hell) mirrors `ChaosModeModal`.
- `HistoryBoard.tsx`: top-level page component, same shape as `ChaosBoard`.
  - `HistoryHeader.tsx`: current/best streak (total killers beaten),
    checkpoint row, rules button, perk pool button — mirrors `ChaosHeader`
    minus the difficulty icon (mode icon instead: Shield for medium, Skull
    for hell).
  - A compact progress line above the picker: "Row {n} — killer {x} of
    {total owned}" — no re-rendering of already-cleared rows; once a row is
    done the UI simply swaps in the next row's tiles.
  - `HistoryKillerPickerGrid`: reuses `KillerPickerGrid`'s tile styling,
    scoped to only the current row's killers (5 or fewer on the last row).
  - Pick a killer → **Win/Lose buttons appear immediately** (no perk draw,
    no Accept step — this challenge never assigns a build).
  - **Win** → `HistoryPerkModal`: a small animated modal listing the perks
    just unlocked from that killer (reuses the `chaos-badge-pop` pop-in
    keyframe per perk icon).
  - **Row cleared** (win that also completes the row) → a brief info
    banner/modal ("Row cleared! Row {n+1} unlocked.") shown once, before the
    next row's tiles render.
  - `HistoryPerkPoolModal`: two tabs, Unlocked / Locked, reusing
    `ChaosPerkPoolModal`'s tabbed grid layout (icon + name tiles, no rarity
    concept since addons don't apply here).
  - `HistoryRulesModal`: mirrors `ChaosRulesModal`'s structure with this
    mode's actual rules (row progression, checkpoint semantics, perk pool
    growth).
- Confetti reuses the existing `Confetti` component; full-run completion
  (every row cleared) fires it the same way Chaos Streak's completion does.

## Out of scope

- No addon rarity mechanic.
- No perk/build drawing or reveal-lever step.
- Rows are never shown as a full always-visible roadmap of every row at
  once — only the current row is interactive; earlier rows are not
  re-rendered once cleared.
