"""Standard treatment for every mode/difficulty tile icon in
public/images/streaks/modes/ -- applied uniformly, not as one-off fixes.

Three problems this solves, in pipeline order:

1. Enclosed transparent "holes" that should be solid black ink.
   The pre-existing watermark-style assets (chaos-streak-watermark.png,
   gauntlet-streak-watermark.png, history-streak-watermark.png -- reused
   here as the chaos-medium / gauntlet-original / history-default tile art)
   are pure white monochrome logos where every dark detail (a dice pip, an
   engraving) is encoded as a transparent cutout, not an actual black
   pixel. That's invisible on the near-black backdrop they were designed
   for, but shows through as muddy dark-red on the app's dark-red tile
   background. Fix: flood-find every transparent connected component that
   does NOT touch the canvas border (fully enclosed by opaque content).
   Small ones (a dice pip) are real dark detail -- fill with solid black.
   Large ones (an outline silhouette's hollow torso) are deliberate
   negative space -- leave transparent.

2. Inconsistent visual size (see git history for the bbox-vs-coverage
   writeup). A compact solid shape (a single die) and a sparse composition
   (flaming dice, crossed swords) can share a bounding box while covering
   very different amounts of it, so bbox-only scaling makes the compact one
   read as bigger. Fix: scale for a target opaque-pixel coverage, capped by
   a bbox safety limit so thin/elongated shapes (crossed swords, outline
   silhouettes) never scale past the canvas edge.
       scale = min(
           sqrt(TARGET_COVERAGE * CANVAS^2 / opaque_pixel_count),
           (CANVAS * MAX_BBOX_FILL) / max(content_w, content_h),
       )

3. No defining edge. Dilate the final silhouette by a few px and fill the
   new ring with solid black behind the art, so every icon reads as a
   clean black-outlined badge, matching the reference perk-icon style.

Idempotent: safe to run again on already-processed files (re-cropping to
the alpha bbox before measuring means it converges, doesn't compound).
Drop any new background-removed WebP into public/images/streaks/modes/ and
re-run this script to bring it in line with the rest.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

MODES = Path(__file__).resolve().parents[1] / "public" / "images" / "streaks" / "modes"

HOLE_ALPHA_THRESH = 40
SMALL_HOLE_MAX_AREA = 10000

CANVAS = 800
TARGET_COVERAGE = 0.36
MAX_BBOX_FILL = 0.92

BORDER_PX = 4

FILES = sorted(MODES.glob("*.webp"))


def fill_small_enclosed_holes(img: Image.Image) -> None:
    w, h = img.size
    alpha = img.split()[-1]
    alpha_px = alpha.load()
    px = img.load()
    visited = bytearray(w * h)

    def is_transparent(x: int, y: int) -> bool:
        return alpha_px[x, y] < HOLE_ALPHA_THRESH

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if visited[idx] or not is_transparent(x, y):
                visited[idx] = 1
                continue
            stack = [(x, y)]
            visited[idx] = 1
            component: list[tuple[int, int]] = []
            touches_border = False
            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                if cx == 0 or cy == 0 or cx == w - 1 or cy == h - 1:
                    touches_border = True
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx]:
                            visited[nidx] = 1
                            if is_transparent(nx, ny):
                                stack.append((nx, ny))
            if not touches_border and len(component) <= SMALL_HOLE_MAX_AREA:
                for cx, cy in component:
                    px[cx, cy] = (0, 0, 0, 255)


def opaque_count(alpha: Image.Image) -> int:
    return sum(1 for v in alpha.getdata() if v > 10)


def rescale_to_canvas(img: Image.Image) -> Image.Image:
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
    return canvas


def add_border(img: Image.Image) -> Image.Image:
    alpha = img.split()[-1]
    solid_mask = alpha.point(lambda v: 255 if v > 10 else 0)
    dilated = solid_mask.filter(ImageFilter.MaxFilter(BORDER_PX * 2 + 1))
    black_ring = Image.new("RGBA", img.size, (0, 0, 0, 255))
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(black_ring, (0, 0), dilated)
    out.alpha_composite(img)
    return out


def process(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    fill_small_enclosed_holes(img)
    img = rescale_to_canvas(img)
    img = add_border(img)
    img.save(path, format="WEBP", quality=92, method=6)
    print(f"processed {path.name}")


def main() -> None:
    for f in FILES:
        process(f)


if __name__ == "__main__":
    main()
