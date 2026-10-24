# backend/app/services/scoreboard_ocr/parse.py
"""Turns OCR lines into a scoreboard report. Pure logic: every pixel question (where the
panel is, which status icon a row has, how bright its name is, what a crop reads, what
the loadout shows) goes through a `Probes` object, so the parser runs on synthetic
lines in tests.

Rows are found from two independent anchors -- the right-aligned bloodpoint numbers and
the name lines -- so a row whose name OCR missed, or whose name sits a few pixels off,
is still there. All OCR boxes on a name line are kept: the character name and the
player name are often separate boxes (always on the highlighted own row, which draws
them in different colours), and the player name is the one that matters.
"""
from __future__ import annotations

import difflib
import hashlib
import re
import statistics
import unicodedata
from dataclasses import dataclass, field
from typing import Iterable

from app.services.scoreboard_ocr import layout, outcome
from app.services.scoreboard_ocr.layout import Panel

POV_NAME_BOX = (1300, 1920, 60, 115)  # x0, x1, y0, y1 of the account name, top right
BUTTONS_Y = 940

# The row of the player who took the screenshot is drawn with bright white name text,
# every other row with grey text (~255 vs ~130 at the 97th percentile).
GLOW_MIN = 220
GLOW_GAP = 60

NAME_MATCH = 0.8  # similarity at which two player names count as the same


@dataclass(frozen=True)
class Line:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    conf: float = 1.0

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def height(self) -> float:
        return self.y1 - self.y0


class Probes:
    """Pixel-side answers for the parser. This base class knows nothing (all "unknown"),
    which is what the unit tests on synthetic lines use."""

    def locate_panel(self, bodies: list[float], guess: Panel) -> Panel:
        return guess

    def status(self, panel: Panel, name_cy: float) -> tuple[str, dict[str, float]]:
        return "unknown", {}

    def glow(self, panel: Panel, name_cy: float) -> float | None:
        return None

    def redness(self, panel: Panel, name_cy: float) -> float | None:
        return None

    def read_text(self, box: tuple[float, float, float, float]) -> tuple[str, float] | None:
        return None

    def loadout(
        self, panel: Panel, body_cy: float, role: str, character: str | None, *, colours_reliable: bool = True
    ) -> dict | None:
        return None


# ---------------------------------------------------------------- text helpers
def norm(text: str) -> str:
    """Letters and digits only, accents dropped, case-folded: OCR drops spaces and
    varies case."""
    decomposed = unicodedata.normalize("NFKD", text)
    return re.sub(r"[^0-9a-z]", "", "".join(c for c in decomposed if not unicodedata.combining(c)).casefold())


def name_similarity(a: str, b: str) -> float:
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    # Long names are truncated with "..." on the scoreboard: a prefix is a match.
    short, long_ = sorted((a, b), key=len)
    if len(short) >= 6 and long_.startswith(short):
        return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def _digits(text: str) -> int | None:
    if not re.fullmatch(r"[\d\s.,]+", text.strip()):
        return None
    d = re.sub(r"\D", "", text)
    return int(d) if d else None


def _loose_digits(text: str | None) -> str | None:
    """Digits of a re-read crop, which may carry stray brackets ("(100)")."""
    if not text:
        return None
    d = re.sub(r"\D", "", text)
    return d or None


def _letters(text: str) -> int:
    return sum(c.isalpha() for c in text)


