# backend/scripts/normalize_export/phase_maps.py
"""Phase for maps: realm and source become integer foreign keys."""
from __future__ import annotations

from .bootstrap import DEFAULT_SOURCE_CODE, name_key
from .identity import IdAssigner, by_map_id, fk
from .rows import ordered, prune
from .state import Conversion
from .translations import strip_moved_translations, tidy_text


def convert_maps(s: Conversion) -> None:
    """Maps, pointing at their realm and callout source by id."""
    maps = s.maps
    realm_ids_by_key = s.realm_ids_by_key
    source_ids_by_code = s.source_ids_by_code
    stats = s.stats
    # ---- maps ---------------------------------------------------------------
    assign_map = IdAssigner(maps, by_map_id)
    new_maps = []
    unresolved_realms = []
    for position, m in enumerate(maps, start=1):
        row = prune(
            dict(m), "realm", "realm_id", "source", "source_label",
            "layout_type", "pallet_density", "jungle_gyms_count",
            "is_shack", "is_main_building",
            # A byte-identical copy of callout_image_url on all 58 rows.
            "image_url",
            # `objectives` was empty on all 58 maps. `tiles` was 290 rows made
            # of five generic placeholder names repeated onto every map, which
            # the frontend's own mapLandmarks.ts supersedes with real per-map
            # callouts. Neither is a table any more.
            "tiles", "objectives",
        )
        row["id"] = assign_map(m, position)
        realm_id = fk(m, "realm_id", lambda: realm_ids_by_key.get(name_key(m.get("realm"))))
        if realm_id is None:
            unresolved_realms.append(m.get("realm") or m.get("map_id"))
        row["realm_id"] = realm_id
        # `map_id` is gone: a second identity on a table that already had a
        # primary key, spelling out the provider, the realm and the name --
        # which are `source_id`, `realm_id` and `name` on this same row.
        row.pop("map_id", None)
        row["source_id"] = fk(
            m, "source_id",
            lambda: source_ids_by_code.get((m.get("source") or DEFAULT_SOURCE_CODE).strip().lower()),
        )
        s.moved_translations += strip_moved_translations(row, "realm")
        promoted, collapsed = tidy_text(row, "maps")
        s.promoted_en += promoted
        s.collapsed_translations += collapsed
        new_maps.append(ordered(row, "id", "name", "realm_id", "source_id"))
    stats["maps"] = {
        "count": len(new_maps),
        "realm_linked": sum(1 for m in new_maps if m.get("realm_id")),
        "unresolved_realms": sorted({r for r in unresolved_realms if r}),
    }
    s.new_maps = new_maps
