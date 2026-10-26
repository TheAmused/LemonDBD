# backend/tests/unit/test_scoreboard_route.py
"""Scoreboard screenshot check: parser logic (synthetic OCR lines), outcome rules and the
upload route."""
import io
from pathlib import Path

import pytest
from flask.testing import FlaskClient

from app.services import scoreboard_ocr
from app.services.scoreboard_ocr import outcome
from app.services.scoreboard_ocr.layout import Panel
from app.services.scoreboard_ocr.parse import Line, Probes, build_report, name_similarity, split_row_text

SHOTS = Path(__file__).resolve().parents[3] / "additions" / "ss-ocr"
pytestmark = pytest.mark.unit

KNOWN = ["Mikaela Reid", "Zarina Kassir", "Aurora Stardotter", "Feng Min", "The Cannibal", "The Spirit", "Yui Kimura"]


class TestSimilarity:
    def test_exact_and_fuzzy(self) -> None:
        assert name_similarity("Lemon", "lemon") == 1.0
        assert name_similarity("Lemon", "Zzzz") < 0.5

    def test_spaces_accents_and_truncation(self) -> None:
        assert name_similarity("Clapping cheeks", "Clappingcheeks") == 1.0
        assert name_similarity("Élodie", "ELODIE") == 1.0
        assert name_similarity("Melon the Strawberry", "Melon the Strawber") == 1.0


class TestSplitRowText:
    @pytest.mark.parametrize(
        ("texts", "character", "player"),
        [
            (["MIKAELAREID", "Clapping cheeks"], "Mikaela Reid", "Clapping cheeks"),  # two boxes
            (["AURORASTARDOTTERoyasumi"], "Aurora Stardotter", "oyasumi"),           # glued, roster
            (["THE CANNIBAL GHOST"], "The Cannibal", "GHOST"),                       # all capitals
            (["FENG MIN Feng Min_01"], "Feng Min", "Feng Min_01"),
            (["A2", "A2's Used Fleshlight"], "A2", "A2's Used Fleshlight"),          # short name, not in roster
            (["A2 Clapping cheeks"], "A2", "Clapping cheeks"),
            (["DWIGHTFAIRFIELD [Golona]"], "Dwightfairfield", "[Golona]"),
            (["NANCY WHEELER croco_chouette"], "Nancy Wheeler", "croco_chouette"),
        ],
    )
    def test_splits(self, texts, character, player) -> None:
        got_character, got_player, _known, _bot = split_row_text(texts, KNOWN)
        assert (got_character, got_player) == (character, player)

    def test_bot_tag(self) -> None:
        character, player, known, bot = split_row_text(["FENG MIN Feng Min_01", "[BOT]"], KNOWN)
        assert (character, player, known, bot) == ("Feng Min", "Feng Min_01", True, True)
        assert split_row_text(["FENG MIN Feng Min_01 [BOT]"], KNOWN)[1:] == ("Feng Min_01", True, True)
        assert split_row_text(["FENG MIN Feng Min_01 BOT"], KNOWN)[1:] == ("Feng Min_01", True, True)
        assert split_row_text(["FENG MIN ROBOT"], KNOWN)[1:] == ("ROBOT", True, False)

    def test_known_player_with_bot_suffix_splits(self) -> None:
        from app.services.scoreboard_ocr.parse import _split_at_known_player

        names = ["A2's Used Fleshlight"]
        # Two boxes: name + BOT
        res1 = _split_at_known_player(["A2A2's Used Fleshlight", "BOT"], names, [])
        assert res1 == ("A2", "A2's Used Fleshlight", False)

        # Single box: name with unbracketed BOT
        res2 = _split_at_known_player(["A2 A2's Used Fleshlight BOT"], names, [])
        assert res2 == ("A2", "A2's Used Fleshlight", False)


