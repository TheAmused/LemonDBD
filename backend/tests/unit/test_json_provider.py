# backend/tests/unit/test_json_provider.py
import dataclasses
import json
import unittest
from datetime import date, datetime, timezone
from uuid import UUID, uuid4
from flask import Flask, jsonify

from app import create_app
from app.core.config import TestingConfig
from app.core.json_provider import ORJSONProvider


@dataclasses.dataclass
class SamplePerk:
    id: int
    name: str
    tier: int


class CustomModel:
    def __init__(self, name: str, value: int):
        self.name = name
        self.value = value

    def to_dict(self):
        return {"name": self.name, "value": self.value}


class TestORJSONProvider(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.provider = ORJSONProvider(self.app)
        self.app.json = self.provider

    def test_primitive_dumps_and_loads(self):
        data = {
            "name": "Sprint Burst",
            "tier": 3,
            "is_teachable": True,
            "rating": 4.8,
            "tags": ["exhaustion", "survivor", "speed"],
        }
        dumped = self.provider.dumps(data)
        self.assertIsInstance(dumped, str)
        loaded = self.provider.loads(dumped)
        self.assertEqual(loaded, data)

    def test_non_string_keys_handling(self):
        data = {1: "Tier I", 2: "Tier II", 3: "Tier III"}
        dumped = self.provider.dumps(data)
        self.assertIsInstance(dumped, str)
        loaded = self.provider.loads(dumped)
        # orjson serializes integer keys properly
        self.assertEqual(loaded, {"1": "Tier I", "2": "Tier II", "3": "Tier III"})

    def test_datetime_and_date_serialization(self):
        dt = datetime(2026, 8, 27, 10, 0, 0, tzinfo=timezone.utc)
        d = date(2026, 8, 27)
        data = {"created_at": dt, "release_date": d}
        dumped = self.provider.dumps(data)
        loaded = self.provider.loads(dumped)
        self.assertTrue("2026-08-27" in loaded["created_at"])
        self.assertEqual(loaded["release_date"], "2026-08-27")

    def test_uuid_and_set_serialization(self):
        test_uuid = uuid4()
        data = {"id": test_uuid, "categories": {"stealth", "speed"}}
        dumped = self.provider.dumps(data)
        loaded = self.provider.loads(dumped)
        self.assertEqual(loaded["id"], str(test_uuid))
        self.assertEqual(set(loaded["categories"]), {"stealth", "speed"})

    def test_dataclass_and_to_dict_serialization(self):
        perk = SamplePerk(id=42, name="Dead Hard", tier=3)
        model = CustomModel(name="Custom Perk", value=99)
        data = {"perk": perk, "model": model}
        dumped = self.provider.dumps(data)
        loaded = self.provider.loads(dumped)
        self.assertEqual(loaded["perk"], {"id": 42, "name": "Dead Hard", "tier": 3})
        self.assertEqual(loaded["model"], {"name": "Custom Perk", "value": 99})

    def test_flask_app_jsonify_integration(self):
        app = create_app(TestingConfig)
        client = app.test_client()

        with app.app_context():
            @app.route("/test-json-perf")
            def test_endpoint():
                return jsonify({
                    "status": "ok",
                    "timestamp": datetime(2026, 8, 27, 12, 0, 0),
                    "items": [{"id": i, "name": f"Perk {i}"} for i in range(10)],
                })

            response = client.get("/test-json-perf")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content_type, "application/json")
            data = response.get_json()
            self.assertEqual(data["status"], "ok")
            self.assertEqual(len(data["items"]), 10)
            self.assertEqual(data["items"][0]["name"], "Perk 0")


if __name__ == "__main__":
    unittest.main()
