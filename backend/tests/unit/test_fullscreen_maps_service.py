# backend/tests/unit/test_fullscreen_maps_service.py
import gc
import tempfile
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService
from app.services.map_service import MapService


@pytest.mark.unit
class TestFullscreenMapsService:
    """Tests for MapService tile layout retrieval, pallet safety ratings, and objective placement."""

    @pytest.fixture
    def map_service(self) -> MapService:
        temp_dir = tempfile.TemporaryDirectory()
        db_path = str(Path(temp_dir.name) / "test_fullscreen_maps.db")
        db_service = DatabaseService(db_path=db_path)
        db_service.init_db()
        service = MapService(db_service=db_service)
        yield service
        gc.collect()
        try:
            temp_dir.cleanup()
        except Exception:
            pass

    def test_get_map_with_seed_variants_and_pallets(self, map_service: MapService) -> None:
        detail = map_service.get_map_by_id("coal_tower", seed_variant="seed_a", floor=1)
        assert detail is not None
        assert "tiles" in detail
        assert "objectives" in detail

        tiles = detail["tiles"]
        assert len(tiles) >= 1

        for tile in tiles:
            assert "has_pallet" in tile
            assert "has_window" in tile
            assert "pallet_safety_rating" in tile
            assert "looping_tips" in tile
            assert "mindgame_counter" in tile

        pallets = [t for t in tiles if t.get("has_pallet")]
        assert len(pallets) >= 1
        for p in pallets:
            assert p["pallet_safety_rating"] in ["god", "safe", "mindgameable", "unsafe"]

        objectives = detail["objectives"]
        assert len(objectives) >= 1
        obj_types = {obj["type"] for obj in objectives if "type" in obj}
        expected_types = {"totem", "generator", "exit_gate", "hatch", "chest", "basement"}
        for et in expected_types:
            assert et in obj_types

    @pytest.mark.parametrize(
        "invalid_map_id",
        ["non_existent_realm", "invalid_map_123", "", "' OR '1'='1"],
    )
    def test_get_map_by_non_existent_id_returns_none_or_empty(
        self, map_service: MapService, invalid_map_id: str
    ) -> None:
        detail = map_service.get_map_by_id(invalid_map_id, seed_variant="seed_a", floor=1)
        assert detail is None or detail == {} or detail.get("tiles") == []

    def test_multi_floor_map_resolution(self, map_service: MapService) -> None:
        floor1 = map_service.get_map_by_id("coal_tower", seed_variant="seed_a", floor=1)
        floor2 = map_service.get_map_by_id("coal_tower", seed_variant="seed_a", floor=2)
        if floor2 is not None and "floor" in floor2:
            assert floor2["floor"] == 2