class TestOutcome:
    def test_died_first_is_settled_for_the_owner_but_not_the_match(self) -> None:
        match = outcome.summarize(["in_trial", "dead", "in_trial", "in_trial"], has_spectate=True)
        assert match["ended"] is False and match["verdict"] == "incomplete" and match["verdict_final"] is False
        own = outcome.pov_outcome("survivor", "dead", match)
        assert own == {"outcome": "died", "result": "lost", "survived": False, "final": True}
        facts = outcome.facts("survivor", own, match)
        assert facts["settled"] == {"own_outcome": True, "match_result": False, "kill_count": False}
        assert facts["kills"] is None and facts["kills_at_least"] == 1

    def test_three_kills_decide_the_match_before_its_end(self) -> None:
        match = outcome.summarize(["dead", "in_trial", "dead", "dead"], has_spectate=True)
        assert match["ended"] is False
        assert match["verdict"] == "killer_win" and match["verdict_final"] is True

    def test_three_escapes_decide_a_survivor_win(self) -> None:
        match = outcome.summarize(["escaped", "escaped", "in_trial", "escaped"], has_spectate=True)
        assert match["verdict"] == "survivor_win" and match["verdict_final"] is True

    def test_two_dead_one_alive_is_open(self) -> None:
        match = outcome.summarize(["dead", "in_trial", "escaped", "dead"], has_spectate=True)
        assert match["verdict"] == "incomplete"

    def test_ended_match_and_killer_result(self) -> None:
        match = outcome.summarize(["escaped", "dead", "dead", "escaped"], has_spectate=False)
        assert match["ended"] and match["verdict"] == "draw"
        assert outcome.pov_outcome("killer", "killer", match)["result"] == "draw"

    def test_spectate_button_keeps_the_match_open(self) -> None:
        match = outcome.summarize(["escaped", "dead", "escaped", "escaped"], has_spectate=True)
        assert match["ended"] is False and match["verdict"] == "survivor_win"

    def test_surrendered_survivor_is_lost_and_settled(self) -> None:
        match = outcome.summarize(["surrendered", "surrendered", "surrendered", "surrendered"], has_spectate=False)
        assert match["ended"] is True
        assert match["verdict"] == "killer_win" and match["verdict_final"] is True
        assert match["kills"] == 4
        assert match["escapes"] == 0
        assert match["in_trial"] == 0
        assert match["unknown"] == 0
        assert match["rows_settled"] is True

        own = outcome.pov_outcome("survivor", "surrendered", match)
        assert own == {"outcome": "surrendered", "result": "lost", "survived": False, "final": True}

    def test_surrendered_counts_towards_killer_kills(self) -> None:
        match = outcome.summarize(["dead", "surrendered", "surrendered", "escaped"], has_spectate=False)
        assert match["ended"] is True
        assert match["kills"] == 3
        assert match["escapes"] == 1
        assert match["verdict"] == "killer_win" and match["verdict_final"] is True


class TestStatusIcons:
    def test_classes_include_surrendered(self) -> None:
        from app.services.scoreboard_ocr.icons import CLASSES, load_prototypes

        assert "surrendered" in CLASSES
        protos = load_prototypes()
        assert "surrendered" in protos
        assert protos["surrendered"].shape == (28, 28)


class _FakeProbes(Probes):
    """Status per name line, highlighted row by index, re-read text for given crops."""

    def __init__(self, statuses, highlighted=None, reads=None):
        self.statuses = statuses
        self.highlighted = highlighted
        self.reads = reads or {}
        self.rows_seen: list[float] = []

    def status(self, panel, name_cy):
        self.rows_seen.append(name_cy)
        return self.statuses[len(self.rows_seen) - 1], {}

    def glow(self, panel, name_cy):
        idx = len([y for y in self.rows_seen if y < name_cy - 1])
        return 255.0 if idx == self.highlighted else 130.0

    def read_text(self, box):
        for (y_lo, y_hi), value in self.reads.items():
            if y_lo <= (box[1] + box[3]) / 2 <= y_hi:
                return value
        return None


def _scoreboard(rows, *, account=None, spectate=False, top=270, pitch=120):
    """OCR lines for rows of (name boxes, bloodpoints); a box is (x0, text)."""
    lines = []
    for i, (boxes, bp) in enumerate(rows):
        y = top + i * pitch
        for x0, text in boxes:
            lines.append(Line(x0, y, x0 + 12 * len(text), y + 20, text, 0.9))
        if bp is not None:
            lines.append(Line(883 - 20 * len(str(bp)), y + 52, 883, y + 85, str(bp), 0.8))
    if account:
        lines.append(Line(1630, 88, 1790, 110, account, 0.9))
    if spectate:
        lines.append(Line(1530, 1060, 1640, 1085, "SPECTATE", 0.9))
    return lines


