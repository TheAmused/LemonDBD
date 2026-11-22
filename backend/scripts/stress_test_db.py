# backend/scripts/stress_test_db.py
"""Generate 1,000 realistic active users + challenges in an isolated PostgreSQL
stress-test database and measure exact disk footprint and query latencies.

Usage:
    .venv/Scripts/python.exe backend/scripts/stress_test_db.py --users 1000
"""
from __future__ import annotations

import argparse
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure app.core.extensions / models can import without a live Flask app config
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/dbd_db")

import app.models  # noqa: E402,F401 -- registers every SQLAlchemy model onto Base.metadata
from app.core.extensions import Base  # noqa: E402
from app.models.challenge_completion import ChallengeCompletionRecord  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.chaos import ChaosMatchLog, ChaosRun  # noqa: E402
from app.models.character import Killer, Survivor  # noqa: E402
from app.models.gauntlet import GauntletMatchLog, GauntletRun  # noqa: E402
from app.models.history import HistoryMatchLog, HistoryRun  # noqa: E402
from app.models.id_please import IdPleaseMatchLog, IdPleaseRun  # noqa: E402
from app.models.page_streak import PageStreakPageLog, PageStreakRun  # noqa: E402
from app.models.perk import Perk  # noqa: E402
from app.models.user import (  # noqa: E402
    SHOWCASE_GRADE_RANKS,
    SHOWCASE_PLAYER_TITLES,
    User,
    UserCharacterOwnership,
    UserPerkOwnership,
    UserShowcase,
)

ADMIN_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/postgres"
SOURCE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/dbd_db"
STRESS_DB = "lemondbd_stress_test"
STRESS_URL = f"postgresql+psycopg://postgres:postgres@127.0.0.1:5432/{STRESS_DB}"


