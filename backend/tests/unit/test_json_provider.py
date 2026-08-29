# backend/tests/unit/test_json_provider.py
import dataclasses
import uuid
from datetime import date, datetime, timezone
from enum import Enum
import pytest
from flask import Flask, jsonify
from app.core.json_provider import ORJSONProvider


class RealmType(Enum):
    OUTDOOR = "outdoor"
    INDOOR = "indoor"


@dataclasses.dataclass
class CustomPerkMeta:
    tier: int
    bloodpoint_cost: int
    tags: set[str]


class ModelWithToDict:
    def __init__(self, item_id: str, name: str) -> None:
        self.item_id = item_id
        self.name = name

    def to_dict(self) -> dict[str, str]:
        return {"id": self.item_id, "name": self.name}


@pytest.mark.unit
class TestORJSONProvider:
    """Tests for custom fast orjson-backed Flask JSON provider and custom type serializers."""

    @pytest.fixture
    def app_with_orjson(self) -> Flask:
        app = Flask(__name__)
        app.json = ORJSONProvider(app)
        return app

    def test_serialize_datetimes_and_uuids(self, app_with_orjson: Flask) -> None:
        fixed_uuid = uuid.UUID("12345678-1234-5678-1234-567812345678")
        dt_val = datetime(2026, 8, 28, 12, 0, 0, tzinfo=timezone.utc)
        d_val = date(2026, 8, 28)

        @app_with_orjson.route("/api/types")
        def route():
            return jsonify({
                "id": fixed_uuid,
                "timestamp": dt_val,
                "release_date": d_val,
            })

        client = app_with_orjson.test_client()
        res = client.get("/api/types")
        assert res.status_code == 200
        data = res.get_json()
        assert data["id"] == "12345678-1234-5678-1234-567812345678"
        assert "2026-08-28T12:00:00" in data["timestamp"]
        assert data["release_date"] == "2026-08-28"

    def test_serialize_sets_dataclasses_and_to_dict_objects(self, app_with_orjson: Flask) -> None:
        dc_obj = CustomPerkMeta(tier=3, bloodpoint_cost=4000, tags={"chase", "stealth"})
        custom_obj = ModelWithToDict("medkit_ranger", "Ranger Med-Kit")

        @app_with_orjson.route("/api/complex")
        def complex_route():
            return jsonify({
                "meta": dc_obj,
                "equipment": custom_obj,
                "raw_set": {"generator", "exit_gate"},
            })

        client = app_with_orjson.test_client()
        res = client.get("/api/complex")
        assert res.status_code == 200
        data = res.get_json()
        assert data["meta"]["tier"] == 3
        assert data["meta"]["bloodpoint_cost"] == 4000
        assert set(data["meta"]["tags"]) == {"chase", "stealth"}
        assert data["equipment"] == {"id": "medkit_ranger", "name": "Ranger Med-Kit"}
        assert set(data["raw_set"]) == {"generator", "exit_gate"}

    def test_loads_and_dumps_fidelity(self, app_with_orjson: Flask) -> None:
        provider = ORJSONProvider(app_with_orjson)
        source_data = {"key": "value", "count": 10, "flags": [True, False]}
        serialized = provider.dumps(source_data)
        assert isinstance(serialized, str)
        deserialized = provider.loads(serialized)
        assert deserialized == source_data
