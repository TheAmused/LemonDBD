# backend/scripts/normalize_export/fileio.py
"""Reading and writing the seed JSON files (single files and per-owner shards)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .bootstrap import name_key

EXPORT_META = ("version", "exported_at", "source", "target", "count")


def load(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Return (rows, envelope). The envelope is the version/source wrapper."""
    if not path.exists():
        return [], {}
    with open(path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)
    key = payload.get("target") or path.stem
    return list(payload.get(key) or []), payload


def load_many(folder: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Every row across a folder of shard files, in file-name order.

    Add-ons are sharded one file per owner -- `addons/killers/the_trapper.json`
    holds exactly The Trapper's twenty -- so a change to one killer's add-ons
    is a twenty-line diff instead of a hunk buried in a 2 MB file. The seeder
    reads them the same way: `load_static_seed_payload` walks `content/`
    recursively and concatenates every file that declares the same `target`.
    """
    rows: list[dict[str, Any]] = []
    envelope: dict[str, Any] = {}
    if not folder.is_dir():
        return rows, envelope
    for path in sorted(folder.glob("*.json")):
        shard, shard_env = load(path)
        rows.extend(shard)
        envelope = envelope or shard_env
    return rows, envelope


def shard_name(label: str) -> str:
    """`"The Trapper"` -> `"the_trapper"`, for a shard file name."""
    return name_key(label).replace(" ", "_") or "unassigned"


def dump_many(
    folder: Path,
    envelope: dict[str, Any],
    key: str,
    rows: list[dict[str, Any]],
    shard_of,
    dry: bool,
) -> None:
    """Write `rows` into one file per owner, and say what was written."""
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(shard_of(row), []).append(row)

    if dry:
        print(f"[dry-run] {folder}/: {len(grouped)} file(s), {len(rows)} row(s)")
        return

    folder.mkdir(parents=True, exist_ok=True)
    written = set()
    for shard, shard_rows in sorted(grouped.items()):
        dump(folder / f"{shard}.json", envelope, key, shard_rows, dry)
        written.add(f"{shard}.json")
    # An owner that lost all of its rows leaves a file behind that would keep
    # seeding them; empty it rather than leave a stale shard.
    for stale in folder.glob("*.json"):
        if stale.name not in written:
            dump(stale, envelope, key, [], dry)


def dump(path: Path, envelope: dict[str, Any], key: str, rows: list[dict[str, Any]], dry: bool) -> None:
    out = {k: envelope.get(k) for k in EXPORT_META if k in envelope}
    out["version"] = "3.0"
    out["target"] = key
    out[key] = rows
    out.pop("count", None)  # derivable from the array; one fewer thing to keep true
    if dry:
        return
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
