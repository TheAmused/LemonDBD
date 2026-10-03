# backend/tests/unit/test_scoreboard_route.py
"""Scoreboard screenshot check: parser logic (synthetic OCR lines) and the upload route."""
import io
from pathlib import Path

import pytest
from flask.testing import FlaskClient

from app.services import scoreboard_ocr
from app.services.scoreboard_ocr.parse import name_similarity

SHOTS = Path(__file__).resolve().parents[3] / "additions" / "ss-ocr"
pytestmark = pytest.mark.unit


class TestSimilarity:
    def test_exact_and_fuzzy(self) -> None:
        assert name_similarity("Lemon", "lemon") == 1.0
        assert name_similarity("Lemon", "Zzzz") < 0.5


class TestEngine:
    def test_unavailable_engine_gives_503(self, client: FlaskClient, monkeypatch) -> None:
        monkeypatch.setattr(scoreboard_ocr, "engine_available", lambda: False)
        res = client.get("/api/v1/scoreboard/status")
        assert res.status_code == 200 and res.get_json()["available"] is False

    def test_analyze_requires_login(self, client: FlaskClient) -> None:
        res = client.post("/api/v1/scoreboard/analyze", data={"image": (io.BytesIO(b"x"), "a.png")})
        assert res.status_code == 401


def _login(client: FlaskClient) -> None:
    res = client.post(
        "/api/v1/auth/register",
        json={"username": "shotuser", "email": "shotuser@example.com", "password": "password123"},
    )
    assert res.status_code == 201


@pytest.mark.skipif(not scoreboard_ocr.engine_available(), reason="rapidocr not installed")
class TestRoute:
    def test_missing_image(self, client: FlaskClient) -> None:
        _login(client)
        res = client.post("/api/v1/scoreboard/analyze", data={})
        assert res.status_code == 400 and res.get_json()["code"] == "missing_image"

    def test_garbage_is_rejected(self, client: FlaskClient) -> None:
        _login(client)
        res = client.post("/api/v1/scoreboard/analyze", data={"image": (io.BytesIO(b"not an image"), "a.png")})
        assert res.status_code == 400
        assert res.headers["Cache-Control"] == "no-store"

    def test_wrong_aspect_is_rejected(self, client: FlaskClient) -> None:
        from PIL import Image

        buf = io.BytesIO()
        Image.new("RGB", (1600, 1600), "black").save(buf, "PNG")
        buf.seek(0)
        _login(client)
        res = client.post("/api/v1/scoreboard/analyze", data={"image": (buf, "a.png")})
        assert res.status_code == 400 and res.get_json()["code"] == "unsupported_aspect_ratio"

    def test_blank_16x9_is_not_a_scoreboard(self, client: FlaskClient) -> None:
        from PIL import Image

        buf = io.BytesIO()
        Image.new("RGB", (1920, 1080), "black").save(buf, "PNG")
        buf.seek(0)
        _login(client)
        res = client.post("/api/v1/scoreboard/analyze", data={"image": (buf, "a.png")})
        body = res.get_json()
        assert res.status_code == 200
        assert body["ok"] is False and body.get("passed") is not True


_GT = SHOTS / "ground_truth.json"


@pytest.mark.skipif(
    not (scoreboard_ocr.engine_available() and _GT.exists()),
    reason="rapidocr or sample screenshots not available",
)
def test_real_screenshots_match_ground_truth() -> None:
    import json

    truth = json.loads(_GT.read_text(encoding="utf-8"))
    for name, expected in truth.items():
        if name.startswith("_"):
            continue
        path = SHOTS / name
        if not path.exists():
            continue
        report = scoreboard_ocr.analyze_scoreboard(path.read_bytes())
        assert report["ok"], name
        assert report["scoreboard"]["is_final"] == expected["is_final"], name
        assert report["summary"]["kills"] == expected["kills"], name
        assert report["pov_won"] == expected["pov_won"], name
