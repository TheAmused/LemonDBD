# backend/app/services/scoreboard_ocr/__init__.py
"""Reads a Dead by Daylight end-of-match scoreboard screenshot, in memory.

The image is decoded from bytes, analysed and dropped: nothing is written to disk
or the database. OCR is PaddleOCR's detector/recogniser run through ONNX Runtime
(`rapidocr-onnxruntime`, models bundled in the wheel).
"""
from __future__ import annotations

import io
import threading
from typing import Iterable

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.services.scoreboard_ocr.icons import classify_icon, icon_window
from app.services.scoreboard_ocr.parse import Line, build_report

REF_W, REF_H = 1920, 1080
MAX_PIXELS = 36_000_000  # 8K; anything larger is refused before decoding
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

_engine = None
_engine_lock = threading.Lock()  # guards creating the engine
_infer_lock = threading.Lock()   # one ONNX session: one inference at a time


class ScoreboardError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def engine_available() -> bool:
    try:
        import rapidocr_onnxruntime  # noqa: F401
    except Exception:  # pragma: no cover - depends on the install
        return False
    return True


def _get_engine():
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                from rapidocr_onnxruntime import RapidOCR

                _engine = RapidOCR()
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
            raise ScoreboardError("too_small", "The screenshot is too small to read (minimum 1280x720).")
        if abs(width / height - 16 / 9) > 0.05:
            raise ScoreboardError("unsupported_aspect_ratio", "Take the screenshot in 16:9 (full screen game).")
        image = image.convert("RGB").resize((REF_W, REF_H), Image.LANCZOS)
    except ScoreboardError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ScoreboardError("invalid_image", "That file is not a readable image.") from exc
    return np.asarray(image)


def read_lines(rgb: np.ndarray) -> list[Line]:
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    engine = _get_engine()
    with _infer_lock:
        result, _timing = engine(bgr)
    lines: list[Line] = []
    for box, text, conf in result or []:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        lines.append(Line(min(xs), min(ys), max(xs), max(ys), str(text), float(conf)))
    return lines


def row_probes(gray: np.ndarray):
    """Pixel probes the parser needs: icon class of a row, and how bright its name is."""

    def classify_row(cy: float):
        return classify_icon(icon_window(gray, cy))

    def row_glow(line: Line) -> float:
        cy = int(line.cy)
        strip = gray[max(0, cy - 12) : cy + 12, int(line.x0) + 20 : int(line.x0) + 190]
        return float(np.percentile(strip, 97)) if strip.size else 0.0

    return classify_row, row_glow


def analyze_scoreboard(
    data: bytes,
    *,
    known_characters: Iterable[str] | None = None,
    expected_player: str | None = None,
    expected_role: str | None = None,
    expected_character: str | None = None,
    kills_for_win: int = 3,
) -> dict:
    """Full pipeline: bytes in, report dict out. Raises ScoreboardError for bad input."""
    rgb = load_image(data)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    lines = read_lines(rgb)
    classify_row, row_glow = row_probes(gray)
    return build_report(
        lines,
        classify_row,
        row_glow,
        known_characters=known_characters,
        expected_player=expected_player,
        expected_role=expected_role,
        expected_character=expected_character,
        kills_for_win=kills_for_win,
    )
