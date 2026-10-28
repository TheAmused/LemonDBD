# backend/tests/live/api/test_live_perks_api.py
"""Catalogue endpoints on PostgreSQL: perks (paging, role filters, search, lookup, suggestions),
characters, items, add-ons and maps. Counts are compared with the live copy itself (`db_count`),
so every check is exact."""
from collections.abc import Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
class TestLivePerksAndEquipmentAPI:
    def test_live_list_perks_pagination_and_filtering(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        res = live_client.get("/api/v1/perks?limit=20")
        assert res.status_code == 200
        data = res.get_json()
        assert len(data["data"]) == 20
        assert data["pagination"]["total"] == db_count("SELECT count(*) FROM perks")

        for role, owner in (("Survivor", "survivor_id"), ("Killer", "killer_id")):
            res_role = live_client.get(f"/api/v1/perks?category={role}&limit=500")
            assert res_role.status_code == 200
            perks = res_role.get_json()["data"]
            assert {p["category"] for p in perks} == {role}
            # Generic perks belong to no character, so count by role, not by owner.
            assert len(perks) == db_count("SELECT count(*) FROM perks WHERE role = :role", role=role)
            assert sum(1 for p in perks if p[owner] is not None) == db_count(f"SELECT count(*) FROM perks WHERE {owner} IS NOT NULL")

        res_search = live_client.get("/api/v1/perks?search=Sprint")
        assert res_search.status_code == 200
        assert [p["name"] for p in res_search.get_json()["data"]] == ["Sprint Burst"]

    def test_live_get_perk_by_identifier(self, live_client: FlaskClient) -> None:
        # The display name with underscores, the slug and the kebab form all reach the same perk.
        for identifier in ("Sprint_Burst", "sprint_burst", "sprint-burst"):
            res = live_client.get(f"/api/v1/perks/{identifier}")
            assert res.status_code == 200, identifier
            perk = res.get_json()["data"]
            assert (perk["name"], perk["character"], perk["category"]) == ("Sprint Burst", "Meg Thomas", "Survivor")
        assert live_client.get("/api/v1/perks/not_a_real_perk").status_code == 404

    def test_live_perk_suggestions_sql_prefilter(self, live_client: FlaskClient) -> None:
        """`fetch_perk_suggestions` filters at the SQL level (Postgres `unaccent`
        + `regexp_replace`) before the existing Python-side exact match, instead
        of fetching every perk on every request. This locks in that the two
        stages still agree: a plain substring, an accent-insensitive localized
        (Polish) match, and a no-match query."""
        res = live_client.get("/api/v1/perks/suggestions?q=sprint")
        assert res.status_code == 200
        names = [p["name"] for p in res.get_json()["data"]]
        assert "Sprint Burst" in names

        # "Resilience" translates to "Zaradność" in Polish -- searching the
        # accent-free "zaradnosc" must still find it via SQL-side unaccent(),
        # and the response localizes the returned name to lang=pl.
        res_pl = live_client.get("/api/v1/perks/suggestions?q=zaradnosc&lang=pl")
        assert res_pl.status_code == 200
        pl_names = [p["name"] for p in res_pl.get_json()["data"]]
        assert "Zaradność" in pl_names

        res_category = live_client.get("/api/v1/perks/suggestions?q=a&category=killer&limit=5")
        assert res_category.status_code == 200
        suggestions = res_category.get_json()["data"]
        assert len(suggestions) == 5
        assert all(p["category"] == "Killer" for p in suggestions)

        res_none = live_client.get("/api/v1/perks/suggestions?q=zzznotarealperkzzz")
        assert res_none.status_code == 200
        assert res_none.get_json()["data"] == []

    def test_live_list_characters_and_details(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        res = live_client.get("/api/v1/characters")
        assert res.status_code == 200
        characters = res.get_json()["data"]
        assert len(characters) == db_count("SELECT (SELECT count(*) FROM survivors) + (SELECT count(*) FROM killers)")

        res_trapper = live_client.get("/api/v1/characters/The_Trapper/detail")
        assert res_trapper.status_code == 200
        trapper = res_trapper.get_json()["data"]
        assert trapper["character"]["name"] == "The Trapper"
        assert {p["name"] for p in trapper["perks"]} == {"Agitation", "Brutal Strength", "Unnerving Presence"}
        assert live_client.get("/api/v1/characters/Not_A_Character/detail").status_code == 404

    def test_live_list_items_and_addons(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        res_items = live_client.get("/api/v1/items")
        assert res_items.status_code == 200
        assert res_items.get_json()["count"] == len(res_items.get_json()["data"]) == db_count("SELECT count(*) FROM items")

        res_addons = live_client.get("/api/v1/addons")
        assert res_addons.status_code == 200
        addons = res_addons.get_json()["data"]
        assert len(addons) == db_count("SELECT (SELECT count(*) FROM killer_addons) + (SELECT count(*) FROM item_addons)")

    def test_live_list_maps(self, live_client: FlaskClient, db_count: Callable[..., int]) -> None:
        res = live_client.get("/api/v1/maps")
        assert res.status_code == 200
        maps = res.get_json()["maps"]
        assert len(maps) == db_count("SELECT count(*) FROM map_realms")
        assert all(m["name"] and m["realm"] for m in maps)
