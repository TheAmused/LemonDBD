# Chaos Streak

## 1. Executive Summary

Adds a third challenge type alongside Gauntlet and Page Streak: **Chaos Streak**, a killer-only, casino-themed run where every round randomises a 4-perk loadout (drawn from the player's entire unlocked killer perk pool, not tied to any character) plus 2 add-on rarity requirements, and the player manually picks which of their remaining killers to play with that build. Three difficulties (Easy, Medium, Hell) differ only in checkpoint interval — Easy banks progress every 5 wins, Medium every 10, Hell never (one loss wipes the run). The panel already exists as a locked "coming soon" entry in `panels.ts`; this work unlocks it.

Structurally this is simpler than Gauntlet: no per-character target draw, no tiered perk-limit ladder. The new surface area is the perk pool (no-repeat until exhausted, then refills) and the slot-machine presentation.

## 2. Round Flow

1. Player opens Chaos Streak, picks a difficulty in `ChaosModeModal.tsx` (all three active, mirroring `GauntletModeModal.tsx`'s tile layout but with three real tiles instead of one real + one locked).
2. A run for that difficulty is fetched or created (`GET /run?difficulty=...`), already holding a freshly-drawn build (4 perks + 2 addon rarities), `perks_revealed=false`.
3. Player pulls the lever (`POST /reveal`) → the 4 perk reels spin and land (client-side animation only; the actual perks were already decided server-side at draw time, the reel just reveals them) → the 2 addon-rarity badges fade in as the last reel lands.
4. Player picks a killer from a grid of their owned, not-yet-cleared killers (`KillerPickerGrid.tsx`). Selection is local UI state only, nothing persisted until step 5.
5. Player plays the match, comes back, presses WIN or LOSE. `POST /result` with `{run_id, result, killer_id}`.
   - **Win**: `killer_id` added to `completed_killers`. If that covers every killer the player owns, `status="completed"` (win screen + confetti, same as Gauntlet). Otherwise, bank a checkpoint if the new streak crosses the difficulty's interval, then draw the next build and return.
   - **Loss**: if the difficulty has no checkpoint interval (Hell), full reset. Otherwise, revert to the last checkpoint's snapshot. Either way, draw the next build and return.
6. Repeat from step 3.

The rules panel states the win condition in text only (**3 or more kills**, matching Gauntlet's Original mode), same as Gauntlet — no numeric kill-count input anywhere, the player self-reports via the WIN/LOSE buttons.

## 3. Data Model

New file `backend/app/models/chaos.py`, registered in `backend/app/models/__init__.py` alongside the other per-domain model files.

```python
class ChaosRun(Base):
    __tablename__ = "chaos_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "difficulty", name="uq_chaos_run_user_difficulty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    difficulty: Mapped[str] = mapped_column(String(20))  # "easy" | "medium" | "hell"
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    used_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_used_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    current_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    current_addon_rarities_json: Mapped[str] = mapped_column(Text, default="[]")
    perks_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at / updated_at: as in GauntletRun

    match_logs: Mapped[List["ChaosMatchLog"]] = relationship(back_populates="run", cascade="all, delete-orphan")
```

A player can have one in-progress run **per difficulty** simultaneously (same shape as Gauntlet's `(user_id, role, game_mode)` uniqueness, minus the role dimension since this is killer-only).

`checkpoint_killers_json` and `checkpoint_used_perks_json` are the full state snapshot taken the moment a checkpoint banks — both roll back together on a loss that falls back to a checkpoint, exactly like `GauntletRun.checkpoint_characters_json` does today. `used_perks_json`/`checkpoint_used_perks_json` hold perk **names**, matching how `completed_killers_json` holds killer names and `GauntletRun.current_character_id`/`completed_characters_json` already use names (not numeric ids) as the identifier throughout this codebase's JSON-blob columns. Perk names are unique (`Perk.name` has a unique constraint), so this is safe.

```python
class ChaosMatchLog(Base):
    __tablename__ = "chaos_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("chaos_runs.id", ondelete="CASCADE"), index=True)
    killer_id: Mapped[str] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20))
    perks_json: Mapped[str] = mapped_column(Text)
    addon_rarities_json: Mapped[str] = mapped_column(Text)
    streak_before: Mapped[int] = mapped_column(Integer)
    streak_after: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")
```

Same `to_dict()` convention as every other model in this codebase (JSON columns exposed both as the raw `_json` string and the parsed value, e.g. `"perks_json"` and `"perks"`).

`backend/app/schemas/chaos.py` gets `ChaosRunBase`/`ChaosRunResponse`/`ChaosMatchLogBase`/`ChaosMatchLogResponse`, matching the shape (not the specific fields) of `schemas/gauntlet.py`. Not wired into route validation yet, same as gauntlet's schemas today — scaffolding for later, consistent with the rest of this codebase's schemas package.

Migration: add the two tables via the same ad-hoc column/table bootstrapping already used for Gauntlet (`db/migrations.py`'s `GAUNTLET_RUN_COLUMNS` pattern extended with a `chaos_runs`/`chaos_match_logs` equivalent, plus the SQLite fallback DDL in `db/raw_schema.py`) — this app has no live Alembic migration for `gauntlet_runs`/`gauntlet_match_logs` either, `db.create_all()` handles new tables for a fresh database and the ad-hoc migrator handles existing ones.

## 4. Difficulty & Checkpoints

```python
# backend/app/services/chaos/constants.py
CHAOS_CHECKPOINT_INTERVAL = {"easy": 5, "medium": 10, "hell": 0}
DIFFICULTIES = ("easy", "medium", "hell")
```

`interval = CHAOS_CHECKPOINT_INTERVAL[difficulty]`.

On win: `streak_after = current_streak + 1`. If `interval > 0 and streak_after % interval == 0`, bank: `last_checkpoint_streak = streak_after`, `checkpoint_killers_json = completed_killers_json` (post-win), `checkpoint_used_perks_json = used_perks_json` (post-draw-consumption for this round).

On loss:
- `interval == 0` (Hell): `current_streak = 0`, `completed_killers = []`, `used_perks = []` — full wipe, matching the "one loss resets everything" rule.
- `interval > 0` (Easy/Medium): `current_streak = last_checkpoint_streak`, `completed_killers = checkpoint_killers_json`, `used_perks = checkpoint_used_perks_json` — revert to the last banked snapshot, never below it.

Either branch then draws the next round's build before returning, same as Gauntlet's `/result` auto-rolling the next target.

## 5. Perk Draw (no-repeat pool)

`backend/app/services/chaos/roller.py`:

```python
def draw_chaos_build(user_id, used_perk_names, ownership_service) -> tuple[list[dict], list[str]]:
    """Returns (4 drawn perks, the updated used_perks list)."""
```

Pool = every `Perk` the user has unlocked in the `Killer` category (`ownership_service.get_user_perks(user_id, category="Killer")`, `is_unlocked=True` — the exact same helper Gauntlet's `roller.py` already uses for `get_unlocked_role_perks`, no new ownership-service code needed).

Draw one perk at a time, 4 times:
- Eligible = pool minus `used_perk_names` (accumulated across this call).
- If eligible is empty, the whole pool becomes eligible again and `used_perk_names` resets to `[]` — this can happen **mid-draw**, so a single round can legitimately contain perks from both the tail of the old cycle and the start of a new one, per your literal "no repeat until all are used" rule.
- Pick one at random from eligible, append its name to `used_perk_names`, remove it from eligible for the rest of this draw.
- Degenerate case: a player with fewer than 4 unlocked killer perks total cannot avoid a repeat within one draw even after a refill — allow the repeat in that case rather than erroring (this only affects players with a very small collection).

## 6. Addon Rarity Draw

`backend/app/services/chaos/roller.py`, same module:

```python
ADDON_RARITY_POOL = ["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"]  # "Event" excluded
```

Two independent picks with replacement (duplicates allowed, e.g. two "Rare"), drawn in the same call as the 4 perks so both are part of one round's build and one `/reveal`. Not tracked in any no-repeat pool — an independent roll every round, unrelated to `used_perks_json`.

`current_addon_rarities_json` stores `["Rare", "Ultra Rare"]`-shaped lists. Displayed with the existing `getRarityTileStyle()` color mapping (`frontend/src/components/character-detail/types.tsx`) — no new color system.

**Flagged assumption**: excluding "Event" rarity from the draw pool (it's a limited-time-event rarity, not reliably available to every player). Easy to add back if wrong.

## 7. Backend API

`backend/app/routes/chaos_streak.py`, blueprint `chaos_streak_bp` at `/api/v1/chaos-streak`:

- `GET /run?difficulty=easy|medium|hell` — get-or-create, mirrors `gauntlet_streak_bp`'s `/run`.
- `POST /reveal` — `{run_id}`, sets `perks_revealed=true`.
- `POST /result` — `{run_id, result: "win"|"loss", killer_id}`. `killer_id` required always; on win the service validates it's an owned killer not already in `completed_killers`.
- `POST /run/reset` — `{difficulty}`, same explicit-reset pattern already added to Gauntlet this session.
- `GET /stats?difficulty=...` — same shape as Gauntlet's stats endpoint.

`backend/app/services/chaos_service.py` is a thin `ChaosService` class wrapping `services/chaos/` module functions, matching `GauntletService`'s current shape exactly (constructor takes `ownership_service`, methods delegate to the package).

## 8. Frontend

New directory `frontend/src/components/streaks/chaos/`:

- `ChaosBoard.tsx` — page-level container, mirrors `GauntletBoard.tsx` (header, stats drawer, rules modal, reset control, confetti on completion).
- `SlotMachineStage.tsx` — the 4-reel machine + lever + the 2 addon-rarity badges. Owns the spin animation.
- `KillerPickerGrid.tsx` — clickable grid of the player's remaining (not yet cleared) killers, visually close to `CharacterRosterGrid.tsx` but interactive (click = select) instead of passive.
- `useChaosRun.ts` — data hook mirroring `useGauntletRun.ts` (`run`, `stats`, `submitResult`, `reveal`, `reset`, plus local `selectedKillerId` state since the killer pick never round-trips to the server until `submitResult`).
- `ChaosModeModal.tsx` — three-tile difficulty picker, opened from `StreakPanelGrid.tsx`'s click handler for the `chaos-streak` panel (same mechanism already wired for `gauntlet-streak`).

Reused as-is: `Confetti`/`CONFETTI_LIFETIME_MS`, the `CheckpointModal.tsx` pattern (Easy/Medium now have checkpoints too, so the same banked-checkpoint celebration applies here — likely generalized slightly to accept a role-agnostic label instead of `Role`, or a small `ChaosCheckpointModal` copy, decided at implementation time based on how much actually differs).

Route: `frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx`. No survivor route — `panels.ts`'s `SURVIVOR_STREAK_PANELS` does not get a `chaos-streak` entry, matching how it's killer-only today.

`panels.ts`: remove `comingSoon: true` from the `chaos-streak` entry in `KILLER_STREAK_PANELS`, give it a real accent color (see §9) instead of the current placeholder `text-slate-400`.

## 9. Casino Visual Language

- **4 animated reels**, all perks (not 6 — addon rarities are shown as static badges, not additional reels, per your last call). Each `overflow-hidden` window holds a scrolling vertical strip of perk icons; direction alternates per reel (some scroll up, some down) using the same `requestAnimationFrame` + eased-delay approach already built for `useTargetDraw.ts`, landing with the existing `gn-land-glow`/`gn-land-frame` keyframes from `globals.css`.
- **Lever**: click/tap triggers a CSS pull-down animation and starts the spin — not a real drag gesture, for touch/accessibility reliability.
- **2 rarity badges**: fade/pop in once the last reel lands, colored via `getRarityTileStyle()`.
- **Accent color**: a violet + gold identity, distinct from Gauntlet's amber, applied to the panel card, the mode modal, and the machine's own chrome.
- **Explicitly out of scope for this pass**: sound effects (autoplay policy and asset-sourcing concerns, no requirement stated) — flagged as a possible later addition, not built now.

## 10. Testing

- `backend/tests/unit/test_chaos_service.py`: checkpoint banking/reverting per difficulty (mirrors the Gauntlet checkpoint tests already in this codebase), no-repeat draw including the mid-draw refill edge case, full run-to-completion, Hell's full-reset-on-loss.
- `backend/tests/api/test_chaos_routes.py`: full route lifecycle (`/run`, `/reveal`, `/result` win and loss, `/run/reset`, `/stats`), per-difficulty isolation (an Easy run and a Hell run for the same user don't interfere).
- Frontend: `tsc --noEmit` + `next build` as the baseline check already used throughout this project; no existing frontend test runner to extend.
