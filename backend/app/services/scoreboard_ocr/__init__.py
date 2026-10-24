# backend/app/services/scoreboard_ocr/__init__.py
"""Reads a Dead by Daylight end-of-match scoreboard screenshot, in memory.

The image is decoded from bytes, analysed and dropped: nothing is written to disk
or the database. OCR is PaddleOCR's detector/recogniser (PP-OCRv6) run through ONNX
Runtime by `rapidocr` 3.x, models bundled in the wheel. Status icons and the loadout
(perks, offering, item, add-ons) are pictures, not text: they are matched against
reference images (see icons.py and loadout.py).
"""
from __future__ import annotations

import io
import logging
import threading
from typing import Iterable

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.services.scoreboard_ocr import layout
from app.services.scoreboard_ocr.icons import WIN_HALF_H, classify_icon, icon_window
from app.services.scoreboard_ocr.layout import Panel
from app.services.scoreboard_ocr.loadout import IconCatalog, IconRef, locate_panel, read_loadout
from app.services.scoreboard_ocr.parse import Line, Probes, build_report

logger = logging.getLogger(__name__)

__all__ = [
    "ACCEPTED_INPUT_NOTE", "IconCatalog", "IconRef", "ScoreboardError", "analyze_scoreboard",
    "ImageProbes", "engine_available", "load_image", "read_lines", "recognize", "status_window",
]

REF_W, REF_H = 1920, 1080
MAX_PIXELS = 36_000_000  # 8K; anything larger is refused before decoding
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

_engine = None
_engine_lock = threading.Lock()  # guards creating the engine
_infer_lock = threading.Lock()   # one ONNX session: one inference at a time

# rapidocr 3.x keeps the per-call switches (use_det, text_score, ...) on the engine for
# the following calls, so every call passes all of them.
# (No angle classifier: scoreboard text is never upside down.)
_FULL_PAGE = {"use_det": True, "use_cls": False, "use_rec": True, "text_score": 0.5}
# A single crop: recogniser only, and no score filter -- the caller judges the score.
_CROP_ONLY = {"use_det": False, "use_cls": False, "use_rec": True, "text_score": 0.0}

# Text detection is the slow part, and most of the screen is background and chat: it
# only runs on the scoreboard panel (x0, y0, x1, y1 in the 1920x1080 frame). The two HUD
# texts sit at fixed places and are read with the recogniser alone: the account name
# (top right, right-aligned) and the Spectate button, which is only there while someone
# is still playing.
PANEL_REGION = (0, 170, 1150, 960)
ACCOUNT_NAME_BOX = (1330, 80, 1735, 111)
SPECTATE_BOX = (1380, 978, 1560, 1024)


ACCEPTED_INPUT_NOTE = (
    "Only full-screen screenshots of the game or Steam screenshots are accepted "
    "(uncropped, 16:9, at least 1280x720)."
)


class ScoreboardError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def engine_available() -> bool:
    try:
        import rapidocr  # noqa: F401
    except Exception:  # pragma: no cover - depends on the install
        logger.debug("OCR engine not importable", exc_info=True)
        return False
    return True


def _get_engine():
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                from rapidocr import RapidOCR

                _engine = RapidOCR(params={
                    "Global.log_level": "warning",
                    # The detector's default enlarges an image until its short side is
                    # 736 px, which turns the thin regions below into huge ones; the
                    # scoreboard text is large enough as it is: only ever shrink.
                    # Shrinking the 1150 px panel to 860 px for detection keeps every
                    # name and number on the sample screenshots and saves ~0.35 s.
                    "Det.limit_type": "max",
                    "Det.limit_side_len": 860,
                })
    return _engine


def load_image(data: bytes) -> np.ndarray:
    """Decodes to an RGB array in the 1920x1080 reference frame."""
    try:
        image = Image.open(io.BytesIO(data))
        if image.format not in ALLOWED_FORMATS:
            raise ScoreboardError("unsupported_format", "Use a JPEG, PNG or WebP screenshot.")
        width, height = image.size
        if width * height > MAX_PIXELS:
            raise ScoreboardError("too_large", "The screenshot resolution is too large.")
        if width < 1280 or height < 720:
            raise ScoreboardError("too_small", "The screenshot is too small to read. " + ACCEPTED_INPUT_NOTE)
        if abs(width / height - 16 / 9) > 0.05:
            raise ScoreboardError("unsupported_aspect_ratio", "This is not a full-screen 16:9 screenshot. " + ACCEPTED_INPUT_NOTE)
        image = image.convert("RGB").resize((REF_W, REF_H), Image.LANCZOS)
    except ScoreboardError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ScoreboardError("invalid_image", "That file is not a readable image.") from exc
    return np.asarray(image)


