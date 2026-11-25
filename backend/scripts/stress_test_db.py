# backend/scripts/stress_test_db.py
"""Generate 1,000 realistic active users + challenges in an isolated PostgreSQL
stress-test database and measure exact disk footprint and query latencies.

Usage:
    .venv/Scripts/python.exe backend/scripts/stress_test_db.py --users 1000
"""
from __future__ import annotations

import argparse
import random
import sys
import time
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app.models  # noqa: E402,F401 -- registers every SQLAlchemy model onto Base.metadata
from app.core.config import Config  # noqa: E402
from app.core.extensions import Base  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.character import Killer, Survivor  # noqa: E402
from app.models.perk import Perk  # noqa: E402
from scripts.stress_test_data import generate_users_and_challenges  # noqa: E402

# Credentials and host come from DATABASE_URL (the same setting the app uses); only the database name differs.
SOURCE_URL = make_url(Config.SQLALCHEMY_DATABASE_URI)
ADMIN_URL = SOURCE_URL.set(database="postgres")
STRESS_DB = "lemondbd_stress_test"
STRESS_URL = SOURCE_URL.set(database=STRESS_DB)


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

    if SOURCE_URL.database == STRESS_DB:
        raise SystemExit(f"DATABASE_URL points at '{STRESS_DB}', which this script drops. Point it at the real database.")

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
