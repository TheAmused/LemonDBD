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

from app.services.scoreboard_ocr import ImageProbes, load_image, read_lines, status_window  # noqa: E402
from app.services.scoreboard_ocr.icons import CLASSES, icon_patch  # noqa: E402
from app.services.scoreboard_ocr.parse import locate_rows  # noqa: E402


def row_windows(rgb: np.ndarray, lines) -> list[np.ndarray | None]:
    """The status-icon window of every row, top to bottom."""
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    panel, rows = locate_rows(lines, ImageProbes(rgb, ocr=False))
    return [status_window(gray, panel, r.name_cy) for r in rows]


def main(folder: Path) -> None:
    truth = json.loads((folder / "ground_truth.json").read_text(encoding="utf-8"))
    patches: dict[str, list[np.ndarray]] = {c: [] for c in CLASSES}
    for name, spec in truth.items():
        if name.startswith("_"):
            continue
        rgb = load_image((folder / name).read_bytes())
        windows = row_windows(rgb, read_lines(rgb))
        if len(windows) != len(spec["rows"]):
            raise SystemExit(f"{name}: expected {len(spec['rows'])} rows, found {len(windows)}")
        for window, (_, status) in zip(windows, spec["rows"]):
            patch = None if window is None else icon_patch(window)
            if patch is not None:
                patches[status].append(patch)
    out = Path(__file__).resolve().parent.parent / "app/services/scoreboard_ocr/prototypes.npz"
    np.savez_compressed(out, **{c: np.mean(p, axis=0).astype(np.float32) for c, p in patches.items()})
    print({c: len(p) for c, p in patches.items()}, "->", out)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
