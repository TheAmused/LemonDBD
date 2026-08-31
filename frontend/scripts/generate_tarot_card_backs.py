#!/usr/bin/env python3
# frontend/scripts/generate_tarot_card_backs.py
"""
One-off local dev tool: generates placeholder tarot card-back images for the
Perk Randomizer's Tarot Deck mode. Each image is a colored, framed card with
the card type's name on it -- a stand-in until real artwork replaces them.

The frontend reads these by convention from /images/tarot/<slug>.png; falling
back to a text-only render (no image needed) if a file is ever missing, so
this script is safe to re-run, extend, or skip individual cards.

Run: py frontend/scripts/generate_tarot_card_backs.py
Requires: Pillow (already installed in this environment).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "images" / "tarot"
CARD_SIZE = (480, 720)  # 2:3 portrait, matches the classic tarot card ratio
BORDER_MARGIN = 24
INNER_BORDER_MARGIN = 36

# (slug, display name, background top color, background bottom color, accent/border color)
CARDS: list[tuple[str, str, tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]] = [
    ("the-hex", "The Hex", (58, 12, 74), (20, 4, 28), (168, 85, 247)),
    ("the-boon", "The Boon", (84, 62, 8), (36, 26, 4), (245, 197, 66)),
    ("the-sacrifice", "The Sacrifice", (74, 8, 14), (24, 2, 4), (225, 60, 70)),
    ("the-exhaustion", "The Exhaustion", (80, 48, 8), (30, 18, 2), (245, 158, 11)),
    ("the-obsession", "The Obsession", (74, 8, 46), (26, 2, 16), (236, 72, 153)),
    ("the-watcher", "The Watcher", (6, 58, 66), (2, 20, 24), (34, 211, 238)),
    ("the-machinist", "The Machinist", (26, 38, 54), (10, 14, 22), (100, 140, 180)),
    ("the-caregiver", "The Caregiver", (6, 62, 40), (2, 22, 14), (16, 185, 129)),
    ("the-chase", "The Chase", (82, 40, 6), (32, 14, 2), (251, 146, 60)),
    ("the-shadow", "The Shadow", (18, 20, 26), (6, 7, 10), (100, 110, 130)),
    ("the-entity", "The Entity", (40, 4, 10), (6, 2, 4), (190, 30, 40)),
]

SUBTITLE = "LEMONDBD TAROT"


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = (
        ["arialbd.ttf", "seguisb.ttf", "arial.ttf"]
        if bold
        else ["arial.ttf", "segoeui.ttf"]
    )
    fonts_dir = Path(r"C:\Windows\Fonts")
    for name in candidates:
        path = fonts_dir / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def _vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    gradient = Image.new("RGB", size, top)
    draw = ImageDraw.Draw(gradient)
    for y in range(height):
        t = y / max(1, height - 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return gradient


def _draw_wrapped_title(draw: ImageDraw.ImageDraw, text: str, box: tuple[int, int, int, int], color: tuple[int, int, int]) -> None:
    x0, y0, x1, y1 = box
    box_width = x1 - x0

    size = 64
    font = _load_font(size, bold=True)
    words = text.split()
    lines = [words[0]] if words else [text]
    for word in words[1:]:
        candidate = f"{lines[-1]} {word}"
        if draw.textlength(candidate, font=font) <= box_width:
            lines[-1] = candidate
        else:
            lines.append(word)

    line_height = size * 1.15
    total_height = line_height * len(lines)
    start_y = y0 + ((y1 - y0) - total_height) / 2

    for i, line in enumerate(lines):
        line_width = draw.textlength(line, font=font)
        line_x = x0 + (box_width - line_width) / 2
        line_y = start_y + i * line_height
        draw.text((line_x, line_y), line, font=font, fill=color)


def generate_card(slug: str, name: str, top: tuple[int, int, int], bottom: tuple[int, int, int], accent: tuple[int, int, int]) -> Path:
    img = _vertical_gradient(CARD_SIZE, top, bottom).convert("RGB")
    draw = ImageDraw.Draw(img)
    width, height = CARD_SIZE

    # Outer + inner frame, a simple nod to a tarot card's traditional border.
    draw.rectangle(
        [BORDER_MARGIN, BORDER_MARGIN, width - BORDER_MARGIN, height - BORDER_MARGIN],
        outline=accent,
        width=3,
    )
    draw.rectangle(
        [INNER_BORDER_MARGIN, INNER_BORDER_MARGIN, width - INNER_BORDER_MARGIN, height - INNER_BORDER_MARGIN],
        outline=accent,
        width=1,
    )

    # A simple diamond glyph as a placeholder emblem -- easy to swap for real
    # per-type iconography later.
    cx, cy = width / 2, height * 0.32
    glyph_r = 34
    draw.polygon(
        [(cx, cy - glyph_r), (cx + glyph_r, cy), (cx, cy + glyph_r), (cx - glyph_r, cy)],
        outline=accent,
        width=3,
    )

    _draw_wrapped_title(
        draw,
        name.upper(),
        box=(INNER_BORDER_MARGIN + 24, height * 0.42, width - INNER_BORDER_MARGIN - 24, height * 0.68),
        color=(245, 245, 245),
    )

    subtitle_font = _load_font(20)
    subtitle_width = draw.textlength(SUBTITLE, font=subtitle_font)
    draw.text(
        ((width - subtitle_width) / 2, height - INNER_BORDER_MARGIN - 34),
        SUBTITLE,
        font=subtitle_font,
        fill=accent,
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"{slug}.png"
    img.save(out_path)
    return out_path


def main() -> None:
    print(f"Generating {len(CARDS)} tarot card-back placeholders -> {OUTPUT_DIR}")
    for slug, name, top, bottom, accent in CARDS:
        path = generate_card(slug, name, top, bottom, accent)
        print(f"  wrote {path.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print("Done. Replace any of these PNGs with real artwork whenever you like --")
    print("the frontend falls back to a text-only render if a file is missing.")


if __name__ == "__main__":
    main()