def read_lines(rgb: np.ndarray) -> list[Line]:
    """OCR boxes, in full-frame coordinates: the panel's text, plus the account name and
    the Spectate button as one box each when they read as text."""
    x0, y0, x1, y1 = PANEL_REGION
    part = cv2.cvtColor(np.ascontiguousarray(rgb[y0:y1, x0:x1]), cv2.COLOR_RGB2BGR)
    with _infer_lock:
        result = _get_engine()(part, **_FULL_PAGE)
    lines: list[Line] = []
    if result.boxes is not None and result.txts is not None:
        for box, text, conf in zip(result.boxes, result.txts, result.scores):
            xs = [float(p[0]) + x0 for p in box]
            ys = [float(p[1]) + y0 for p in box]
            lines.append(Line(min(xs), min(ys), max(xs), max(ys), str(text), float(conf)))
    for box in (ACCOUNT_NAME_BOX, SPECTATE_BOX):
        hit = recognize(rgb, box)
        if hit and hit[0].strip():
            lines.append(Line(*box, hit[0].strip(), hit[1]))
    return lines


def recognize(rgb: np.ndarray, box: tuple[float, float, float, float]) -> tuple[str, float] | None:
    """Text of one crop, recogniser only (no detection): reads what the full-page pass
    missed or cut short, e.g. the first digit of "9 112"."""
    x0, y0, x1, y1 = (int(round(v)) for v in box)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(rgb.shape[1], x1), min(rgb.shape[0], y1)
    if x1 - x0 < 8 or y1 - y0 < 8:
        return None
    crop = cv2.cvtColor(np.ascontiguousarray(rgb[y0:y1, x0:x1]), cv2.COLOR_RGB2BGR)
    engine = _get_engine()
    try:
        with _infer_lock:
            result = engine(crop, **_CROP_ONLY)
        if not result.txts:
            return None
        text, score = result.txts[0], result.scores[0]
    except Exception:  # noqa: BLE001 - a re-read is a bonus; never fail the analysis over it
        logger.warning("Scoreboard crop re-read failed", exc_info=True)
        return None
    return str(text), float(score)


def status_window(gray: np.ndarray, panel: Panel, name_cy: float) -> np.ndarray | None:
    """The patch holding a row's status icon (escaped / dead / in trial / killer)."""
    x0, x1 = (panel.x(v) for v in layout.STATUS_ICON_X)
    return icon_window(gray, name_cy, x0, x1, panel.d(WIN_HALF_H))


class ImageProbes(Probes):
    """Answers the parser's pixel questions from the screenshot itself."""

    def __init__(self, rgb: np.ndarray, catalog: IconCatalog | Iterable[IconRef] | None = None, *, ocr: bool = True):
        self.rgb = rgb
        self.gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        self.ocr = ocr
        if catalog is not None and not isinstance(catalog, IconCatalog):
            catalog = IconCatalog(catalog)
        self.catalog = catalog if catalog else None

    def locate_panel(self, bodies: list[float], guess: Panel) -> Panel:
        return locate_panel(self.rgb, bodies, guess)

    def status(self, panel: Panel, name_cy: float):
        return classify_icon(status_window(self.gray, panel, name_cy))

    def glow(self, panel: Panel, name_cy: float) -> float | None:
        cy, half = int(name_cy), int(round(panel.d(12)))
        x0, x1 = (int(panel.x(v)) for v in layout.GLOW_X)
        strip = self.gray[max(0, cy - half) : cy + half, max(0, x0) : max(0, x1)]
        return float(np.percentile(strip, 97)) if strip.size else 0.0

    def redness(self, panel: Panel, name_cy: float) -> float | None:
        cy, half = int(name_cy), int(round(panel.d(layout.REDNESS_HALF_H)))
        x0, x1 = (int(panel.x(v)) for v in layout.REDNESS_X)
        patch = self.rgb[max(0, cy - half) : cy + half, max(0, x0) : max(0, x1)].astype(np.float32)
        if not patch.size:
            return None
        return float((patch[:, :, 0] - np.maximum(patch[:, :, 1], patch[:, :, 2])).mean())

    def read_text(self, box):
        return recognize(self.rgb, box) if self.ocr else None

    def loadout(self, panel: Panel, body_cy: float, role: str, character: str | None, *, colours_reliable: bool = True):
        if not self.catalog:
            return None
        return read_loadout(
            self.rgb, panel, body_cy, role, self.catalog, character=character, colours_reliable=colours_reliable
        )


def analyze_scoreboard(
    data: bytes,
    *,
    known_characters: Iterable[str] | None = None,
    expected_player: str | None = None,
    icon_catalog: IconCatalog | Iterable[IconRef] | None = None,
    kills_for_win: int = 3,
) -> dict:
    """Full pipeline: bytes in, report dict out. Raises ScoreboardError for bad input.

    `expected_player` is the logged-in user's name (alias, else login): the report says
    whether the screenshot is theirs. `icon_catalog` lists the reference icons for the
    loadout; without it the loadout is not read.
    """
    rgb = load_image(data)
    lines = read_lines(rgb)
    return build_report(
        lines,
        ImageProbes(rgb, icon_catalog),
        known_characters=known_characters,
        expected_player=expected_player,
        kills_for_win=kills_for_win,
    )
