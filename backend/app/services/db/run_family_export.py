# backend/app/services/db/run_family_export.py
from datetime import datetime
from typing import Any
from sqlalchemy import select, delete
from app.core.extensions import db
from app.core.json_provider import safe_json_loads
from app.models.base import column_dict
from app.models.user import User

_DATETIME_FIELDS = {"timestamp", "created_at", "updated_at", "snapshot_at"}

# Backups written while these columns were TEXT carry the old "<name>_json" key
# holding a JSON string. Same old name maps to the same column in every table.
_LEGACY_JSON_COLUMNS = {
    "completed_killers_json": "completed_killers",
    "checkpoint_killers_json": "checkpoint_killers",
    "used_perks_json": "used_perks",
    "checkpoint_used_perks_json": "checkpoint_used_perks",
    "current_perks_json": "current_perks",
    "current_addon_rarities_json": "current_addon_rarities",
    "owned_killers_json": "owned_killer_ids",
    "unlocked_perks_json": "unlocked_perk_ids",
    "addon_rarities_json": "addon_rarities",
    "perks_json": "perks",
    "completed_characters_json": "completed_characters",
    "checkpoint_characters_json": "checkpoint_characters",
    "current_loadout_json": "current_loadout",
    "owned_characters_json": "owned_character_ids",
    "unlocked_perk_names_json": "unlocked_perk_names",
    "checkpoint_completed_killers_json": "checkpoint_completed_killers",
    "checkpoint_unlocked_perk_names_json": "checkpoint_unlocked_perk_names",
    "pages_json": "pages",
}


def _parse_datetime(val: str | None) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        return None


def _upgrade_legacy_keys(row: dict[str, Any]) -> dict[str, Any]:
    """Rename old "<name>_json" string keys to their JSON column. A row that
    already has the new key (old exports sent both) keeps that value."""
    upgraded: dict[str, Any] = {}
    for key, value in row.items():
        column = _LEGACY_JSON_COLUMNS.get(key)
        if column is None:
            upgraded[key] = value
        elif column not in row:
            parsed = safe_json_loads(value) if isinstance(value, str) else value
            if parsed is not None:
                upgraded[column] = parsed
    return upgraded


def export_run_family(
    export_data: dict[str, Any],
    counts: dict[str, int],
    name: str,
    run_model: type,
    log_model: type,
    log_relation_attr: str,
) -> None:
    """Export every row of `run_model`, nesting its `log_relation_attr` collection
    (already ordered by the model's own relationship `order_by`) as `match_logs`,
    with the owning user resolved to `username` instead of the source DB's `user_id`."""
    runs = db.session.scalars(select(run_model).order_by(run_model.id)).all()
    serialized = []
    for run in runs:
        owner = db.session.get(User, run.user_id)
        if not owner:
            continue
        row: dict[str, object] = column_dict(run, {"id", "user_id"})
        row["username"] = owner.username
        row["match_logs"] = [
            column_dict(log, {"id", "run_id"}) for log in getattr(run, log_relation_attr)
        ]
        serialized.append(row)
    export_data[name] = serialized
    counts[name] = len(serialized)


def import_run_family(
    data: dict[str, Any],
    target_keys: set[str],
    summary: dict[str, dict[str, int]],
    name: str,
    run_model: type,
    log_model: type,
    log_relation_attr: str,
    run_natural_keys: list[str],
    user_map: dict[str, int],
) -> None:
    """Upsert each run by (username, *run_natural_keys); replace its child logs
    wholesale (delete existing, insert the exported set), mirroring the
    tiles/objectives replace-on-import pattern already used for maps."""
    if name not in target_keys or name not in data:
        return

    created = updated = 0
    run_fk_attr = next(
        rel.key for rel in log_model.__mapper__.relationships if rel.mapper.class_ == run_model
    )
    run_fk_column = next(iter(log_model.__mapper__.relationships[run_fk_attr].local_columns)).name

    for row in map(_upgrade_legacy_keys, data[name]):
        username = row.get("username")
        u_id = user_map.get(username) if username else None
        if not u_id:
            continue

        filters = [run_model.user_id == u_id] + [
            getattr(run_model, key) == row.get(key) for key in run_natural_keys
        ]
        run_obj = db.session.scalar(select(run_model).where(*filters))
        is_new = run_obj is None
        if is_new:
            run_obj = run_model(user_id=u_id, **{key: row.get(key) for key in run_natural_keys})
            db.session.add(run_obj)

        skip_fields = {"username", "match_logs", "user_id"} | set(run_natural_keys)
        for k, v in row.items():
            if k in skip_fields or k == "id" or not hasattr(run_obj, k):
                continue
            setattr(run_obj, k, _parse_datetime(v) if k in _DATETIME_FIELDS else v)

        db.session.flush()
        if is_new:
            created += 1
        else:
            updated += 1

        db.session.execute(delete(log_model).where(getattr(log_model, run_fk_column) == run_obj.id))
        for log_row in map(_upgrade_legacy_keys, row.get("match_logs", [])):
            log_kwargs: dict[str, Any] = {}
            for k, v in log_row.items():
                if k == "id" or not hasattr(log_model, k):
                    continue
                log_kwargs[k] = _parse_datetime(v) if k in _DATETIME_FIELDS else v
            log_kwargs[run_fk_column] = run_obj.id
            db.session.add(log_model(**log_kwargs))

    db.session.flush()
    summary[name] = {"created": created, "updated": updated}
