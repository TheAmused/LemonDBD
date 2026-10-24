# backend/app/services/scoreboard_ocr/outcome.py
"""What a scoreboard screenshot proves, and from which moment on. Pure logic.

A screenshot is often taken before the match is over: a survivor who died first sees
the scoreboard (with a Spectate button) while the others still play. So three things
are kept apart:

* the screenshot owner's own outcome -- for a survivor it is settled the moment they
  escape or die, whatever happens to the others. That is all a "survive" or "escape"
  challenge needs, so it can be counted straight away;
* the match result (killer win / draw / survivor win) -- settled when every survivor
  has escaped or died, or earlier when the remaining survivors can no longer change
  it (3 kills already, or 3 escapes already);
* the kill count -- exact only at the end, but the kills so far are a lower bound
  that only grows, so "get 2 kills" can be counted as soon as 2 are dead.
"""
from __future__ import annotations

KILLS_FOR_KILLER_WIN = 3


def verdict_for(kills: int, kills_for_win: int = KILLS_FOR_KILLER_WIN) -> str:
    if kills >= kills_for_win:
        return "killer_win"
    if kills == 2 and kills_for_win > 2:
        return "draw"
    return "survivor_win"


def summarize(statuses: list[str], *, has_spectate: bool, kills_for_win: int = KILLS_FOR_KILLER_WIN) -> dict:
    """`statuses` are the survivor rows' icon classes (escaped/dead/surrendered/in_trial/unknown)."""
    escapes = statuses.count("escaped")
    surrenders = statuses.count("surrendered")
    kills = statuses.count("dead") + surrenders
    in_trial = statuses.count("in_trial")
    unknown = len(statuses) - escapes - kills - in_trial
    settled_rows = in_trial == 0 and unknown == 0
    # The Spectate button is only there while someone is still playing.
    ended = settled_rows and not has_spectate
    kills_max = kills + in_trial + unknown
    lowest, highest = verdict_for(kills, kills_for_win), verdict_for(kills_max, kills_for_win)
    verdict_final = lowest == highest
    return {
        "ended": ended,
        "rows_settled": settled_rows,
        "kills": kills,          # dead so far (exact once the match ended)
        "kills_max": kills_max,  # what it could still become
        "escapes": escapes,
        "surrenders": surrenders,
        "in_trial": in_trial,
        "unknown": unknown,
        "verdict": lowest if verdict_final else "incomplete",
        "verdict_final": verdict_final,
    }


def pov_outcome(role: str | None, status: str | None, match: dict) -> dict:
    """The screenshot owner's result and whether it is already settled."""
    if role == "survivor":
        if status == "escaped":
            return {"outcome": "escaped", "result": "won", "survived": True, "final": True}
        if status == "dead":
            return {"outcome": "died", "result": "lost", "survived": False, "final": True}
        if status == "surrendered":
            return {"outcome": "surrendered", "result": "lost", "survived": False, "final": True}
        return {"outcome": status or "unknown", "result": None, "survived": None, "final": False}
    if role == "killer":
        result = {"killer_win": "won", "draw": "draw", "survivor_win": "lost"}.get(match["verdict"])
        return {
            "outcome": "killer",
            "result": result if match["verdict_final"] else None,
            "survived": None,
            "final": bool(match["verdict_final"]),
        }
    return {"outcome": "unknown", "result": None, "survived": None, "final": False}


def facts(role: str | None, own: dict, match: dict) -> dict:
    """The values a challenge can be checked against, with what is already settled."""
    return {
        "match_ended": match["ended"],
        "verdict": match["verdict"],
        "verdict_final": match["verdict_final"],
        "survived": own["survived"],
        "own_result": own["result"],
        "own_result_final": own["final"],
        "kills": match["kills"] if match["ended"] else None,
        "kills_at_least": match["kills"],
        "escapes": match["escapes"] if match["ended"] else None,
        "escapes_at_least": match["escapes"],
        "settled": {
            "own_outcome": own["final"],
            "match_result": match["verdict_final"],
            "kill_count": match["ended"],
        },
    }