def _fmt_bytes(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024**2:
        return f"{n / 1024:.1f} KB"
    if n < 1024**3:
        return f"{n / (1024**2):.2f} MB"
    return f"{n / (1024**3):.2f} GB"


def _recreate_stress_db() -> None:
    admin_engine = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(
            text(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = :db AND pid <> pg_backend_pid()"
            ),
            {"db": STRESS_DB},
        )
        conn.execute(text(f"DROP DATABASE IF EXISTS {STRESS_DB}"))
        conn.execute(text(f"CREATE DATABASE {STRESS_DB}"))
    admin_engine.dispose()


def _drop_stress_db() -> None:
    admin_engine = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(
            text(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = :db AND pid <> pg_backend_pid()"
            ),
            {"db": STRESS_DB},
        )
        conn.execute(text(f"DROP DATABASE IF EXISTS {STRESS_DB}"))
    admin_engine.dispose()


def _copy_catalog(source_engine: Any, stress_engine: Any) -> tuple[list[int], list[int], list[int], list[int]]:
    """Copy real killer, survivor, and perk IDs from dbd_db so foreign keys are authentic."""
    with Session(source_engine) as src, Session(stress_engine) as dst:
        for model in (Chapter, Killer, Survivor, Perk):
            cols = [c.name for c in model.__table__.columns]
            rows = [{c: getattr(obj, c) for c in cols} for obj in src.query(model).all()]
            if rows:
                dst.bulk_insert_mappings(model, rows)
                dst.flush()
        dst.commit()

        killer_ids = [r[0] for r in dst.query(Killer.id).all()]
        survivor_ids = [r[0] for r in dst.query(Survivor.id).all()]
        killer_perk_ids = [r[0] for r in dst.query(Perk.id).filter(Perk.role.ilike("killer")).all()]
        survivor_perk_ids = [r[0] for r in dst.query(Perk.id).filter(Perk.role.ilike("survivor")).all()]
        return killer_ids, survivor_ids, killer_perk_ids, survivor_perk_ids


def _get_db_size(engine: Any) -> int:
    with engine.connect() as conn:
        return int(conn.execute(text("SELECT pg_database_size(current_database())")).scalar_one())


def _get_table_stats(engine: Any) -> list[dict[str, Any]]:
    sql = text(
        """
        SELECT
            c.relname AS table_name,
            COALESCE(s.n_live_tup, 0) AS row_count,
            pg_table_size(c.oid) AS table_bytes,
            pg_indexes_size(c.oid) AS index_bytes,
            pg_total_relation_size(c.oid) AS total_bytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY pg_total_relation_size(c.oid) DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql).mappings().all()
        return [dict(r) for r in rows]


def generate_users_and_challenges(
    stress_engine: Any,
    user_count: int,
    killer_ids: list[int],
    survivor_ids: list[int],
    killer_perk_ids: list[int],
    survivor_perk_ids: list[int],
    seed: int,
) -> dict[str, int]:
    rng = random.Random(seed)
    all_perk_ids = killer_perk_ids + survivor_perk_ids
    now = datetime.now(timezone.utc)
    fake_pw_hash = "$2b$12$stressTestPlaceholderHashValue000000000000000000000000"

    counts = {
        "users": 0,
        "character_ownerships": 0,
        "perk_ownerships": 0,
        "gauntlet_runs": 0,
        "gauntlet_logs": 0,
        "chaos_runs": 0,
        "chaos_logs": 0,
        "history_runs": 0,
        "history_logs": 0,
        "page_streak_runs": 0,
        "page_streak_logs": 0,
        "id_please_runs": 0,
        "id_please_logs": 0,
        "completions": 0,
    }

    batch_size = 100
    for start in range(1, user_count + 1, batch_size):
        end = min(start + batch_size, user_count + 1)
        with Session(stress_engine) as session:
            # 1. Insert users
            user_rows = []
            for idx in range(start, end):
                created = now - timedelta(days=rng.randint(1, 365))
                user_rows.append(
                    {
                        "login": f"stress_user_{idx:04d}",
                        "username": f"Player_{idx:04d}",
                        "email": f"stress_{idx:04d}@example.com",
                        "password_hash": fake_pw_hash,
                        "role": "user",
                        "is_active": True,
                        "is_verified": True,
                        "onboarding_completed_at": created,
                        "preferred_language": rng.choice(["en", "pl", "de", "es", "ja"]),
                        "created_at": created,
                        "updated_at": now - timedelta(hours=rng.randint(1, 72)),
                    }
                )
            inserted_users = session.execute(
                User.__table__.insert().returning(User.id), user_rows
            ).scalars().all()
            counts["users"] += len(inserted_users)

            showcases = []
            char_ownerships = []
            perk_ownerships = []
            completions = []

            gauntlet_runs_data: list[tuple[dict[str, Any], int, int]] = []
            chaos_runs_data: list[tuple[dict[str, Any], int, int]] = []
            history_runs_data: list[tuple[dict[str, Any], int, int]] = []
            page_runs_data: list[tuple[dict[str, Any], int]] = []
            id_please_runs_data: list[tuple[dict[str, Any], int, int]] = []

            for uid in inserted_users:
                # 2. Owned characters (25%-100%)
                owned_k = rng.sample(killer_ids, rng.randint(max(5, len(killer_ids) // 4), len(killer_ids)))
                owned_s = rng.sample(survivor_ids, rng.randint(max(5, len(survivor_ids) // 4), len(survivor_ids)))
                for kid in owned_k:
                    char_ownerships.append({"user_id": uid, "killer_id": kid, "survivor_id": None, "is_owned": True})
                for sid in owned_s:
                    char_ownerships.append({"user_id": uid, "killer_id": None, "survivor_id": sid, "is_owned": True})

                # 3. Unlocked perks (30%-100%)
                unlocked_p = rng.sample(all_perk_ids, rng.randint(max(20, len(all_perk_ids) * 3 // 10), len(all_perk_ids)))
                for pid in unlocked_p:
                    perk_ownerships.append({"user_id": uid, "perk_id": pid, "is_unlocked": True})

                # 4. Showcase
                showcases.append(
                    {
                        "user_id": uid,
                        "player_title": rng.choice(SHOWCASE_PLAYER_TITLES),
                        "devotion_level": rng.randint(0, 25),
                        "grade_rank": rng.choice(SHOWCASE_GRADE_RANKS),
                        "survivor_main_id": rng.choice(owned_s),
                        "survivor_main_prestige": rng.randint(0, 100),
                        "survivor_perk_ids": rng.sample(survivor_perk_ids, 4),
                        "killer_main_id": rng.choice(owned_k),
                        "killer_main_prestige": rng.randint(0, 100),
                        "killer_perk_ids": rng.sample(killer_perk_ids, 4),
                        "updated_at": now,
                    }
                )

                # 5. Gauntlet runs (1-3 per user, mix of completed and in_progress, multiple attempts)
                g_combos = rng.sample([("killer", "original"), ("killer", "lemon"), ("survivor", "original"), ("survivor", "lemon")], rng.randint(1, 3))
                for role, mode in g_combos:
                    completed = rng.random() < 0.35
                    attempts = rng.randint(1, 14)
                    matches = rng.randint(6, 35)
                    wins = int(matches * rng.uniform(0.45, 0.85))
                    pool = owned_k if role == "killer" else owned_s
                    gauntlet_runs_data.append(
                        (
                            {
                                "user_id": uid,
                                "role": role,
                                "game_mode": mode,
                                "status": "completed" if completed else "in_progress",
                                "attempts": 0 if completed else attempts,
                                "attempt": attempts + 1,
                                "total_wins": wins,
                                "total_losses": matches - wins,
                                "playthrough_matches": 0 if completed else rng.randint(1, 10),
                                "attempt_matches": 0 if completed else rng.randint(1, 8),
                                "current_streak": len(pool) if completed else rng.randint(0, len(pool) // 2),
                                "best_streak": len(pool) if completed else rng.randint(2, len(pool) // 2 + 3),
                                "last_checkpoint_streak": rng.choice([0, 5, 10, 15]),
                                "target_revealed": True,
                                "current_character_id": str(rng.choice(pool)),
                                "completed_characters": [str(x) for x in pool[: rng.randint(1, min(12, len(pool)))]],
                                "checkpoint_characters": [],
                                "current_loadout": {"perks": rng.sample(all_perk_ids, 4)},
                                "owned_character_ids": pool,
                                "tokens": rng.randint(0, 12),
                                "last_token_roll": rng.randint(0, 3),
                                "bonus_perk_slots": rng.randint(0, 2),
                                "created_at": now - timedelta(days=rng.randint(1, 90)),
                                "updated_at": now,
                            },
                            attempts + 1,
                            matches,
                        )
                    )
                    if completed:
                        completions.append(
                            {
                                "user_id": uid,
                                "mode": "gauntlet",
                                "variant": f"{role}_{mode}",
                                "attempts_taken": attempts,
                                "matches_played": matches,
                                "unlocked_characters_count": len(pool),
                                "full_roster": len(pool) == (len(killer_ids) if role == "killer" else len(survivor_ids)),
                                "pages_count": None,
                                "completed_at": now - timedelta(days=rng.randint(0, 60)),
                            }
                        )

                # 6. Chaos runs (0-2 per user)
                for diff in rng.sample(["normal", "hardcore"], rng.randint(0, 2)):
                    completed = rng.random() < 0.25
                    attempts = rng.randint(1, 10)
                    matches = rng.randint(4, 25)
                    wins = int(matches * rng.uniform(0.4, 0.8))
                    chaos_runs_data.append(
                        (
                            {
                                "user_id": uid,
                                "difficulty": diff,
                                "status": "completed" if completed else "in_progress",
                                "attempts": 0 if completed else attempts,
                                "attempt": attempts + 1,
                                "total_wins": wins,
                                "total_losses": matches - wins,
                                "playthrough_matches": 0 if completed else rng.randint(1, 8),
                                "attempt_matches": 0 if completed else rng.randint(1, 6),
                                "current_streak": len(owned_k) if completed else rng.randint(0, 10),
                                "best_streak": len(owned_k) if completed else rng.randint(1, 15),
                                "last_checkpoint_streak": 0,
                                "completed_killers": [str(x) for x in owned_k[: rng.randint(1, min(10, len(owned_k)))]],
                                "checkpoint_killers": [],
                                "used_perks": [f"perk_{p}" for p in rng.sample(killer_perk_ids, min(20, len(killer_perk_ids)))],
                                "checkpoint_used_perks": [],
                                "current_perks": [{"id": pid} for pid in rng.sample(killer_perk_ids, 4)],
                                "current_addon_rarities": ["Rare", "Uncommon"],
                                "owned_killer_ids": owned_k,
                                "unlocked_perk_ids": [p for p in unlocked_p if p in killer_perk_ids],
                                "perks_revealed": True,
                                "created_at": now - timedelta(days=rng.randint(1, 90)),
                                "updated_at": now,
                            },
                            attempts + 1,
                            matches,
                        )
                    )
                    if completed:
                        completions.append(
                            {
                                "user_id": uid,
                                "mode": "chaos",
                                "variant": diff,
                                "attempts_taken": attempts,
                                "matches_played": matches,
                                "unlocked_characters_count": len(owned_k),
                                "full_roster": len(owned_k) == len(killer_ids),
                                "pages_count": None,
                                "completed_at": now - timedelta(days=rng.randint(0, 60)),
                            }
                        )

                # 7. History runs (0-1 per user)
                if rng.random() < 0.7:
                    h_mode = rng.choice(["normal", "hardcore"])
                    completed = rng.random() < 0.3
                    attempts = rng.randint(1, 8)
                    matches = rng.randint(3, 20)
                    history_runs_data.append(
                        (
                            {
                                "user_id": uid,
                                "mode": h_mode,
                                "status": "completed" if completed else "in_progress",
                                "attempts": 0 if completed else attempts,
                                "attempt": attempts + 1,
                                "total_wins": matches // 2,
                                "total_losses": matches - matches // 2,
                                "playthrough_matches": 0 if completed else rng.randint(1, 6),
                                "attempt_matches": 0 if completed else rng.randint(1, 5),
                                "current_row_index": rng.randint(0, 12),
                                "total_killers_beaten": rng.randint(0, 20),
                                "best_killers_beaten": rng.randint(2, 25),
                                "checkpoint_row_index": 0,
                                "checkpoint_total_killers_beaten": 0,
                                "completed_killers": [str(x) for x in owned_k[: rng.randint(1, min(8, len(owned_k)))]],
                                "unlocked_perk_names": [f"Perk {i}" for i in range(12)],
                                "checkpoint_completed_killers": [],
                                "checkpoint_unlocked_perk_names": [],
                                "owned_killer_ids": owned_k,
                                "created_at": now - timedelta(days=rng.randint(1, 90)),
                                "updated_at": now,
                            },
                            attempts + 1,
                            matches,
                        )
                    )

                # 8. Page Streak runs (1-3 killers per user)
                for kid in rng.sample(owned_k, rng.randint(1, min(3, len(owned_k)))):
                    completed = rng.random() < 0.4
                    attempts = rng.randint(1, 6)
                    page_runs_data.append(
                        (
                            {
                                "user_id": uid,
                                "killer": f"killer_{kid}",
                                "status": "completed" if completed else "in_progress",
                                "attempts": 0 if completed else attempts,
                                "attempt": attempts + 1,
                                "total_wins": rng.randint(1, 10),
                                "total_losses": rng.randint(0, 5),
                                "playthrough_matches": rng.randint(1, 8),
                                "attempt_matches": rng.randint(1, 6),
                                "current_page": rng.randint(1, 8),
                                "best_page": rng.randint(2, 10),
                                "pages": [[f"p{i}" for i in range(4)] for _ in range(rng.randint(2, 6))],
                                "snapshot_at": now,
                                "created_at": now - timedelta(days=rng.randint(1, 60)),
                                "updated_at": now,
                            },
                            rng.randint(2, 10),
                        )
                    )

                # 9. ID, Please runs (1-2 per user)
                for lane, diff in rng.sample([("mixed", "normal"), ("survivor", "hardcore"), ("killer", "hardcore_plus")], rng.randint(1, 2)):
                    attempts = rng.randint(1, 10)
                    matches = rng.randint(4, 24)
                    id_please_runs_data.append(
                        (
                            {
                                "user_id": uid,
                                "lane": lane,
                                "difficulty": diff,
                                "status": "in_progress",
                                "attempts": attempts,
                                "attempt": attempts + 1,
                                "total_wins": matches - attempts,
                                "total_losses": attempts,
                                "playthrough_matches": rng.randint(1, 8),
                                "attempt_matches": rng.randint(1, 6),
                                "current_streak": rng.randint(0, 12),
                                "best_streak": rng.randint(2, 20),
                                "last_checkpoint_streak": 0,
                                "algo_version": 1,
                                "opening_side": "survivor" if lane == "survivor" else "killer",
                                "opening_perk_ids": rng.sample(all_perk_ids, 4),
                                "perk_seed": rng.randint(0, 99999),
                                "current_match": rng.randint(1, 12),
                                "current_loadout": {"number": 1, "side": "killer", "character_id": owned_k[0], "perk_ids": rng.sample(killer_perk_ids, 4)},
                                "before_loadout": {},
                                "used_character_ids": {"killer": owned_k[:3], "survivor": owned_s[:3]},
                                "checkpoint_loadout": {},
                                "created_at": now - timedelta(days=rng.randint(1, 60)),
                                "updated_at": now,
                            },
                            attempts + 1,
                            matches,
                        )
                    )

            session.bulk_insert_mappings(UserShowcase, showcases)
            session.bulk_insert_mappings(UserCharacterOwnership, char_ownerships)
            session.bulk_insert_mappings(UserPerkOwnership, perk_ownerships)
            if completions:
                session.bulk_insert_mappings(ChallengeCompletionRecord, completions)
            counts["character_ownerships"] += len(char_ownerships)
            counts["perk_ownerships"] += len(perk_ownerships)
            counts["completions"] += len(completions)

            # Insert challenge runs + match logs
            if gauntlet_runs_data:
                g_ids = session.execute(
                    GauntletRun.__table__.insert().returning(GauntletRun.id),
                    [r[0] for r in gauntlet_runs_data],
                ).scalars().all()
                counts["gauntlet_runs"] += len(g_ids)
                g_logs = []
                for rid, (rdict, max_att, n_logs) in zip(g_ids, gauntlet_runs_data):
                    for k in range(n_logs):
                        g_logs.append(
                            {
                                "run_id": rid,
                                "attempt": rng.randint(1, max_att),
                                "result": "win" if rng.random() < 0.7 else "loss",
                                "streak_before": k,
                                "streak_after": k + 1,
                                "role": rdict["role"],
                                "character_id": rdict["current_character_id"],
                                "perks": [{"id": pid} for pid in rng.sample(all_perk_ids, 4)],
                                "timestamp": now - timedelta(hours=n_logs - k),
                                "triggered_by": "player",
                            }
                        )
                session.bulk_insert_mappings(GauntletMatchLog, g_logs)
                counts["gauntlet_logs"] += len(g_logs)

            if chaos_runs_data:
                c_ids = session.execute(
                    ChaosRun.__table__.insert().returning(ChaosRun.id),
                    [r[0] for r in chaos_runs_data],
                ).scalars().all()
                counts["chaos_runs"] += len(c_ids)
                c_logs = []
                for rid, (_, max_att, n_logs) in zip(c_ids, chaos_runs_data):
                    for k in range(n_logs):
                        c_logs.append(
                            {
                                "run_id": rid,
                                "attempt": rng.randint(1, max_att),
                                "result": "win" if rng.random() < 0.65 else "loss",
                                "streak_before": k,
                                "streak_after": k + 1,
                                "killer_id": str(rng.choice(killer_ids)),
                                "perks": [{"id": pid} for pid in rng.sample(killer_perk_ids, 4)],
                                "addon_rarities": ["Rare", "Uncommon"],
                                "timestamp": now - timedelta(hours=n_logs - k),
                                "triggered_by": "player",
                            }
                        )
                session.bulk_insert_mappings(ChaosMatchLog, c_logs)
                counts["chaos_logs"] += len(c_logs)

            if history_runs_data:
                h_ids = session.execute(
                    HistoryRun.__table__.insert().returning(HistoryRun.id),
                    [r[0] for r in history_runs_data],
                ).scalars().all()
                counts["history_runs"] += len(h_ids)
                h_logs = []
                for rid, (_, max_att, n_logs) in zip(h_ids, history_runs_data):
                    for k in range(n_logs):
                        h_logs.append(
                            {
                                "run_id": rid,
                                "attempt": rng.randint(1, max_att),
                                "result": "win" if rng.random() < 0.65 else "loss",
                                "streak_before": k,
                                "streak_after": k + 1,
                                "killer_id": str(rng.choice(killer_ids)),
                                "row_index": k % 12,
                                "timestamp": now - timedelta(hours=n_logs - k),
                                "triggered_by": "player",
                            }
                        )
                session.bulk_insert_mappings(HistoryMatchLog, h_logs)
                counts["history_logs"] += len(h_logs)

            if page_runs_data:
                p_ids = session.execute(
                    PageStreakRun.__table__.insert().returning(PageStreakRun.id),
                    [r[0] for r in page_runs_data],
                ).scalars().all()
                counts["page_streak_runs"] += len(p_ids)
                p_logs = []
                for rid, (_, n_logs) in zip(p_ids, page_runs_data):
                    for k in range(n_logs):
                        p_logs.append(
                            {
                                "run_id": rid,
                                "attempt": 1,
                                "result": "win" if rng.random() < 0.7 else "loss",
                                "page_number": k + 1,
                                "perks": [f"perk_{pid}" for pid in rng.sample(killer_perk_ids, 4)],
                                "timestamp": now - timedelta(hours=n_logs - k),
                                "triggered_by": "player",
                            }
                        )
                session.bulk_insert_mappings(PageStreakPageLog, p_logs)
                counts["page_streak_logs"] += len(p_logs)

            if id_please_runs_data:
                ip_ids = session.execute(
                    IdPleaseRun.__table__.insert().returning(IdPleaseRun.id),
                    [r[0] for r in id_please_runs_data],
                ).scalars().all()
                counts["id_please_runs"] += len(ip_ids)
                ip_logs = []
                for rid, (_, max_att, n_logs) in zip(ip_ids, id_please_runs_data):
                    for k in range(n_logs):
                        ip_logs.append(
                            {
                                "run_id": rid,
                                "attempt": rng.randint(1, max_att),
                                "result": "win" if rng.random() < 0.75 else "loss",
                                "streak_before": k,
                                "streak_after": k + 1,
                                "match_number": k + 1,
                                "side": "killer",
                                "character_id": rng.choice(killer_ids),
                                "perk_ids": rng.sample(killer_perk_ids, 4),
                                "timestamp": now - timedelta(hours=n_logs - k),
                                "triggered_by": "player",
                            }
                        )
                session.bulk_insert_mappings(IdPleaseMatchLog, ip_logs)
                counts["id_please_logs"] += len(ip_logs)

            session.commit()

    return counts


def _benchmark_queries(stress_engine: Any, user_count: int) -> dict[str, float]:
    rng = random.Random(99)
    with stress_engine.connect() as conn:
        user_ids = conn.execute(text("SELECT id FROM users ORDER BY id LIMIT :n"), {"n": user_count}).scalars().all()
        sample_uids = rng.sample(user_ids, min(50, len(user_ids)))

        t0 = time.perf_counter()
        for uid in sample_uids:
            conn.execute(text("SELECT perk_id, is_unlocked FROM user_perk_ownerships WHERE user_id = :u"), {"u": uid}).all()
        t_perks = (time.perf_counter() - t0) / len(sample_uids) * 1000

        t0 = time.perf_counter()
        for uid in sample_uids:
            conn.execute(text("SELECT survivor_id, killer_id FROM user_character_ownerships WHERE user_id = :u"), {"u": uid}).all()
        t_chars = (time.perf_counter() - t0) / len(sample_uids) * 1000

        t0 = time.perf_counter()
        for uid in sample_uids:
            conn.execute(
                text(
                    "SELECT r.id, r.status, count(l.id) FROM gauntlet_runs r "
                    "LEFT JOIN gauntlet_match_logs l ON l.run_id = r.id "
                    "WHERE r.user_id = :u GROUP BY r.id"
                ),
                {"u": uid},
            ).all()
        t_gauntlet = (time.perf_counter() - t0) / len(sample_uids) * 1000

        t0 = time.perf_counter()
        conn.execute(
            text(
                "SELECT mode, variant, count(*) FROM challenge_completion_records "
                "GROUP BY mode, variant"
            )
        ).all()
        t_leaderboard = (time.perf_counter() - t0) * 1000

    return {
        "user_perks_avg_ms": t_perks,
        "user_chars_avg_ms": t_chars,
        "user_gauntlet_with_logs_avg_ms": t_gauntlet,
        "global_completion_agg_ms": t_leaderboard,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="PostgreSQL 1,000-user stress test & storage estimator.")
    parser.add_argument("--users", type=int, default=1000, help="Number of active users to generate.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument("--keep", action="store_true", help="Keep the temporary stress-test database afterwards.")
    args = parser.parse_args()

    print(f"[1/5] Recreating isolated PostgreSQL database '{STRESS_DB}'...")
    _recreate_stress_db()

    source_engine = create_engine(SOURCE_URL)
    stress_engine = create_engine(STRESS_URL)
    try:
        print("[2/5] Creating schema & copying catalog (killers, survivors, perks)...")
        Base.metadata.create_all(stress_engine)
        k_ids, s_ids, kp_ids, sp_ids = _copy_catalog(source_engine, stress_engine)
        baseline_bytes = _get_db_size(stress_engine)
        print(f"      Catalog: {len(k_ids)} killers, {len(s_ids)} survivors, {len(kp_ids) + len(sp_ids)} perks")
        print(f"      Baseline DB size (0 users): {_fmt_bytes(baseline_bytes)}")

        print(f"[3/5] Generating {args.users} active users with unlocked perks, characters & challenges...")
        t0 = time.perf_counter()
        counts = generate_users_and_challenges(stress_engine, args.users, k_ids, s_ids, kp_ids, sp_ids, args.seed)
        gen_s = time.perf_counter() - t0
        print(f"      Generated in {gen_s:.2f}s: {counts}")

        print("[4/5] Running VACUUM ANALYZE & measuring exact PostgreSQL storage...")
        with create_engine(STRESS_URL, isolation_level="AUTOCOMMIT").connect() as conn:
            conn.execute(text("VACUUM ANALYZE"))

        total_bytes = _get_db_size(stress_engine)
        delta_bytes = total_bytes - baseline_bytes
        per_user_bytes = delta_bytes / max(1, args.users)

        print("\n=== STORAGE SUMMARY ===")
        print(f"Baseline (catalog only):  {_fmt_bytes(baseline_bytes)}")
        print(f"Total ({args.users} active users): {_fmt_bytes(total_bytes)}")
        print(f"User data delta:          {_fmt_bytes(delta_bytes)} ({_fmt_bytes(int(per_user_bytes))} / user)")
        print(f"Projected 10,000 users:   {_fmt_bytes(int(baseline_bytes + per_user_bytes * 10000))}")

        print("\n=== TOP TABLES BY DISK SIZE ===")
        print(f"{'Table':<32} {'Rows':>10} {'Heap+TOAST':>12} {'Indexes':>12} {'Total':>12}")
        for row in _get_table_stats(stress_engine)[:18]:
            if row["row_count"] == 0 and row["total_bytes"] < 32768:
                continue
            print(
                f"{row['table_name']:<32} {row['row_count']:>10,} "
                f"{_fmt_bytes(row['table_bytes']):>12} {_fmt_bytes(row['index_bytes']):>12} {_fmt_bytes(row['total_bytes']):>12}"
            )

        print("\n[5/5] Running query latency benchmark (50 random users)...")
        bench = _benchmark_queries(stress_engine, args.users)
        for k, v in bench.items():
            print(f"  {k}: {v:.2f} ms")
    finally:
        source_engine.dispose()
        stress_engine.dispose()
        if not args.keep:
            _drop_stress_db()
            print(f"\nCleaned up temporary database '{STRESS_DB}'.")


if __name__ == "__main__":
    main()
