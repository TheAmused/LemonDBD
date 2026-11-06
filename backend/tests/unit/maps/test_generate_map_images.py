# backend/tests/unit/maps/test_generate_map_images.py
import pytest
from PIL import Image
from scripts.generate_map_images import PANEL_GAP_PX, get_clock_labels, point_on_floor, render_map_layout_to_image, room_box, slugify


@pytest.mark.unit
def test_slugify() -> None:
    assert slugify("Azarov's Resting Place") == "azarovs_resting_place"
    assert slugify("The Macmillan Estate") == "the_macmillan_estate"
    assert slugify("Léry's Memorial Institute") == "lerys_memorial_institute"


@pytest.mark.unit
def test_render_map_layout_to_image() -> None:
    layout = {
        "cell_m": 8,
        "width_m": 128,
        "height_m": 128,
        "floors": [
            {
                "name": "Ground",
                "outline": [
                    [[16, 16], [112, 16], [112, 112], [16, 112]],
                ],
                "landmarks": [
                    {"code": "C|H", "kind": "feature", "x": 64, "y": 64, "label": "Center Hill"},
                    {"code": "SHACK", "kind": "shack", "x": 32, "y": 32, "label": "Killer Shack"},
                    {"code": "MAIN", "kind": "main", "x": 96, "y": 96, "label": "Main Building"},
                ],
            }
        ],
    }

    img = render_map_layout_to_image(
        layout,
        map_name="Test Map",
        realm_name="Test Realm",
        target_width=1024,
    )
    assert isinstance(img, Image.Image)
    assert img.width == 1024


@pytest.mark.unit
def test_every_floor_of_a_multi_floor_map_is_drawn() -> None:
    ring = [[[0, 0], [64, 0], [64, 48], [0, 48]]]
    one = {"cell_m": 8, "width_m": 64, "height_m": 48, "floors": [{"label": None, "outline": ring}]}
    two = {
        "cell_m": 8,
        "width_m": 64,
        "height_m": 48,
        "floors": [
            {"label": "upper", "outline": ring},
            {"label": "lower", "outline": ring},
        ],
    }
    single = render_map_layout_to_image(one, target_width=800)
    double = render_map_layout_to_image(two, target_width=800)
    assert single.width == 800
    # Two panels of the single-floor size plus the gap between them, same height.
    assert double.width == 2 * 800 + PANEL_GAP_PX
    assert double.height == single.height


@pytest.mark.unit
def test_floor_keeps_its_fill_and_the_shack_is_a_tint_not_a_solid() -> None:
    layout = {
        "cell_m": 8,
        "width_m": 64,
        "height_m": 64,
        "floors": [
            {
                "label": None,
                "outline": [[[0, 0], [64, 0], [64, 64], [0, 64]]],
                "landmarks": [{"kind": "shack", "x": 36, "y": 36, "w": 8, "h": 8}],
            }
        ],
    }
    img = render_map_layout_to_image(layout, target_width=1000)
    scale = 1000 / (64 + 16)
    # Inside a square of the 8 m grid, clear of its lines and of the shack: the floor fill (#161b22).
    assert img.getpixel((int((12 + 8) * scale), int((12 + 8) * scale))) == (22, 27, 34)
    # In the middle of the shack, off its glyph and its dashed outline: the floor with an amber tint over it.
    r, g, b = img.getpixel((int((33 + 8) * scale), int((33 + 8) * scale)))
    assert (r, g, b) != (245, 158, 11) and r > 22 and r < 120 and r > b


_ROOMS_FLOOR = {
    "label": "upper",
    "outline": [[[0, 0], [48, 0], [48, 48], [0, 48]]],
    "holes": [[[16, 16], [32, 16], [32, 32], [16, 32]]],
    "rooms": [{"ring": [[0, 0], [16, 0], [16, 16], [0, 16]], "label": "STAIRS"}, {"label": "LIBRARY", "x": 40, "y": 8}],
}


@pytest.mark.unit
def test_hole_is_not_floor() -> None:
    assert point_on_floor(_ROOMS_FLOOR, 8, 8)
    assert not point_on_floor(_ROOMS_FLOOR, 24, 24)


@pytest.mark.unit
def test_room_box() -> None:
    assert room_box({"ring": [[0, 0], [10, 0], [10, 4], [0, 4]]}) == {"x": 5.0, "y": 2.0, "w": 10.0, "h": 4.0}
    assert room_box({"label": "MUSIC", "x": 20, "y": 8}) == {"x": 20.0, "y": 8.0, "w": 12.0, "h": 4.0}
    assert room_box({"label": "TOILETS", "x": 20, "y": 8, "w": 7.5, "h": 3.5}) == {"x": 20.0, "y": 8.0, "w": 7.5, "h": 3.5}


@pytest.mark.unit
def test_clock_numbers_of_a_floor_with_rooms_are_printed_outside_the_outline() -> None:
    _, labels, show_mid = get_clock_labels(_ROOMS_FLOOR)
    assert not show_mid
    assert len(labels) == 12
    for label in labels:
        assert not point_on_floor(_ROOMS_FLOOR, label["x"], label["y"])
    twelve = next(label for label in labels if label["hour"] == 12)
    assert twelve["x"] == pytest.approx(24.0) and twelve["y"] < 0


@pytest.mark.unit
def test_floors_with_rooms_leave_a_margin_for_the_clock_numbers() -> None:
    # 48 m + 8 m padding + 4 m extra on both sides = 72 m wide; 48 + 8 + 16 + 8 m extra above = 80 m tall.
    rooms = {"cell_m": 8, "width_m": 48, "height_m": 48, "floors": [{**_ROOMS_FLOOR, "label": None}]}
    img = render_map_layout_to_image(rooms, target_width=720)
    assert img.size == (720, 800)
