# backend/scripts/normalize_export/integrity.py
"""Referential-integrity check run over the converted tables before they are written."""
from __future__ import annotations

from typing import Any


def check_referential_integrity(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """Every foreign key points at a row that exists; no id is used twice."""
    ids = {name: {r["id"] for r in rows} for name, rows in tables.items()}
    problems = []

    for name, rows in tables.items():
        seen: set[int] = set()
        for row in rows:
            if row["id"] in seen:
                problems.append(f"{name}: duplicate id {row['id']}")
            seen.add(row["id"])

    references = [
        ("survivors", "chapter_id", "chapters"),
        ("killers", "chapter_id", "chapters"),
        ("perks", "survivor_id", "survivors"),
        ("perks", "killer_id", "killers"),
        ("items", "category_id", "item_categories"),
        ("killer_addons", "killer_id", "killers"),
        ("item_addons", "item_category_id", "item_categories"),
        ("offerings", "realm_id", "realms"),
        ("maps", "realm_id", "realms"),
        ("maps", "source_id", "map_sources"),
    ]
    for table, column, target in references:
        dangling = [r["id"] for r in tables[table]
                    if r.get(column) is not None and r[column] not in ids[target]]
        if dangling:
            problems.append(f"{table}.{column} -> {target}: {len(dangling)} dangling ({dangling[:5]})")

    for table, column in (("killer_addons", "killer_id"), ("item_addons", "item_category_id")):
        missing = [r["id"] for r in tables[table] if not r.get(column)]
        if missing:
            problems.append(f"{table}: {len(missing)} rows with no {column}")
    return problems
