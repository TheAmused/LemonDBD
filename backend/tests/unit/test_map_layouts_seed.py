# backend/tests/unit/test_map_layouts_seed.py
"""The map footprints in map_layouts.json agree with the map sizes beside them.

Each layout is the current wiki.gg outline traced on the 8 m (sqT) grid, in metres. A wrong
trace, a stale outline or a size typo shows up as an area that no longer matches `size_sq_meters`.
"""
import json
from pathlib import Path

import pytest

CONTENT = Path(__file__).resolve().parents[2] / "app" / "seeds" / "data" / "content"
SEED = CONTENT / "maps" / "lemondbd.json"
LAYOUTS_SEED = CONTENT / "map_layouts.json"
STATIC = Path(__file__).resolve().parents[2] / "app" / "static"

#: Forgotten Ruins' size counts the Dungeon too, whose outline the wiki does not publish.
PARTIAL_FLOORS = {"Forgotten Ruins"}


def _maps() -> list[dict]:
    with open(SEED, encoding="utf-8") as f:
        return json.load(f)["maps"]


def _map_layouts() -> dict[int, dict]:
    with open(LAYOUTS_SEED, encoding="utf-8") as f:
        return {item["map_id"]: item["layout_data"] for item in json.load(f)["map_layouts"]}


def _ring_area(ring: list[list[float]]) -> float:
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


@pytest.mark.unit
def test_every_map_is_drawn_and_from_our_own_source() -> None:
    maps = _maps()
    layouts = _map_layouts()
    assert all("layout" not in m for m in maps), "lemondbd.json maps must not contain inlined layout"
    assert len(maps) == 58
    assert len(layouts) == 58
    assert all(m["id"] in layouts for m in maps)
    assert {m["source_id"] for m in maps} == {2}
    with open(CONTENT / "map_sources.json", encoding="utf-8") as f:
        sources = {s["id"]: s["code"] for s in json.load(f)["map_sources"]}
    assert sources[2] == "lemondbd"


@pytest.mark.unit
def test_only_maps_without_a_published_outline_are_approximate() -> None:
    layouts = _map_layouts()
    approx = {m["name"] for m in _maps() if layouts.get(m["id"], {}).get("approx")}
    assert approx == {"The Underground Complex", "Police Station East Wing", "Police Station West Wing", "Trickster's Delusion"}


@pytest.mark.unit
def test_every_layout_matches_the_map_size() -> None:
    layouts = _map_layouts()
    for m in _maps():
        layout = layouts.get(m["id"])
        if not layout or m["name"] in PARTIAL_FLOORS:
            continue
        total = sum(_ring_area(r) for floor in layout["floors"] for r in floor["outline"])
        assert total == pytest.approx(m["size_sq_meters"], rel=0.03 if layout.get("approx") else 0.02), m["name"]


@pytest.mark.unit
def test_layout_shape_is_well_formed() -> None:
    layouts = _map_layouts()
    for m in _maps():
        layout = layouts.get(m["id"])
        if not layout:
            continue
        assert layout["v"] == 1 and layout["cell_m"] == 8
        assert "source" not in layout
        xs = [p[0] for f in layout["floors"] for r in f["outline"] for p in r]
        ys = [p[1] for f in layout["floors"] for r in f["outline"] for p in r]
        assert min(xs) == 0 and min(ys) == 0, m["name"]
        assert max(xs) == layout["width_m"] and max(ys) == layout["height_m"], m["name"]
        for floor in layout["floors"]:
            assert floor["label"] in (None, "upper", "lower"), m["name"]
            for ring in floor["outline"] + floor.get("blocked", []):
                assert len(ring) >= 3 and _ring_area(ring) > 0, m["name"]
                assert ring[0] != ring[-1], f"{m['name']}: rings are implicitly closed"


@pytest.mark.unit
def test_macmillan_variants_and_corrected_sizes() -> None:
    by_name = {m["name"]: m for m in _maps()}
    expected = {
        "Coal Tower": 132, "Coal Tower II": 136,
        "Groaning Storehouse": 156, "Groaning Storehouse II": 148,
        "Ironworks Of Misery": 160, "Ironworks Of Misery II": 156,
        "Shelter Woods": 176, "Shelter Woods II": 176,
        "Suffocation Pit": 160, "Suffocation Pit II": 152,
        "Disturbed Ward": 152, "Freddy Fazbears Pizza": 148, "Torment Creek": 156,
    }
    for name, tiles in expected.items():
        assert by_name[name]["size_sq_tiles"] == tiles, name
        assert by_name[name]["size_sq_meters"] == tiles * 64, name
    for name in ("Coal Tower II", "Groaning Storehouse II", "Ironworks Of Misery II", "Shelter Woods II", "Suffocation Pit II"):
        assert (STATIC / by_name[name]["callout_image_local_path"]).is_file(), name


@pytest.mark.unit
def test_map_ids_are_unique_and_contiguous() -> None:
    lemon_ids = sorted(m["id"] for m in _maps())
    assert lemon_ids == list(range(1, len(lemon_ids) + 1))

    with open(CONTENT / "maps" / "hens.json", encoding="utf-8") as f:
        hens_maps = json.load(f)["maps"]
    assert all(m["source_id"] == 1 for m in hens_maps)
    hens_ids = sorted(m["id"] for m in hens_maps)
    assert hens_ids == list(range(201, 201 + len(hens_maps)))
    assert set(lemon_ids).isdisjoint(hens_ids)


def _point_in_ring(x: float, y: float, ring: list[list[float]]) -> bool:
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


@pytest.mark.unit
def test_every_landmark_stands_on_its_floor() -> None:
    layouts = _map_layouts()
    kinds = set()
    for m in _maps():
        layout = layouts.get(m["id"])
        if not layout:
            continue
        for floor in layout["floors"]:
            for lm in floor.get("landmarks", []):
                kinds.add(lm["kind"])
                assert lm["kind"] in ("main", "shack", "feature"), m["name"]
                assert (lm["kind"] == "feature") == ("label" in lm), m["name"]
                assert any(_point_in_ring(lm["x"], lm["y"], r) for r in floor["outline"]), (m["name"], lm)
    assert kinds == {"main", "shack", "feature"}