class TestBuildReport:
    def test_rows_player_names_and_owner(self) -> None:
        lines = _scoreboard(
            [
                ([(262, "MIKAELAREID"), (394, "Clapping cheeks")], 27943),
                ([(262, "ZARINAKASSIR"), (400, "Yui's Used Fleshlight")], 14693),
                ([(380, "Yui Kimura")], 9698),            # character name missed by OCR
                ([], 13889),                              # whole name line missed
                ([(262, "THE SPIRIT"), (390, "mmmemmmy")], 36435),
            ],
            account="Yui's Used Fleshlight",
        )
        probes = _FakeProbes(
            ["escaped", "dead", "dead", "dead", "killer"],
            highlighted=1,
            reads={(505, 525): ("YUI KIMURA", 0.83), (625, 645): ("FENG MIN Feng Min_01", 0.8)},
        )
        report = build_report(lines, probes, known_characters=KNOWN, expected_player="Yui's Used Fleshlight")
        assert report["ok"]
        rows = report["rows"]
        assert [r["player_name"] for r in rows] == [
            "Clapping cheeks", "Yui's Used Fleshlight", "Yui Kimura", "Feng Min_01", "mmmemmmy",
        ]
        assert rows[2]["character"] == "Yui Kimura" and rows[3]["character"] == "Feng Min"
        assert rows[4]["role"] == "killer"
        assert report["pov"]["player_name"] == "Yui's Used Fleshlight" and report["pov"]["found_by"] == "highlight"
        assert report["identity"]["matched"] is True
        assert report["match"]["ended"] is True and report["summary"]["verdict"] == "killer_win"
        assert report["pov"]["result"] == "lost" and report["pov_won"] is False

    def test_someone_elses_screenshot_is_flagged(self) -> None:
        lines = _scoreboard(
            [
                ([(262, "MIKAELA REID Clapping cheeks")], 1000),
                ([(262, "ZARINA KASSIR Yui's Used Fleshlight")], 1000),
                ([(262, "FENG MIN Winston754")], 1000),
                ([(262, "THE SPIRIT mmmemmmy")], 1000),
            ],
            account="Clapping cheeks",
        )
        report = build_report(lines, _FakeProbes(["escaped", "escaped", "dead", "killer"], highlighted=0),
                              known_characters=KNOWN, expected_player="SomebodyElse")
        assert report["identity"]["matched"] is False
        assert report["pov_won"] is True and report["passed"] is False

    def test_owner_died_first_counts_as_settled(self) -> None:
        lines = _scoreboard(
            [
                ([(262, "MIKAELA REID Clapping cheeks")], 1000),
                ([(262, "ZARINA KASSIR Yui's Used Fleshlight")], 1000),
                ([(262, "FENG MIN Winston754")], 1000),
                ([(262, "YUI KIMURA Yui Kimura")], 1000),
                ([(262, "THE SPIRIT mmmemmmy")], 1000),
            ],
            account="Yui's Used Fleshlight",
            spectate=True,
        )
        report = build_report(lines, _FakeProbes(["in_trial", "dead", "in_trial", "in_trial", "killer"], highlighted=1),
                              known_characters=KNOWN, expected_player="Yui's Used Fleshlight")
        assert report["scoreboard"]["is_final"] is False
        assert report["pov"]["outcome"] == "died" and report["pov"]["result_final"] is True
        assert report["facts"]["survived"] is False
        assert report["facts"]["settled"]["match_result"] is False

    def test_shifted_panel_follows_the_bloodpoints(self) -> None:
        rows = [([(212, "ACE VISCONTI Croissant")], 19976), ([(213, "A2"), (242, "A2's Used Fleshlight")], 16147),
                ([(206, "A2 Clapping cheeks")], 16068), ([(212, "THE BLIGHT XARCIZ")], None)]
        lines = [
            Line(ln.x0, ln.y0, ln.x1 - 50, ln.y1, ln.text, ln.conf) if ln.text.isdigit() else ln
            for ln in _scoreboard(rows, account="A2's Used Fleshlight")
        ]
        report = build_report(lines, _FakeProbes(["escaped", "escaped", "escaped", "killer"]),
                              known_characters=KNOWN + ["Ace Visconti", "The Blight"], expected_player="A2's Used Fleshlight")
        assert report["ok"] and len(report["rows"]) == 4
        assert report["rows"][1]["player_name"] == "A2's Used Fleshlight"
        assert report["pov"]["found_by"] == "account_name"

    def test_glued_row_splits_at_the_account_name(self) -> None:
        rows = [([(262, "MIKAELA REID Clapping cheeks")], 1000), ([(262, "A2A2's Used Fleshlight")], 1000),
                ([(262, "FENG MIN Winston754")], 1000), ([(262, "THE SPIRIT mmmemmmy")], 1000)]
        report = build_report(_scoreboard(rows, account="A2's Used Fleshlight"),
                              _FakeProbes(["escaped", "escaped", "escaped", "killer"], highlighted=1), known_characters=KNOWN)
        assert (report["rows"][1]["character"], report["rows"][1]["player_name"]) == ("A2", "A2's Used Fleshlight")

    def test_not_a_scoreboard(self) -> None:
        assert build_report([Line(10, 10, 100, 30, "hello")], Probes())["ok"] is False


