# backend/tests/unit/test_json_field.py
import pytest

from app.models.base import JsonField


class _Row:
    killers_json: str | None = None
    loadout_json: str | None = None
    killers = JsonField[list[str]]("killers_json", list)
    loadout = JsonField[dict[str, str]]("loadout_json", dict)


@pytest.mark.unit
class TestJsonField:
    def test_reads_the_parsed_column(self) -> None:
        row = _Row()
        row.killers_json = '["The Trapper", "The Wraith"]'
        assert row.killers == ["The Trapper", "The Wraith"]

    @pytest.mark.parametrize("stored", [None, "", "not json", "null"])
    def test_missing_or_broken_json_reads_as_a_fresh_default(self, stored: str | None) -> None:
        row = _Row()
        row.killers_json = stored
        first = row.killers
        assert first == []
        first.append("mutated")
        assert row.killers == []

    def test_assigning_writes_the_column_as_json(self) -> None:
        row = _Row()
        row.killers = ["The Nurse"]
        row.loadout = {"character": "The Nurse"}
        assert row.killers_json == '["The Nurse"]'
        assert row.loadout_json == '{"character":"The Nurse"}'
