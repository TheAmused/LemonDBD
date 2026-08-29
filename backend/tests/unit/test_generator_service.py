# backend/tests/unit/test_generator_service.py
import gc
import tempfile
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService
from app.services.generator_service import GeneratorService


@pytest.mark.unit
class TestGeneratorService:
    """Tests for standalone GeneratorService perk history and session configuration."""

    @pytest.fixture
    def gen_service(self) -> GeneratorService:
        temp_dir = tempfile.TemporaryDirectory()
        db_path = str(Path(temp_dir.name) / "test_generator.db")
        db_service = DatabaseService(db_path=db_path)
        db_service.init_db()
        service = GeneratorService(db_service=db_service)
        yield service
        gc.collect()
        try:
            temp_dir.cleanup()
        except Exception:
            pass

    def test_add_drawn_perks_and_reset(self, gen_service: GeneratorService) -> None:
        drawn_before = gen_service.get_drawn_perks("Survivor")
        assert len(drawn_before) == 0

        gen_service.add_drawn_perks("Survivor", ["Sprint Burst", "Adrenaline"])
        drawn_after = gen_service.get_drawn_perks("Survivor")
        assert len(drawn_after) == 2
        assert "Sprint Burst" in drawn_after
        assert "Adrenaline" in drawn_after

        gen_service.reset_drawn_perks("Survivor")
        drawn_reset = gen_service.get_drawn_perks("Survivor")
        assert len(drawn_reset) == 0

    @pytest.mark.parametrize("role", ["Survivor", "Killer"])
    def test_drawn_perks_isolated_by_role(self, gen_service: GeneratorService, role: str) -> None:
        other_role = "Killer" if role == "Survivor" else "Survivor"
        gen_service.add_drawn_perks(role, ["Special Perk"])

        assert "Special Perk" in gen_service.get_drawn_perks(role)
        assert "Special Perk" not in gen_service.get_drawn_perks(other_role)

    def test_get_and_update_config(self, gen_service: GeneratorService) -> None:
        config = gen_service.get_config()
        assert config["role"] == "Survivor"
        assert config["no_repeat_perks"] == 1

        updated = gen_service.update_config({"role": "Killer", "no_repeat_perks": 0})
        assert updated["role"] == "Killer"
        assert updated["no_repeat_perks"] == 0

        config_after = gen_service.get_config()
        assert config_after["role"] == "Killer"
        assert config_after["no_repeat_perks"] == 0

    def test_reset_drawn_perks_when_already_empty_is_safe(self, gen_service: GeneratorService) -> None:
        gen_service.reset_drawn_perks("Killer")
        assert gen_service.get_drawn_perks("Killer") == []
