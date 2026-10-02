# backend/app/services/scoreboard_ocr/parse.py
"""Turns OCR lines + per-row icon classes into a scoreboard report. Pure logic."""
from __future__ import annotations

import difflib
import hashlib
import re
from dataclasses import dataclass
from typing import Callable, Iterable

# Layout of the 1920x1080 reference frame.
NAME_X = (195, 300)
NAME_Y = (240, 900)
BP_X = (730, 830)
PRESTIGE_X = (80, 160)
POV_NAME_BOX = (1300, 1920, 60, 115)  # x0, x1, y0, y1 of the account name, top right
BUTTONS_Y = 940
ROW_DEPTH = 110  # how far below a name line its numbers can sit

KILLS_FOR_KILLER_WIN = 3
# The row of the player who took the screenshot is drawn with bright white name text,
# every other row with grey text (~255 vs ~130 at the 97th percentile).
GLOW_MIN = 220
GLOW_GAP = 60


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


def norm(text: str) -> str:
    """Letters and digits only, case-folded: OCR drops spaces and varies case."""
    return re.sub(r"[^0-9a-z]", "", text.casefold())


def name_similarity(a: str, b: str) -> float:
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    # Long names are truncated with "..." on the scoreboard: a prefix is a match.
    short, long_ = sorted((a, b), key=len)
    if len(short) >= 6 and long_.startswith(short):
        return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def _is_name_line(line: Line) -> bool:
    letters = sum(c.isalpha() for c in line.text)
    return (
        NAME_X[0] <= line.x0 <= NAME_X[1]
        and NAME_Y[0] <= line.y0 <= NAME_Y[1]
        and letters >= 4
        and re.match(r"^\W*[A-Z]{2}", line.text) is not None
    )


def _digits(text: str) -> int | None:
    if not re.fullmatch(r"[\d\s.,]+", text.strip()):
        return None
    d = re.sub(r"\D", "", text)
    return int(d) if d else None


def split_name(text: str, known: Iterable[str] | None) -> tuple[str, str, bool]:
    """Splits "AURORA STARDOTTER oyasumi" into (character, player, character_known)."""
    tokens = text.split()
    flat = norm(text)
    if known:
        for name in sorted(known, key=len, reverse=True):
            target = norm(name)
            if target and flat.startswith(target):
                taken, used = 0, 0
                for tok in tokens:
                    if taken >= len(target):
                        break
                    taken += len(norm(tok))
                    used += 1
                return name, " ".join(tokens[used:]), True
    used = 0
    for tok in tokens:
        if any(c.isalpha() for c in tok) and tok == tok.upper():
            used += 1
        else:
            break
    used = max(used, 1)
    return " ".join(tokens[:used]), " ".join(tokens[used:]), False