class TestIconCatalog:
    """Each slot is compared only with the icons that can be there."""

    @pytest.fixture
    def catalog(self, tmp_path, monkeypatch):
        from PIL import Image, ImageDraw

        from app.services.scoreboard_ocr.loadout import IconCatalog, IconRef

        monkeypatch.setenv("SCOREBOARD_ICON_CACHE", str(tmp_path / "cache"))

        def icon(name: str, seed: int) -> str:
            img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            ImageDraw.Draw(img).rectangle((8 + seed, 8, 30 + seed * 2, 50), fill=(255, 255, 255, 255))
            path = tmp_path / f"{name}.png"
            img.save(path)
            return str(path)

        refs = [
            IconRef("perk", "Sprint Burst", icon("sb", 1), "survivor"),
            IconRef("perk", "Barbecue", icon("bbq", 2), "killer"),
            IconRef("addon", "Order - Class I", icon("order", 3), "killer", "The Doctor"),
            IconRef("addon", "Rin's Broken Watch", icon("rin", 4), "killer", "The Spirit"),
            IconRef("addon", "Battery", icon("battery", 5), "survivor", "Flashlight"),
            IconRef("addon", "Bandages", icon("bandages", 6), "survivor", "Med-Kit"),
            IconRef("item", "Flashlight", icon("flashlight", 7), "survivor", "Flashlight"),
        ]
        return IconCatalog(refs), tmp_path / "cache"

    def test_groups_are_narrowed(self, catalog) -> None:
        cat, _ = catalog
        names = lambda index: sorted(r.name for r in index.refs)  # noqa: E731
        assert names(cat.index("perk", role="survivor")) == ["Sprint Burst"]
        assert names(cat.index("perk", role="killer")) == ["Barbecue"]
        assert names(cat.index("addon", role="killer", group="The Doctor")) == ["Order - Class I"]
        assert names(cat.index("addon", role="survivor", group="Flashlight")) == ["Battery"]
        # unknown killer or item class: every add-on of the role
        assert names(cat.index("addon", role="killer", group=None)) == ["Order - Class I", "Rin's Broken Watch"]
        assert names(cat.index("addon", role="killer", group="The Nobody")) == ["Order - Class I", "Rin's Broken Watch"]
        assert cat.category_of("Flashlight") == "Flashlight"

    def test_features_are_cached_on_disk(self, catalog) -> None:
        from app.services.scoreboard_ocr import loadout

        cat, cache = catalog
        first = cat.index("perk", role="survivor")
        assert len(list(cache.glob("*.npz"))) == 1
        loadout._groups.clear()  # a new worker: memory empty, disk cache present
        again = cat.index("perk", role="survivor")
        assert (again.matrix == first.matrix).all()


