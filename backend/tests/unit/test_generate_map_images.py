# backend/tests/unit/test_generate_map_images.py
import pytest
from PIL import Image
from scripts.generate_map_images import render_map_layout_to_image, slugify


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
        canvas_size=1024,
    )
    assert isinstance(img, Image.Image)
    assert img.size == (1024, 1024)
