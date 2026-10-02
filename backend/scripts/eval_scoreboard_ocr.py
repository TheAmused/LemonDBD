"""Scores the scoreboard reader against hand-labelled screenshots.

    python scripts/eval_scoreboard_ocr.py <screenshots_dir> [--holdout]

--holdout rebuilds the icon prototypes without each screenshot before reading it
(leave-one-image-out), which is the honest number: without it the prototypes have
seen the very rows being tested.
"""
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.scoreboard_ocr import analyze_scoreboard, load_image, read_lines, row_probes  # noqa: E402
from app.services.scoreboard_ocr.icons import CLASSES, classify_icon, icon_patch, icon_window  # noqa: E402
from app.services.scoreboard_ocr.parse import build_report, name_similarity  # noqa: E402
from scripts.build_scoreboard_prototypes import row_centres  # noqa: E402


def main(folder: Path, holdout: bool) -> int:
    truth = {k: v for k, v in json.loads((folder / "ground_truth.json").read_text(encoding="utf-8")).items() if not k.startswith("_")}
    cache = {}
    for name in truth:
        rgb = load_image((folder / name).read_bytes())
        cache[name] = (rgb, cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), read_lines(rgb))

    patches: dict[str, dict[str, list[np.ndarray]]] = {}
    if holdout:
        for name, spec in truth.items():
            _, gray, lines = cache[name]
            per = {c: [] for c in CLASSES}
            for cy, (_, status) in zip(row_centres(lines), spec["rows"]):
                p = icon_patch(icon_window(gray, cy))
                if p is not None:
                    per[status].append(p)
            patches[name] = per

    totals = {"rows": 0, "status_ok": 0, "names_ok": 0, "files": 0, "final_ok": 0, "verdict_ok": 0, "pov_ok": 0, "won_ok": 0}
    for name, spec in truth.items():
        rgb, gray, lines = cache[name]
        protos = None
        if holdout:
            protos = {
                c: np.mean([p for other, per in patches.items() if other != name for p in per[c]], axis=0)
                for c in CLASSES
            }
        t0 = time.time()
        _, glow = row_probes(gray)
        report = build_report(lines, lambda cy: classify_icon(icon_window(gray, cy), protos), glow)
        ms = (time.time() - t0) * 1000
        totals["files"] += 1
        if not report.get("ok"):
            print(f"{name}: FAILED {report}")
            continue
        for got, (want_char, want_status) in zip(report["rows"], spec["rows"]):
            totals["rows"] += 1
            totals["status_ok"] += got["status"] == want_status
            totals["names_ok"] += name_similarity(got["character"], want_char) >= 0.85
        totals["final_ok"] += report["scoreboard"]["is_final"] == spec["is_final"]
        totals["verdict_ok"] += report["summary"]["verdict"] == spec["verdict"]
        totals["pov_ok"] += bool(report["owner_name"]) and name_similarity(report["owner_name"], spec["owner"]) >= 0.8
        totals["won_ok"] += report["pov_won"] == spec["pov_won"]
        flag = "" if (report["summary"]["verdict"] == spec["verdict"] and report["pov_won"] == spec["pov_won"]) else "  <-- MISMATCH"
        print(f"{name}: final={report['scoreboard']['is_final']} verdict={report['summary']['verdict']} "
              f"pov_won={report['pov_won']} owner={report['owner_name']!r} spectate={report['scoreboard']['has_spectate_button']}{flag}")
    n = totals["files"]
    print(f"\nrows: status {totals['status_ok']}/{totals['rows']}, character names {totals['names_ok']}/{totals['rows']}")
    print(f"files: final {totals['final_ok']}/{n}, verdict {totals['verdict_ok']}/{n}, owner {totals['pov_ok']}/{n}, pov_won {totals['won_ok']}/{n}")
    return 0 if totals["status_ok"] == totals["rows"] and totals["won_ok"] == n else 1


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1]), "--holdout" in sys.argv))
