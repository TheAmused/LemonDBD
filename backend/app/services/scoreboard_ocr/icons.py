# backend/app/services/scoreboard_ocr/icons.py
"""Status icons on the Dead by Daylight end-of-match scoreboard.

Whether a survivor escaped, died or is still playing is drawn as a small icon
left of the name, not written as text, so OCR cannot read it. The four icons
(door-runner = escaped, skull = dead, bust = still in the trial, claw = the
killer row) are told apart by correlating a size-normalised patch of the icon
with a prototype per class. Matching is brightness-invariant, so the dimmed
rows and the highlighted row of the player who took the screenshot both work.

All coordinates are in the 1920x1080 reference frame the analyzer resizes to.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

CLASSES = ("escaped", "dead", "in_trial", "killer")

# Search window for the icon, relative to the vertical centre of the name text.
WIN_X0, WIN_X1, WIN_HALF_H = 203, 243, 18
PATCH = 28
MIN_SCORE = 0.5    # best correlation below this -> "unknown"
MIN_MARGIN = 0.06  # best minus runner-up below this -> "unknown"

_PROTOTYPES_FILE = Path(__file__).with_name("prototypes.npz")


def icon_window(gray: np.ndarray, centre_y: float) -> np.ndarray | None:
    """The grayscale strip where a row's status icon lives (None when off-image)."""
    cy = int(round(centre_y))
    top, bottom = cy - WIN_HALF_H, cy + WIN_HALF_H
    if top < 0 or bottom > gray.shape[0] or WIN_X1 > gray.shape[1]:
        return None
    return gray[top:bottom, WIN_X0:WIN_X1]


def icon_patch(window: np.ndarray) -> np.ndarray | None:
    """Centre the icon blob in a PATCH x PATCH map of |pixel - background|."""
    w = window.astype(np.float32)
    background = np.median(w)
    deviation = np.abs(w - background)
    peak = float(deviation.max())
    if peak < 12:  # nothing but background: no icon here
        return None
    mask = (deviation > 0.4 * peak).astype(np.uint8)
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    count, _labels, stats, centroids = cv2.connectedComponentsWithStats(mask)
    best = None
    for k in range(1, count):
        _x, _y, width, height, area = stats[k]
        if width < 8 or height < 10 or width > 34 or height > 36:
            continue
        if best is None or area > stats[best][4]:
            best = k
    if best is None:
        return None
    cx, cy = centroids[best]
    shift = np.float32([[1, 0, PATCH / 2 - cx], [0, 1, PATCH / 2 - cy]])
    patch = cv2.warpAffine(
        w - background, shift, (PATCH, PATCH),
        flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE,
    )
    patch = np.abs(patch)
    return patch / (patch.max() + 1e-6)


def _ncc(a: np.ndarray, b: np.ndarray) -> float:
    a = a - a.mean()
    b = b - b.mean()
    return float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-9))


@lru_cache(maxsize=1)
def load_prototypes() -> dict[str, np.ndarray]:
    data = np.load(_PROTOTYPES_FILE)
    return {name: data[name] for name in CLASSES}


def classify_icon(
    window: np.ndarray | None, prototypes: dict[str, np.ndarray] | None = None
) -> tuple[str, dict[str, float]]:
    """Returns (label, scores); label is "unknown" when nothing matches clearly."""
    if window is None:
        return "unknown", {}
    patch = icon_patch(window)
    if patch is None:
        return "unknown", {}
    protos = prototypes or load_prototypes()
    scores = {name: _ncc(patch, proto) for name, proto in protos.items()}
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    (label, best), (_, runner_up) = ranked[0], ranked[1]
    if best < MIN_SCORE or best - runner_up < MIN_MARGIN:
        return "unknown", scores
    return label, scores
