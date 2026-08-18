# Gauntlet "Original" Mode Redesign & Game Mode Selector

## 1. Executive Summary

Redesigns the Survivor and Killer Challenge Gauntlet's match flow (both live under `frontend/src/components/streaks/gauntlet/` and `backend/app/services/gauntlet_service.py`) into a mode-selectable challenge. Clicking the "Gauntlet streak" panel now opens a mode picker with **Original** (the redesigned rules below) and **Lemon version** (a locked placeholder for future work). Original mode removes the "Match Exceptions" (DC / cancelled game) buttons, replaces the very first match's Win/Lose buttons with a one-time "Start Game" reveal, switches perk assignment from random to a manual picker constrained by tier rules, and adds a randomly-rolled item/add-on loadout differentiated by role. Also fixes a confirmed data-mapping bug (`character` vs `character_name`) uncovered during code review that silently broke the existing "must include a character teachable perk" tier rule.

## 2. Game Mode Selector

- New component `GauntletModeModal.tsx` (in `frontend/src/components/streaks/gauntlet/`). Opened from `StreakPanel`/`panels.ts` for the `gauntlet-streak` panel instead of navigating directly.
- Two tiles: **Original** (clickable, navigates to `/${locale}/streaks/${role}/gauntlet-streak`) and **Lemon version** (visually present, disabled — same `comingSoon` treatment already used for `history-streak`/`chaos-streak` in `panels.ts`).
- `StreakPanel.tsx`/`panels.ts` need a small extension: the `gauntlet-streak` entries in `KILLER_STREAK_PANELS`/`SURVIVOR_STREAK_PANELS` gain an `onOpenModeSelect` affordance instead of a bare `href`, while other non-`comingSoon` panels (e.g. `page-streak`) keep linking directly.
- Backend: add `game_mode` column to `gauntlet_runs` (`String(20)`, default `"original"`, not null). Change the existing unique constraint from `(user_id, role)` to `(user_id, role, game_mode)`. Alembic migration required (SQLite via `batch_alter_table`, following the pattern in `backend/migrations/versions/add_alternate_name_to_perks.py`).
- `GauntletService`/`gauntlet_streak_bp` routes accept/pass `game_mode="original"` everywhere for now; no server-side branching on mode value yet since Lemon version isn't reachable from the UI.

## 3. Match Flow: "Start Game" Reveal & Removing Match Exceptions

### 3.1 Start Game reveal (once per run)

- `GauntletRun` gains a `target_revealed` boolean column, default `false`.
- `get_or_create_run`: a brand-new run is created with a target already rolled server-side (unchanged from today — needed to compute tier/pool data), but `target_revealed=false`.
- New endpoint `POST /api/v1/gauntlet-streak/reveal` (body: `{run_id}`). `GauntletService.reveal_target(user_id, run_id)` sets `target_revealed=true`, returns the run.
- Frontend: `ActiveTargetStage.tsx` renders a "Start Game" button (replacing the whole card) whenever `!run.target_revealed`. Clicking it calls `reveal`, then plays a short client-side draw animation (rapid-cycling candidate avatars for ~1–1.5s, timer-driven, no new dependency) before showing the normal target card with perk selection (see §4).
- Once revealed, `target_revealed` stays `true` for the rest of the run (it is never reset back to `false` after subsequent Win/Lose/Reroll) — matches the "only once, at run start" requirement.
- `useGauntletRun.ts` gains a `reveal()` action calling the new API method `revealTarget` in `gauntletStreakApi.ts`.

### 3.2 Removing Match Exceptions entirely

Full removal, not a UI-only hide:

- Frontend: delete the "Match Exception" button row from `ActiveTargetStage.tsx` (`onInvalidateMatch` prop and its two buttons), remove `invalidateMatch` from `useGauntletRun.ts` and `gauntletStreakApi.ts`.
- Backend: delete `GauntletService.invalidate_match()`, the `POST /invalidate` route in `gauntlet_streak.py`, the `GauntletMatchException` model and its `gauntlet_runs.match_exceptions` relationship, and drop the `gauntlet_match_exceptions` table via the same migration as §2/§3.1.
- `GauntletRulesModal.tsx`: replace the "Match Invalidation Exceptions" section (with its two bullet points) with a short plain-text note, e.g. *"If someone disconnects or the game gets cancelled, just play the match again — it won't affect your streak."*
- `backend/tests/test_gauntlet_service.py` and any route tests referencing `invalidate_match`/`/invalidate` are removed or updated accordingly.

## 4. Manual Perk Selection (replaces random rolling)

