"""Rebuilds app/services/scoreboard_ocr/prototypes.npz from labelled screenshots.

    python scripts/build_scoreboard_prototypes.py <screenshots_dir>

<screenshots_dir> holds the .jpg/.png files plus ground_truth.json (see
additions/ss-ocr). Each labelled row's icon becomes a patch; a class prototype is
the mean of its patches. Re-run after adding screenshots of other languages,
resolutions or icon variants.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.scoreboard_ocr import load_image, read_lines  # noqa: E402
from app.services.scoreboard_ocr.icons import CLASSES, icon_patch, icon_window  # noqa: E402
from app.services.scoreboard_ocr.parse import Line, _is_name_line  # noqa: E402


def row_centres(lines: list[Line]) -> list[float]:
    centres: list[float] = []
    for ln in sorted((ln for ln in lines if _is_name_line(ln)), key=lambda ln: ln.cy):
        if centres and abs(ln.cy - centres[-1]) < 30:
            continue
        centres.append(ln.cy)
    return centres


def main(folder: Path) -> None:
    truth = json.loads((folder / "ground_truth.json").read_text(encoding="utf-8"))
    patches: dict[str, list[np.ndarray]] = {c: [] for c in CLASSES}
    for name, spec in truth.items():
        if name.startswith("_"):
            continue
        rgb = load_image((folder / name).read_bytes())
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        centres = row_centres(read_lines(rgb))
        if len(centres) != len(spec["rows"]):
            raise SystemExit(f"{name}: expected {len(spec['rows'])} rows, OCR found {len(centres)}")
        for cy, (_, status) in zip(centres, spec["rows"]):
            window = icon_window(gray, cy)
            patch = None if window is None else icon_patch(window)
            if patch is not None:
                patches[status].append(patch)
    out = Path(__file__).resolve().parent.parent / "app/services/scoreboard_ocr/prototypes.npz"
    np.savez_compressed(out, **{c: np.mean(p, axis=0).astype(np.float32) for c, p in patches.items()})
    print({c: len(p) for c, p in patches.items()}, "->", out)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