def build_report(
    lines: list[Line],
    classify_row: Callable[[float], tuple[str, dict[str, float]]],
    glow: Callable[[Line], float] | None = None,
    *,
    known_characters: Iterable[str] | None = None,
    expected_player: str | None = None,
    expected_role: str | None = None,
    expected_character: str | None = None,
    kills_for_win: int = KILLS_FOR_KILLER_WIN,
) -> dict:
    warnings: list[str] = []

    # ---- rows -----------------------------------------------------------
    name_lines = sorted((ln for ln in lines if _is_name_line(ln)), key=lambda ln: ln.cy)
    rows: list[dict] = []
    for ln in name_lines:
        if rows and abs(ln.cy - rows[-1]["_cy"]) < 30:
            rows[-1]["_extra"].append(ln.text)  # e.g. a separate "BOT" box on the same row
            continue
        rows.append({"_cy": ln.cy, "_text": ln.text, "_extra": [], "_conf": ln.conf, "_line": ln})
    if not 3 <= len(rows) <= 6:
        return {"ok": False, "error": "not_a_scoreboard", "warnings": [f"found {len(rows)} player rows"]}

    for i, row in enumerate(rows):
        bottom = rows[i + 1]["_cy"] - 25 if i + 1 < len(rows) else row["_cy"] + ROW_DEPTH
        bp = prestige = None
        for ln in lines:
            value = _digits(ln.text)
            if value is None or not row["_cy"] - 25 <= ln.cy <= bottom + 25:
                continue
            if BP_X[0] <= ln.x0 <= BP_X[1] and value >= 100:
                bp = value
            elif PRESTIGE_X[0] <= ln.x0 <= PRESTIGE_X[1] and 1 <= value <= 100:
                prestige = value
        label, scores = classify_row(row["_cy"])
        character, player, matched = split_name(row["_text"], known_characters)
        if any(e.strip().strip("[]").upper() == "BOT" for e in row["_extra"]):
            player = f"{player} [BOT]".strip()
        row.update(
            character=character,
            character_matched=matched,
            player_name=player,
            prestige=prestige,
            bloodpoints=bp,
            status=label,
            status_scores={k: round(v, 3) for k, v in scores.items()},
        )

    # The killer is the row with the claw icon; the scoreboard lists it last.
    killer_idx = next((i for i, r in enumerate(rows) if r["status"] == "killer"), None)
    if killer_idx is None:
        killer_idx = len(rows) - 1
        warnings.append("killer row assumed to be the last one")
    for i, row in enumerate(rows):
        row["role"] = "killer" if i == killer_idx else "survivor"
    survivors = [r for r in rows if r["role"] == "survivor"]
    if not survivors:
        return {"ok": False, "error": "not_a_scoreboard", "warnings": ["no survivor rows"]}

    # ---- summary --------------------------------------------------------
    escapes = sum(r["status"] == "escaped" for r in survivors)
    kills = sum(r["status"] == "dead" for r in survivors)
    in_trial = sum(r["status"] == "in_trial" for r in survivors)
    unknown = len(survivors) - escapes - kills - in_trial
    is_final = in_trial == 0 and unknown == 0
    if is_final:
        verdict = "killer_win" if kills >= kills_for_win else "draw" if kills == 2 else "survivor_win"
    else:
        verdict = "incomplete"

    # ---- whose screenshot is it ----------------------------------------
    x0, x1, y0, y1 = POV_NAME_BOX
    pov_candidates = [
        ln for ln in lines
        if x0 <= ln.x0 <= x1 and y0 <= ln.y0 <= y1 and _digits(ln.text) is None
        and sum(c.isalpha() for c in ln.text) >= 3
    ]
    pov_text = max(pov_candidates, key=lambda ln: ln.conf).text if pov_candidates else None
    pov_row, pov_ratio = None, 0.0
    # 1) the highlighted row (language- and OCR-independent)
    if glow is not None:
        glows = [glow(r["_line"]) for r in rows]
        order = sorted(range(len(rows)), key=lambda i: glows[i], reverse=True)
        top = order[0]
        runner_up = glows[order[1]] if len(order) > 1 else 0
        if glows[top] >= GLOW_MIN and glows[top] - runner_up >= GLOW_GAP:
            pov_row = rows[top]
    # 2) otherwise the row whose player name matches the account name top right
    if pov_row is None and pov_text:
        for r in rows:
            ratio = name_similarity(pov_text, r["player_name"].replace("[BOT]", ""))
            if ratio > pov_ratio:
                best, pov_ratio = r, ratio
        if pov_ratio >= 0.75:
            pov_row = best
    if pov_row is not None and pov_text:
        pov_ratio = name_similarity(pov_text, pov_row["player_name"].replace("[BOT]", ""))
        if pov_ratio < 0.5:
            warnings.append("the highlighted row's player name differs from the account name")
    if pov_row is None:
        warnings.append("could not tell which row belongs to the screenshot's owner")

    has_spectate = any(
        ln.y0 >= BUTTONS_Y and ln.x0 < 1650 and sum(c.isalpha() for c in ln.text) >= 4 for ln in lines
    )

    # ---- did the owner win ---------------------------------------------
    pov_won: bool | None = None
    if pov_row is not None:
        if pov_row["role"] == "survivor":
            if pov_row["status"] == "escaped":
                pov_won = True
            elif pov_row["status"] == "dead":
                pov_won = False
        elif is_final:
            pov_won = kills >= kills_for_win

    checks = {
        "pov_identified": pov_row is not None,
        "player_name_matches": (
            None if not expected_player else max(
                name_similarity(expected_player, pov_text or ""),
                name_similarity(expected_player, pov_row["player_name"]) if pov_row else 0.0,
            ) >= 0.75
        ),
        "role_matches": None if not expected_role or pov_row is None else pov_row["role"] == expected_role,
        "character_matches": (
            None if not expected_character or pov_row is None
            else name_similarity(expected_character, pov_row["character"]) >= 0.8
        ),
    }
    passed = pov_won is True and all(v is not False for v in checks.values()) and checks["pov_identified"]

    fingerprint = hashlib.sha256(
        "|".join(f"{norm(r['character'])}:{r['bloodpoints']}" for r in rows).encode()
    ).hexdigest()[:32]

    public_rows = [
        {k: v for k, v in r.items() if not k.startswith("_")} for r in rows
    ]
    return {
        "ok": True,
        "scoreboard": {"is_final": is_final, "has_spectate_button": has_spectate},
        "owner_name": pov_text,
        "pov": None if pov_row is None else {
            "player_name": pov_row["player_name"],
            "role": pov_row["role"],
            "character": pov_row["character"],
            "status": pov_row["status"],
            "row": rows.index(pov_row),
            "name_match": round(pov_ratio, 2),
        },
        "rows": public_rows,
        "summary": {
            "kills": kills, "escapes": escapes, "in_trial": in_trial,
            "unknown": unknown, "verdict": verdict,
        },
        "pov_won": pov_won,
        "checks": checks,
        "passed": passed,
        "fingerprint": fingerprint,
        "warnings": warnings,
    }