class TestMatchCertainty:
    """When a recognised icon is reported as sure and when as unsure."""

    @staticmethod
    def _verdict(scores, centre=None):
        import numpy as np

        from app.services.scoreboard_ocr.loadout import IconRef, _Index, _verdict

        refs = [IconRef("perk", n, f"/x/{n}") for n in ("Deja Vu", "Kindred", "Object of Obsession", "Lithe")]
        return _verdict("perk", np.array(scores, dtype=float), _Index(refs, np.zeros((4, 1))), centre=centre)

    def test_big_lead_on_a_dimmed_row_is_sure(self) -> None:
        # Potential Energy on a dead survivor's row: 0.909, runner-up 0.737
        assert self._verdict([0.909, 0.737, 0.70, 0.60])["uncertain"] is False

    def test_near_tie_settled_by_the_centre(self) -> None:
        v = self._verdict([0.966, 0.929, 0.90, 0.6], centre=lambda refs: "Deja Vu")
        assert v["name"] == "Deja Vu" and v["uncertain"] is False

    def test_near_tie_the_centre_disagrees_with_stays_unsure(self) -> None:
        v = self._verdict([0.966, 0.929, 0.90, 0.6], centre=lambda refs: "Kindred")
        assert v["uncertain"] is True and v["candidates"][:2] == ["Deja Vu", "Kindred"]

    def test_lower_score_close_call_stays_unsure(self) -> None:
        assert self._verdict([0.92, 0.888, 0.88, 0.6], centre=lambda refs: "Deja Vu")["uncertain"] is True

    def test_below_the_floor_is_not_recognised(self) -> None:
        assert self._verdict([0.80, 0.70, 0.60, 0.50])["name"] is None

    def test_textured_slot_with_a_decisive_lead_is_recognised(self) -> None:
        # e.g. an event offering on its grainy hexagon: 0.77, runner-up 0.33
        v = self._verdict([0.77, 0.33, 0.30, 0.25])
        assert v["name"] == "Deja Vu" and v["uncertain"] is False

    def test_offering_with_decisive_lead_over_similar_cakes_is_sure(self) -> None:
        import numpy as np
        from app.services.scoreboard_ocr.loadout import IconRef, _Index, _verdict

        refs = [IconRef("offering", n, f"/x/{n}") for n in ("Toothy Torte", "Ghastly Gateau", "Screech Cobbler")]
        # Toothy Torte 0.850, runner-up cake 0.695 (lead 0.155)
        v = _verdict("offering", np.array([0.850, 0.695, 0.670], dtype=float), _Index(refs, np.zeros((3, 1))))
        assert v["name"] == "Toothy Torte" and v["uncertain"] is False


class TestRarity:
    """The background colour of an item, add-on or offering slot is its rarity."""

    @pytest.mark.parametrize(
        ("hsv", "rarity"),
        [
            ((26, 0.46, 0.18), "Common"),      # brown
            ((218, 0.02, 0.24), "Common"),     # a dimmed row's brown turns grey
            ((130, 0.68, 0.36), "Uncommon"),   # green
            ((209, 0.41, 0.17), "Rare"),       # blue
            ((258, 0.38, 0.21), "Very Rare"),  # purple
            ((333, 0.38, 0.32), "Ultra Rare"), # pink
            ((51, 0.65, 0.38), "Event"),       # gold
            ((90, 0.5, 0.3), None),            # no rarity looks like this
        ],
    )
    def test_classify(self, hsv, rarity) -> None:
        from app.services.scoreboard_ocr.loadout import classify_rarity

        assert classify_rarity(*hsv) == rarity

    def test_rarity_narrows_and_is_dropped_when_it_contradicts(self) -> None:
        import numpy as np

        from app.services.scoreboard_ocr.loadout import IconRef, _Index, _restrict_to_rarity

        refs = [IconRef("item", "Toolbox", "/t", rarity="Uncommon"), IconRef("item", "Worn-out Tools", "/w", rarity="Common")]
        index = _Index(refs, np.zeros((2, 1)))
        scores = np.array([0.945, 0.939])
        # a Common (brown) background rules the Uncommon Toolbox out
        assert list(_restrict_to_rarity(scores, index, "Common")) == [-1.0, 0.939]
        # ... but not when the same-rarity best is far worse: the colour is distrusted
        far = np.array([0.95, 0.70])
        assert list(_restrict_to_rarity(far, index, "Common")) == [0.95, 0.70]

    def test_event_items_take_the_add_ons_of_their_real_class(self) -> None:
        from app.services.scoreboard_ocr.loadout import IconCatalog, IconRef

        cat = IconCatalog([
            IconRef("addon", "Gauze Roll", "/g", "survivor", "Med-Kit"),
            IconRef("addon", "Battery", "/b", "survivor", "Flashlight"),
            IconRef("addon", "Refined Serum", "/r", "survivor", "Event"),
        ])
        assert cat.addon_groups_for("Masquerade Med-Kit", "Event") == ("Med-Kit", "event")
        assert cat.addon_groups_for("Flashlight", "Flashlight") == ("Flashlight", "event")
        assert cat.addon_groups_for("All Hallows' Eve Lunchbox", "Event") is None  # no class in the name: any
        assert cat.addon_groups_for(None, None) is None