- Bug fix (found during code review): `Perk.to_dict()` (`backend/app/models.py`) emits the character's name under the key `character`, but `GauntletService.roll()` reads `p.get("character_name")`, which is always `None`. This silently emptied `char_perks` and broke every tier's "must include a character teachable perk" rule, and made `ActiveTargetStage.tsx` always render "General Perk" for `perk.character_name`. Both call sites are corrected to use `character` as part of this work (the picker replaces `roll()`'s perk logic anyway; the frontend perk card is updated to read `perk.character`).
- `GauntletService.roll()`/the reveal/win/loss flow no longer picks perks. After `/reveal` and after each `/result` call, the returned loadout's `perks` list is empty and `tier_info.perk_limit` tells the frontend how many slots to fill.
- New frontend component `PerkPickerPanel.tsx` (`frontend/src/components/streaks/gauntlet/`):
  - Slot 1 (only when `perk_limit > 0`): required, dropdown/list restricted to the target character's own unlocked teachable perks (`character === target` from `GET /users/{id}/perks?role=...`, already used by `CharactersHub`/ownership).
  - Slots 2..`perk_limit`: any unlocked perk of that role (Survivor/Killer), excluding perks already picked in other slots — matches the existing random logic's spirit per your answer.
  - For `perk_limit === 0` (Tier 4), no picker is shown — loadout is auto-empty and the match is immediately playable.
- New endpoint `POST /api/v1/gauntlet-streak/loadout` (body: `{run_id, perk_ids: number[]}`). `GauntletService.set_loadout(user_id, run_id, perk_ids)` validates: count matches `perk_limit`, no duplicates, all perks unlocked for that user/role, and (when `perk_limit > 0`) perk at index 0 belongs to the current target character. On success, persists `current_loadout_json` (now including the item/add-on fields from §5) and returns the run.
- Win/Lose buttons in `ActiveTargetStage.tsx` are disabled until a valid loadout has been submitted for the current target (i.e. `loadout.perks.length === perk_limit`, trivially true at `perk_limit === 0`).

## 5. Random Item / Add-on Loadout (role-differentiated)

- No per-user ownership tracking exists for `Item`/`Addon` today (unlike `Character`/`Perk`), and per your decision this stays out of scope — the full pool from the DB is eligible.
- Rolled at the same points perks used to be (on `/reveal` and after each `/result`), independent of perk tier (fixed count, not scaled):
  - **Survivor**: 1 random `Item` (`role == "Survivor"`), plus up to 2 random `Addon` rows where `category == "Survivor"` and `associated_target` matches the chosen item's `category` (e.g. item category `"Med-Kit"` → addons with `associated_target == "Med-Kits"`; exact pluralization/matching verified against live data at implementation time).
  - **Killer**: up to 2 random `Addon` rows where `category == "Killer"` and `associated_target` equals the target killer's name.
  - Both pools exclude `Addon` rows with an empty `description` (filters out the 7 known scraper-artifact rows keyed to `associated_target == "Numbers"`, e.g. "Uncommon Add-ons"/"Rare Add-ons" placeholders — a pre-existing data issue, not something this work fixes at the source).
- `GauntletLoadout` (backend dict + `frontend/src/types/gauntletStreak.ts`) gains: `item?: Item` (survivor only) and `addons: Addon[]` (both roles, empty array if the pool has nothing to draw for that target).
- `ActiveTargetStage.tsx` gains a card section rendering the rolled item (survivor) and add-ons (both roles) alongside the existing perk grid — read-only display, no picker (random, per your decision).

## 6. Data Model Changes Summary

New Alembic migration (single file, following `add_alternate_name_to_perks.py`'s batch-alter style):
- `gauntlet_runs`: add `game_mode` (`String(20)`, default `"original"`, not null), add `target_revealed` (`Boolean`, default `false`, not null); replace unique constraint `uq_gauntlet_run_user_role` with `(user_id, role, game_mode)`.
- Drop `gauntlet_match_exceptions` table and the `GauntletMatchException` model/relationship.

No changes to `Item`/`Addon`/`Perk`/`Character` schemas.

## 7. Out of Scope

- Lemon version's actual rules/behavior — only the disabled placeholder tile exists after this work.
- Item/add-on ownership tracking (deferred; user needs to think through tier interaction first).
- Tier-scaling of item/add-on counts (currently fixed, independent of perk tier).
- Fixing the broken `Object of Obsession → Bound by Obsession` perk reference or other unrelated data-quality issues found during the earlier perk audit (explicitly deferred by the user).
- Any change to `page-streak` or other non-gauntlet streak modes.