def _is_caps(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    return bool(letters) and all(c.isupper() for c in letters)


def _is_bot(text: str) -> bool:
    return text.strip().strip("[]()").upper() == "BOT"


def _cut_after(text: str, alnum_count: int) -> int:
    """Index in `text` just after its first `alnum_count` characters that `norm` keeps."""
    seen = 0
    for i, ch in enumerate(text):
        if seen >= alnum_count:
            return i
        seen += len(norm(ch))
    return len(text)


def _canonical(text: str, known: Iterable[str] | None) -> tuple[str, bool]:
    """The roster spelling of an OCR'd character name, when one is close enough."""
    flat = norm(text)
    if known and flat:
        best, ratio = None, 0.0
        for name in known:
            r = difflib.SequenceMatcher(None, flat, norm(name)).ratio()
            if r > ratio:
                best, ratio = name, r
        if best is not None and ratio >= 0.85:
            return best, True
    return " ".join(w.capitalize() for w in text.split()), False


def _split_caps(text: str) -> tuple[str, str]:
    """"MIKAELAREIDClapping cheeks" -> ("MIKAELAREID", "Clapping cheeks"): the character
    name is in capitals, the player name is the rest."""
    first_lower = next((i for i, c in enumerate(text) if c.islower()), None)
    if first_lower is None:
        return text.strip(), ""
    cut = first_lower
    if cut > 0 and text[cut - 1].isupper():
        cut -= 1  # the capital starting the player name ("...REIDClapping", "MIN Feng")
    while cut > 0 and not text[cut - 1].isalnum() and text[cut - 1] != " ":
        cut -= 1  # keep "[Golona]" whole
    head, tail = text[:cut].strip(), text[cut:].strip()
    if not head:  # the line has no capitals part at all: no character name on it
        return "", text.strip()
    return head, tail


def split_row_text(texts: list[str], known: Iterable[str] | None) -> tuple[str, str, bool, bool]:
    """(character, player, character_known, is_bot) from the OCR boxes of a name line,
    left to right."""
    texts = [t.strip() for t in texts if t and t.strip()]
    is_bot = any(_is_bot(t) for t in texts)
    texts = [t for t in texts if not _is_bot(t)]
    if texts and texts[-1].endswith("[BOT]"):  # "Feng Min_01 [BOT]" in one box
        trimmed = texts[-1][: -len("[BOT]")].strip()
        if trimmed:
            is_bot, texts[-1] = True, trimmed
    full = " ".join(texts)
    if not full:
        return "", "", False, is_bot
    flat = norm(full)
    if known:
        # 1) a roster name the line starts with, longest first ("THE CANNIBAL GHOST")
        for name in sorted(known, key=lambda n: len(norm(n)), reverse=True):
            target = norm(name)
            if target and flat.startswith(target):
                return name, full[_cut_after(full, len(target)) :].strip(), True, is_bot
    if len(texts) > 1 and _is_caps(texts[0]):
        # 2) the character name is its own box
        character, player = texts[0], " ".join(texts[1:])
    else:
        # 3) one box: capitals first, then the player name
        character, player = _split_caps(full)
    character, matched = _canonical(character, known) if character else ("", False)
    return character, player, matched, is_bot


def _pick_number(det: int | None, rec: str | None) -> int | None:
    """Full-page OCR sometimes drops a digit at the edge of a number ("9 112" -> "112");
    the re-read of the number's own crop then has more digits around the same ones."""
    if rec is None:
        return det
    if det is None:
        return int(rec)
    d = str(det)
    if len(rec) > len(d) and (rec.endswith(d) or rec.startswith(d)):
        return int(rec)
    return det


# ---------------------------------------------------------------- rows
@dataclass
class _Row:
    name_cy: float
    boxes: list[Line] = field(default_factory=list)
    bp_lines: list[Line] = field(default_factory=list)
    body_cy: float = 0.0
    data: dict = field(default_factory=dict)


def _bp_lines(lines: list[Line]) -> list[Line]:
    return [
        ln for ln in lines
        if _digits(ln.text) is not None and 200 <= ln.cy <= 930
        and ln.x0 >= 560 and 700 <= ln.x1 <= 1000 and 20 <= ln.height <= 60
    ]


def guess_panel(lines: list[Line]) -> Panel:
    bps = _bp_lines(lines)
    if not bps:
        return Panel()
    panel = Panel.from_bp_right(statistics.median(ln.x1 for ln in bps))
    return panel if 120 <= panel.x0 <= 340 else Panel()


def _cluster(lines: list[Line], tol: float) -> list[list[Line]]:
    groups: list[list[Line]] = []
    for ln in sorted(lines, key=lambda ln: ln.cy):
        if groups and abs(ln.cy - statistics.mean(g.cy for g in groups[-1])) <= tol:
            groups[-1].append(ln)
        else:
            groups.append([ln])
    return groups


def find_rows(lines: list[Line], panel: Panel) -> list[_Row]:
    lo, hi = panel.x(layout.ROW_TEXT_X[0]), panel.x(layout.ROW_TEXT_X[1])
    text = [
        ln for ln in lines
        if lo <= ln.x0 <= hi and 200 <= ln.y0 <= 900 and _digits(ln.text) is None
        and len(norm(ln.text)) >= 2 and 10 <= ln.height <= 40 and ln.conf >= 0.5
    ]
    clusters = _cluster(text, tol=16)
    body_off = panel.d(layout.NAME_TO_BODY)

    rows: list[_Row] = []
    used: set[int] = set()
    for group in _cluster(_bp_lines(lines), tol=15):
        bp_cy = statistics.mean(ln.cy for ln in group)
        name_cy = bp_cy - body_off
        near = [i for i, c in enumerate(clusters) if i not in used and abs(statistics.mean(ln.cy for ln in c) - name_cy) <= 24]
        best = min(near, key=lambda i: abs(statistics.mean(ln.cy for ln in clusters[i]) - name_cy), default=None)
        if best is not None:
            used.add(best)
            boxes = clusters[best]
            rows.append(_Row(name_cy=statistics.mean(ln.cy for ln in boxes), boxes=list(boxes), bp_lines=group, body_cy=bp_cy))
        else:
            rows.append(_Row(name_cy=name_cy, bp_lines=group, body_cy=bp_cy))

    for i, c in enumerate(clusters):
        if i in used:
            continue
        cy = statistics.mean(ln.cy for ln in c)
        if any(abs(cy - r.body_cy) <= 25 for r in rows):
            continue  # OCR noise from the icons on a loadout line
        same = next((r for r in rows if abs(cy - r.name_cy) <= 24), None)
        if same is not None:
            same.boxes.extend(c)
            continue
        first = min(c, key=lambda ln: ln.x0)
        # A name line without a bloodpoint number (the killer's 0 is easy to miss):
        # keep it when it starts in the name column with capitals.
        if first.x0 <= panel.x(layout.PLAYER_MIN_X) and re.match(r"^\W*[A-Z]", first.text):
            rows.append(_Row(name_cy=cy, boxes=list(c), body_cy=cy + body_off))

    rows.sort(key=lambda r: r.name_cy)
    merged: list[_Row] = []
    for r in rows:  # two anchors for one row
        if merged and r.name_cy - merged[-1].name_cy < 0.5 * panel.d(120):
            keep = merged[-1]
            keep.boxes.extend(b for b in r.boxes if b not in keep.boxes)
            if r.bp_lines and not keep.bp_lines:
                keep.bp_lines, keep.body_cy = r.bp_lines, r.body_cy
            continue
        merged.append(r)
    for r in merged:
        r.boxes.sort(key=lambda ln: ln.x0)
    return merged


def locate_rows(lines: list[Line], probes: Probes | None = None) -> tuple[Panel, list[_Row]]:
    """The panel position and the player rows, top to bottom."""
    probes = probes or Probes()
    guess = guess_panel(lines)
    rows = find_rows(lines, guess)
    panel = probes.locate_panel([r.body_cy for r in rows], guess) if rows else guess
    return panel, rows


# ---------------------------------------------------------------- report
def _row_numbers(row: _Row, lines: list[Line], panel: Panel, probes: Probes) -> tuple[int | None, int | None]:
    det_bp = None
    if row.bp_lines:
        det_bp = _digits(" ".join(ln.text for ln in sorted(row.bp_lines, key=lambda ln: ln.x0)))
    # Always re-read the number's own crop: the page pass drops an edge digit even when
    # confident ("9 112" -> "112", "18 004" -> "8004" on the red killer row).
    bp_box = (
        panel.x(layout.BP_X[0]), row.body_cy - panel.d(layout.BP_HALF_H),
        panel.x(layout.BP_X[1]), row.body_cy + panel.d(layout.BP_HALF_H),
    )
    hit = probes.read_text(bp_box)
    rec_bp = _loose_digits(hit[0]) if hit and hit[1] >= 0.5 else None
    bloodpoints = _pick_number(det_bp, rec_bp)
    if bloodpoints is not None and bloodpoints > 200_000:
        bloodpoints = det_bp

    px, py = panel.x(layout.PRESTIGE_X), row.body_cy + panel.d(layout.PRESTIGE_DY)
    half_w, half_h = panel.d(layout.PRESTIGE_BOX[0] / 2), panel.d(layout.PRESTIGE_BOX[1] / 2)
    prestige = None
    for ln in lines:
        value = _digits(ln.text)
        if value is not None and 1 <= value <= 100 and abs((ln.x0 + ln.x1) / 2 - px) <= half_w and abs(ln.cy - py) <= half_h + 4:
            prestige = value
    if prestige is None:
        hit = probes.read_text((px - half_w, py - half_h, px + half_w, py + half_h))
        # single digits come back with low confidence (~0.4) even when read right; the
        # 1-100 range check is the real filter
        digits = _loose_digits(hit[0]) if hit and hit[1] >= 0.3 else None
        if digits and 1 <= int(digits) <= 100:
            prestige = int(digits)
    return bloodpoints, prestige


def _row_texts(row: _Row, panel: Panel, probes: Probes) -> list[str]:
    boxes = [b for b in row.boxes if b.x0 <= panel.x(layout.ROW_TEXT_X[1])]
    texts = [b.text for b in boxes]
    # The character name was not read (the player name, further right, was): read the
    # name column on its own.
    if not boxes or boxes[0].x0 > panel.x(layout.PLAYER_MIN_X):
        # Without any box the line's length is unknown, and a player name in a script
        # the model cannot read (Cyrillic) blanks the whole crop: try shorter crops too
        # and keep the one that reads the most letters.
        rights = [boxes[0].x0 - 3] if boxes else [panel.x(560), panel.x(480), panel.x(420)]
        half = panel.d(13)
        best = None
        for right in rights:
            hit = probes.read_text((panel.x(layout.NAME_X) - 6, row.name_cy - half, right, row.name_cy + half))
            if hit and hit[1] >= 0.6 and _letters(hit[0]) >= 2 and (best is None or _letters(hit[0]) > _letters(best)):
                best = hit[0].strip()
        if best:
            texts.insert(0, best)
    return texts


def _split_at_known_player(texts: list[str], names: list[str], known: Iterable[str] | None) -> tuple[str, str, bool] | None:
    """A glued line that ends with a name we already know -- the account name shown top
    right, or the logged-in user's -- splits right there: "A2A2's Used Fleshlight" with
    the account "A2's Used Fleshlight" is character "A2"."""
    full = " ".join(t.strip() for t in texts if t and t.strip())
    flat = norm(full)
    for name in names:
        target = norm(name or "")
        if len(target) >= 4 and flat.endswith(target) and len(flat) > len(target):
            cut = _cut_after(full, len(flat) - len(target))
            head, tail = full[:cut].strip(), full[cut:].strip()
            if head and _is_caps(head):
                character, matched = _canonical(head, known)
                return character, tail, matched
    return None


def build_report(
    lines: list[Line],
    probes: Probes | None = None,
    *,
    known_characters: Iterable[str] | None = None,
    expected_player: str | None = None,
    kills_for_win: int = outcome.KILLS_FOR_KILLER_WIN,
) -> dict:
    probes = probes or Probes()
    known = list(known_characters or [])
    warnings: list[str] = []

    # ---- panel and rows --------------------------------------------------
    panel, rows = locate_rows(lines, probes)
    if not 3 <= len(rows) <= 6:
        return {"ok": False, "error": "not_a_scoreboard", "warnings": [f"found {len(rows)} player rows"]}
    if not panel.located:
        warnings.append("scoreboard panel position estimated, not measured")

    # The account name is needed below; read it first so it can split glued rows.
    x0, x1, y0, y1 = POV_NAME_BOX
    pov_candidates = [
        ln for ln in lines
        if x0 <= ln.x0 <= x1 and y0 <= ln.y0 <= y1 and _digits(ln.text) is None and _letters(ln.text) >= 2
    ]
    owner_name = max(pov_candidates, key=lambda ln: ln.conf).text if pov_candidates else None
    own_names = [n for n in (owner_name, expected_player) if n]

    for row in rows:
        texts = _row_texts(row, panel, probes)
        character, player, matched, is_bot = split_row_text(texts, known)
        # exact comparison: "'s Used Fleshlight" is *similar* to "A2's Used Fleshlight"
        if own_names and norm(player) not in {norm(n) for n in own_names}:
            glued = _split_at_known_player(texts, own_names, known)
            if glued is not None:
                character, player, matched = glued
        bloodpoints, prestige = _row_numbers(row, lines, panel, probes)
        label, scores = probes.status(panel, row.name_cy)
        row.data = {
            "character": character or None,
            "character_matched": matched,
            "player_name": player,
            "is_bot": is_bot,
            "prestige": prestige,
            "bloodpoints": bloodpoints,
            "status": label,
            "status_scores": {k: round(v, 3) for k, v in scores.items()},
        }

    # ---- who is the killer --------------------------------------------------
    claws = [i for i, r in enumerate(rows) if r.data["status"] == "killer"]
    killer_idx = None
    if len(claws) == 1:
        killer_idx = claws[0]
    else:
        reds = [probes.redness(panel, r.name_cy) for r in rows]
        if any(v is not None for v in reds):
            top = max(range(len(rows)), key=lambda i: reds[i] if reds[i] is not None else -1e9)
            if reds[top] is not None and reds[top] >= layout.KILLER_REDNESS:
                killer_idx = top
    if killer_idx is None:
        killer_idx = len(rows) - 1
        warnings.append("killer row assumed to be the last one")
    for i, row in enumerate(rows):
        row.data["role"] = "killer" if i == killer_idx else "survivor"
        if i == killer_idx:
            row.data["status"] = "killer"
        elif row.data["status"] == "killer":
            row.data["status"] = "unknown"
    survivors = [r for r in rows if r.data["role"] == "survivor"]
    if not survivors:
        return {"ok": False, "error": "not_a_scoreboard", "warnings": ["no survivor rows"]}

    # ---- match state ----------------------------------------------------------
    # A confident read of any word there (2+ letters: also short labels like Japanese
    # ones); background read as text comes back with a low score.
    has_spectate = any(
        ln.y0 >= BUTTONS_Y and ln.x0 < 1650 and _letters(ln.text) >= 2 and ln.conf >= 0.85 for ln in lines
    )
    match = outcome.summarize(
        [r.data["status"] for r in survivors], has_spectate=has_spectate, kills_for_win=kills_for_win
    )
    if match["rows_settled"] and has_spectate:
        warnings.append("every survivor looks settled but the Spectate button is still shown")

    # ---- the highlighted row (the screenshot owner's; language- and OCR-independent)
    highlighted: _Row | None = None
    glows = [probes.glow(panel, r.name_cy) for r in rows]
    if all(g is not None for g in glows):
        order = sorted(range(len(rows)), key=lambda i: glows[i], reverse=True)
        runner_up = glows[order[1]] if len(order) > 1 else 0
        if glows[order[0]] >= GLOW_MIN and glows[order[0]] - runner_up >= GLOW_GAP:
            highlighted = rows[order[0]]

    # ---- loadouts ---------------------------------------------------------------
    for row in rows:
        loadout = probes.loadout(
            panel, row.body_cy, row.data["role"],
            row.data["character"] if row.data["character_matched"] else None,
            # a dimmed killer row is see-through over red: its slot colours lie
            colours_reliable=row.data["role"] == "survivor" or row is highlighted,
        )
        if loadout is not None and row.data["role"] == "killer" and loadout.get("empty") and not match["ended"]:
            loadout["hidden"] = True  # the killer's loadout is only revealed at the end
        row.data["loadout"] = loadout

    # ---- whose screenshot is it ------------------------------------------------
    def best_row_for(name: str | None) -> tuple[_Row | None, float]:
        if not name:
            return None, 0.0
        scored = [(name_similarity(name, r.data["player_name"]), r) for r in rows if r.data["player_name"]]
        if not scored:
            return None, 0.0
        ratio, row = max(scored, key=lambda t: t[0])
        return row, ratio

    pov_row: _Row | None = None
    pov_via = None
    # 1) the highlighted row
    if highlighted is not None:
        pov_row, pov_via = highlighted, "highlight"
    # 2) otherwise the row whose player name is the account name shown top right,
    # 3) or the logged-in user's name
    for via, name in (("account_name", owner_name), ("expected_player", expected_player)):
        if pov_row is None:
            row, ratio = best_row_for(name)
            if row is not None and ratio >= 0.75:
                pov_row, pov_via = row, via
    if pov_row is None:
        warnings.append("could not tell which row belongs to the screenshot's owner")

    pov_name_match = 0.0
    if pov_row is not None and owner_name and pov_row.data["player_name"]:
        pov_name_match = name_similarity(owner_name, pov_row.data["player_name"])
        if pov_name_match < 0.5:
            warnings.append("the highlighted row's player name differs from the account name")

    # ---- is it the logged-in user's screenshot ---------------------------------
    identity = {"expected": expected_player, "matched": None, "similarity": None, "via": None}
    if expected_player:
        options = [("account_name", owner_name)]
        if pov_row is not None:
            options.append(("row", pov_row.data["player_name"]))
        best_via, best = None, 0.0
        for via, name in options:
            ratio = name_similarity(expected_player, name or "")
            if ratio > best:
                best_via, best = via, ratio
        identity.update(matched=best >= NAME_MATCH, similarity=round(best, 2), via=best_via)

    # ---- outcome ----------------------------------------------------------------
    pov_role = pov_row.data["role"] if pov_row is not None else None
    own = outcome.pov_outcome(pov_role, pov_row.data["status"] if pov_row is not None else None, match)
    if pov_role == "survivor":
        pov_won = own["survived"]
    elif pov_role == "killer":
        pov_won = None if not own["final"] else own["result"] == "won"
    else:
        pov_won = None

    checks = {"pov_identified": pov_row is not None, "player_name_matches": identity["matched"]}
    passed = pov_won is True and checks["pov_identified"] and identity["matched"] is not False

    fingerprint = hashlib.sha256(
        "|".join(f"{norm(r.data['character'] or '')}:{r.data['bloodpoints']}" for r in rows).encode()
    ).hexdigest()[:32]
    # Same for every screenshot of one match (any player's, before or after the end).
    match_key = hashlib.sha256(
        "|".join(sorted(f"{r.data['role']}:{norm(r.data['player_name'] or r.data['character'] or '')}" for r in rows)).encode()
    ).hexdigest()[:32]

    public_rows = [dict(r.data) for r in rows]
    return {
        "ok": True,
        "scoreboard": {"is_final": match["ended"], "has_spectate_button": has_spectate, "panel_located": panel.located},
        "owner_name": owner_name,
        "pov": None if pov_row is None else {
            "player_name": pov_row.data["player_name"],
            "role": pov_row.data["role"],
            "character": pov_row.data["character"],
            "character_matched": pov_row.data["character_matched"],
            "status": pov_row.data["status"],
            "row": rows.index(pov_row),
            "found_by": pov_via,
            "name_match": round(pov_name_match, 2),
            "outcome": own["outcome"],
            "result": own["result"],
            "result_final": own["final"],
            "loadout": pov_row.data["loadout"],
        },
        "identity": identity,
        "rows": public_rows,
        "summary": {
            "kills": match["kills"], "escapes": match["escapes"], "in_trial": match["in_trial"],
            "unknown": match["unknown"], "verdict": match["verdict"],
        },
        "match": {
            "ended": match["ended"],
            "verdict": match["verdict"],
            "verdict_final": match["verdict_final"],
            "kills_at_least": match["kills"],
            "kills_at_most": match["kills_max"],
        },
        "facts": outcome.facts(pov_role, own, match),
        "pov_won": pov_won,
        "checks": checks,
        "passed": bool(passed),
        "fingerprint": fingerprint,
        "match_key": match_key,
        "warnings": warnings,
    }
