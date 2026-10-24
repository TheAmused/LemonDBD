"""Scores the scoreboard reader against hand-labelled screenshots.

    python scripts/eval_scoreboard_ocr.py <screenshots_dir> [--holdout] [--loadout]

--holdout rebuilds the icon prototypes without each screenshot before reading it
(leave-one-image-out), which is the honest number: without it the prototypes have
seen the very rows being tested.
--loadout also reads perks / items / add-ons / offerings from app/static/icons
(names come from the file names, so they print as e.g. "Dead Hard"). There is no
loadout ground truth: check the printed names against the screenshots.

The expected verdict is derived from the labelled statuses with the same rule the
reader uses, so a match that is already decided before its end (3 kills, or 3
escapes) is expected to report that verdict, not "incomplete".
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.scoreboard_ocr import IconRef, ImageProbes, load_image, read_lines, status_window  # noqa: E402
from app.services.scoreboard_ocr import outcome  # noqa: E402
from app.services.scoreboard_ocr.icons import CLASSES, classify_icon, icon_patch  # noqa: E402
from app.services.scoreboard_ocr.parse import build_report, locate_rows, name_similarity  # noqa: E402

ICONS = Path(__file__).resolve().parent.parent / "app" / "static" / "icons"


def _title(path: Path) -> str:
    return path.stem.replace("_", " ").title()


def static_catalog() -> list[IconRef]:
    refs = [IconRef("perk", _title(p), str(p), "survivor") for p in ICONS.glob("survivors/*/*.webp")]
    refs += [IconRef("perk", _title(p), str(p), "killer") for p in ICONS.glob("killers/*/*.webp")]
    refs += [IconRef("item", _title(p), str(p), "survivor") for p in ICONS.glob("items/*.webp")]
    refs += [IconRef("addon", _title(p), str(p)) for p in ICONS.glob("addons/*.webp")]
    refs += [IconRef("offering", _title(p), str(p)) for p in ICONS.glob("offerings/*.webp")]
    return refs


def static_characters() -> list[str]:
    return sorted({p.name for p in [*ICONS.glob("survivors/*"), *ICONS.glob("killers/*")] if p.is_dir()} - {"General"})


class _HoldoutProbes(ImageProbes):
    def __init__(self, rgb, catalog, protos):
        super().__init__(rgb, catalog)
        self.protos = protos

    def status(self, panel, name_cy):
        return classify_icon(status_window(self.gray, panel, name_cy), self.protos)


def main(folder: Path, holdout: bool, loadout: bool) -> int:
    truth = {k: v for k, v in json.loads((folder / "ground_truth.json").read_text(encoding="utf-8")).items() if not k.startswith("_")}
    catalog = static_catalog() if loadout else None
    known = static_characters()
    cache = {}
    for name in truth:
        rgb = load_image((folder / name).read_bytes())
        cache[name] = (rgb, read_lines(rgb))

    patches: dict[str, dict[str, list[np.ndarray]]] = {}
    if holdout:
        for name, spec in truth.items():
            rgb, lines = cache[name]
            gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
            panel, rows = locate_rows(lines, ImageProbes(rgb, ocr=False))
            per = {c: [] for c in CLASSES}
            for row, (_, status) in zip(rows, spec["rows"]):
                p = icon_patch(status_window(gray, panel, row.name_cy))
                if p is not None:
                    per[status].append(p)
            patches[name] = per

    totals = {"rows": 0, "status_ok": 0, "names_ok": 0, "players": 0, "files": 0, "final_ok": 0, "verdict_ok": 0, "pov_ok": 0, "won_ok": 0}
    for name, spec in truth.items():
        rgb, lines = cache[name]
        protos = None
        if holdout:
            protos = {
                c: np.mean([p for other, per in patches.items() if other != name for p in per[c]], axis=0)
                for c in CLASSES
            }
        probes = _HoldoutProbes(rgb, catalog, protos) if protos else ImageProbes(rgb, catalog)
        report = build_report(lines, probes, known_characters=known, expected_player=spec["owner"])
        totals["files"] += 1
        if not report.get("ok"):
            print(f"{name}: FAILED {report}")
            continue
        for got, (want_char, want_status) in zip(report["rows"], spec["rows"]):
            totals["rows"] += 1
            totals["status_ok"] += got["status"] == want_status
            totals["names_ok"] += name_similarity(got["character"] or "", want_char) >= 0.85
            totals["players"] += bool(got["player_name"])
        survivor_statuses = [s for _, s in spec["rows"] if s != "killer"]
        expected = outcome.summarize(survivor_statuses, has_spectate=not spec["is_final"])
        totals["final_ok"] += report["scoreboard"]["is_final"] == spec["is_final"]
        totals["verdict_ok"] += report["summary"]["verdict"] == expected["verdict"]
        totals["pov_ok"] += bool(report["owner_name"]) and name_similarity(report["owner_name"], spec["owner"]) >= 0.8
        totals["won_ok"] += report["pov_won"] == spec["pov_won"]
        flag = "" if (report["summary"]["verdict"] == expected["verdict"] and report["pov_won"] == spec["pov_won"]) else "  <-- MISMATCH"
        pov = report["pov"] or {}
        print(f"{name}: ended={report['match']['ended']} verdict={report['summary']['verdict']} "
              f"(final={report['match']['verdict_final']}) own={pov.get('outcome')}/{pov.get('result')} "
              f"settled={pov.get('result_final')} owner={report['owner_name']!r} me={report['identity']['matched']}{flag}")
        if loadout:
            for row in report["rows"]:
                lo = row["loadout"] or {}
                names = [(s or {}).get("name") or ("-" if (s or {}).get("empty") else "?") for s in lo.get("perks", [])]
                print(f"    {row['character']!s:20} {row['player_name']!r:26} perks={names}"
                      f"{' (hidden)' if lo.get('hidden') else ''}")
    n = totals["files"]
    print(f"\nrows: status {totals['status_ok']}/{totals['rows']}, character names {totals['names_ok']}/{totals['rows']}, "
          f"player names read {totals['players']}/{totals['rows']}")
    print(f"files: final {totals['final_ok']}/{n}, verdict {totals['verdict_ok']}/{n}, owner {totals['pov_ok']}/{n}, pov_won {totals['won_ok']}/{n}")
    return 0 if totals["status_ok"] == totals["rows"] and totals["won_ok"] == n else 1


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1]), "--holdout" in sys.argv, "--loadout" in sys.argv))