class TestPanel:
    def test_reference_positions(self) -> None:
        assert Panel().x(231) == 231
        assert Panel(x0=181, scale=1.0).x(883) == 833


class TestEngine:
    def test_unavailable_engine_gives_503(self, client: FlaskClient, monkeypatch) -> None:
        monkeypatch.setattr(scoreboard_ocr, "engine_available", lambda: False)
        res = client.get("/api/v1/scoreboard/status")
        assert res.status_code == 200 and res.get_json()["available"] is False

    def test_analyze_requires_login(self, client: FlaskClient) -> None:
        res = client.post("/api/v1/scoreboard/analyze", data={"image": (io.BytesIO(b"x"), "a.png")})
        assert res.status_code == 401


def _login(client: FlaskClient, username: str = "shotuser") -> None:
    res = client.post(
        "/api/v1/auth/register",
        json={"login": "shotuser", "username": username, "email": "shotuser@example.com", "password": "password123"},
    )
    assert res.status_code == 201


class TestIdentityFromLogin:
    def test_alias_is_used_and_form_fields_are_ignored(self, client: FlaskClient, monkeypatch) -> None:
        seen = {}

        def fake(data, **kwargs):
            seen.update(kwargs)
            return {"ok": True}

        monkeypatch.setattr(scoreboard_ocr, "engine_available", lambda: True)
        monkeypatch.setattr(scoreboard_ocr, "analyze_scoreboard", fake)
        _login(client, username="Lemon Alias")
        res = client.post(
            "/api/v1/scoreboard/analyze",
            data={"image": (io.BytesIO(b"img"), "a.png"), "expected_player": "Someone Else"},
        )
        assert res.status_code == 200
        assert seen["expected_player"] == "Lemon Alias"
        assert "expected_role" not in seen and "expected_character" not in seen

    def test_login_is_the_fallback(self, monkeypatch) -> None:
        from flask import Flask, g

        from app.routes import scoreboard as route

        class _User:
            username = ""
            login = "lemonlogin"

        with Flask(__name__).test_request_context():
            g.current_user = _User()
            assert route._expected_player() == "lemonlogin"


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
        # the production route passes the whole roster; these are the roster names on the
        # sample screenshots ("FOREST GUIDE" is an outfit name, not in the roster)
        roster = [c.title() for c, _ in expected["rows"] if c != "FOREST GUIDE"]
        report = scoreboard_ocr.analyze_scoreboard(
            path.read_bytes(), known_characters=roster, expected_player=expected["owner"]
        )
        assert report["ok"], name
        assert report["scoreboard"]["is_final"] == expected["is_final"], name
        assert report["summary"]["kills"] == expected["kills"], name
        assert report["pov_won"] == expected["pov_won"], name
        assert [r["status"] for r in report["rows"]] == [s for _, s in expected["rows"]], name
        assert all(r["player_name"] for r in report["rows"]), name
        assert report["identity"]["matched"] is True, name
        # The owner's own result is settled even when the match is not over yet.
        assert report["pov"]["result_final"] is True, name
