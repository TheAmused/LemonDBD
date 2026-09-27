"""Standard tile-icon size normalization, applied uniformly to every mode/
difficulty icon (not a one-off per file).

Bounding-box normalization (match the longest edge to a fixed % of the
frame) fails because a compact solid shape (a single die) and a sparse
composition (flaming dice, crossed swords) can share the same bbox while
covering very different amounts of it -- the compact one reads as bigger.

Pure opaque-pixel-coverage normalization (match % of canvas covered by ink)
fixes that, but blows up thin/elongated shapes (crossed swords) past the
canvas edge, since a thin shape needs a huge scale-up to hit a coverage
target.

The standard: scale for target coverage, but never past a bbox safety cap.
    scale = min(
        sqrt(TARGET_COVERAGE * CANVAS^2 / opaque_pixel_count),
        (CANVAS * MAX_BBOX_FILL) / max(content_w, content_h),
    )
Solid icons (dice, clocks, the lemon emblem) get scaled by the coverage
target -- since they're rarely bbox-starved, this is the branch that fires
for them. Sparse/thin icons (crossed swords, outline silhouettes) hit the
bbox cap instead, so they still read as filling the frame without ever
clipping.

Idempotent: re-cropping to the alpha bbox before measuring means it's safe
to run again on an already-normalized file (it converges, doesn't compound).
Drop any new background-removed WebP into public/images/streaks/modes/ and
re-run this script to bring it in line with the rest.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

CANVAS = 800
TARGET_COVERAGE = 0.36
MAX_BBOX_FILL = 0.92

MODES = Path(__file__).resolve().parents[1] / "public" / "images" / "streaks" / "modes"

JOBS: list[tuple[Path, Path]] = [(f, f) for f in sorted(MODES.glob("*.webp"))]


def opaque_count(alpha: Image.Image) -> int:
    return sum(1 for v in alpha.getdata() if v > 10)


def normalize(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    content = img.crop(bbox) if bbox else img
    area = opaque_count(alpha)

    scale_by_coverage = ((TARGET_COVERAGE * CANVAS * CANVAS) / area) ** 0.5
    scale_by_bbox_cap = (CANVAS * MAX_BBOX_FILL) / max(content.width, content.height)
    scale = min(scale_by_coverage, scale_by_bbox_cap)

    new_size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
    resized = content.resize(new_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    offset = ((CANVAS - resized.width) // 2, (CANVAS - resized.height) // 2)
    canvas.alpha_composite(resized, offset)
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, format="WEBP", quality=92, method=6)
    branch = "coverage" if scale_by_coverage <= scale_by_bbox_cap else "bbox-cap"
    print(f"{dst.name}: coverage={area/(img.width*img.height):.4f} scale={scale:.3f} ({branch})")


def main() -> None:
    for src, dst in JOBS:
        normalize(src, dst)


if __name__ == "__main__":
    main()
