# backend/tests/unit/api/test_character_slug.py
"""Character links come from the canonical English name, so every locale reaches the same page."""
import json
from pathlib import Path

import pytest
from flask.testing import FlaskClient

from app.core.extensions import db
from app.models.slug import url_slug
from tests.unit.conftest import make_killer

CONTENT = Path(__file__).resolve().parents[3] / "app" / "seeds" / "data" / "content"


@pytest.mark.unit
@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Meg Thomas", "meg_thomas"),
        ("The Trapper", "the_trapper"),
        ("The Shape / Michael Myers", "the_shape_michael_myers"),
        ("Ash J. Williams", "ash_j_williams"),
        ("Ji-Woon Hak", "ji_woon_hak"),
        ("Élodie Rakoto", "elodie_rakoto"),
    ],
)
def test_url_slug_matches_the_frontend_rule(name: str, slug: str) -> None:
    assert url_slug(name) == slug


@pytest.mark.unit
@pytest.mark.parametrize("table", ["survivors", "killers"])
def test_every_seeded_character_has_a_unique_non_empty_slug(table: str) -> None:
    rows = json.loads((CONTENT / f"{table}.json").read_text(encoding="utf-8"))[table]
    slugs = [url_slug(row["name"]) for row in rows]
    assert all(slugs)
    assert len(set(slugs)) == len(slugs)


@pytest.mark.unit
def test_translated_roster_links_to_the_english_slug(client: FlaskClient, db_session) -> None:
    make_killer(db_session, "The Trapper", id=1, translations={"ja": {"name": "トラッパー"}})
    db.session.commit()

    row = client.get("/api/v1/characters?lang=ja").get_json()["data"][0]
    assert row["name"] == "トラッパー"
    assert row["slug"] == "the_trapper"
    assert client.get(f"/api/v1/characters/{row['slug']}/detail?lang=ja").status_code == 200
