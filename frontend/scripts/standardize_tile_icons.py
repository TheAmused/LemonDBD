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

4. Flat gray fill where it should be white (currently just the 1/2/4-player
   silhouettes -- see WHITEN_FLAT_GRAY_FILES). Snapped to pure black/white
   by a luminance midpoint; not applied file-wide since some art (the lemon
   emblem's stippled shading) uses grayscale on purpose.

5. Stray background specks (leftover scan grain, disconnected from the
   actual artwork) -- dropped unless a connected blob is large enough to
   plausibly be real content (see DESPECKLE_MIN_KEEP_AREA).

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

# The 1/2/4-player silhouettes' stroke color came out of background removal
# as flat mid-gray (~200/255) instead of white, unlike every other icon's
# pure white fill. These are flat two-tone line art (no deliberate grayscale
# shading to preserve, unlike e.g. the lemon emblem's stippled texture), so
# it's safe to snap them to pure black/white by a luminance midpoint.
WHITEN_FLAT_GRAY_FILES = {"gauntlet-1-player.webp", "gauntlet-2-players.webp", "gauntlet-4-players.webp"}
WHITEN_LUMA_MIDPOINT = 128

# The 1/2/4-player icons are meant to read as "a person" at a consistent
# height, with width simply growing as more figures line up side by side.
# Scaling them by their longest side (the general bbox-cap rule) instead
# matches the 1-player portrait's height to the group, but the 2/4-player
# icons are wider than tall, so their longest side is width -- leaving their
# actual figure height noticeably shorter. Pin this trio to a shared target
# content height instead.
MATCH_HEIGHT_FILES = {"gauntlet-1-player.webp", "gauntlet-2-players.webp", "gauntlet-4-players.webp"}
MATCH_HEIGHT_FILL = 0.85
# The 2-player composition is proportionally wider than the other two (two
# figures spread side by side vs. one, or four stacked closer together), so
# pinning every icon in the group to MATCH_HEIGHT_FILL can push its width
# past the canvas edge and clip it. Cap the shared height fill so the
# widest file in the group always stays within this fraction of the canvas
# width -- computed dynamically in main() from the actual art, not
# hardcoded, so it stays correct if the source art changes.
MATCH_HEIGHT_WIDTH_CAP = 0.90
# The 4-player cluster's bounding box matches the other two exactly, but
# four thinner, overlapping figures read as visually smaller than one bold
# portrait at the same height (less "ink" per unit area). Nudge it up a bit
# to compensate -- confirmed by eye against the other two, not derived from
# a formula, since this is a perceptual (Gestalt) effect, not a measurable
# geometric one like the bbox-vs-coverage sizing rule above.
PLAYER_COUNT_SCALE_BOOST = {"gauntlet-4-players.webp": 1.15}

# The crossed-swords art already has its own hand-drawn black ink outline
# and is scaled close to the bbox cap (thin shape, tips near the canvas
# edge), so the usual dilated border ring reads as an oversized extra
# outline right at the blade tips instead of a thin defining edge. Skip it
# for this file and rely on the art's own outline.
SKIP_BORDER_FILES = {"gauntlet-original.webp"}

# Stray background specks (leftover grain from the source scan) that never
# connect to the main artwork -- keep only the single largest opaque
# connected component per file and drop the rest.
DESPECKLE_MIN_KEEP_AREA = 800

CANVAS = 800
TARGET_COVERAGE = 0.36
MAX_BBOX_FILL = 0.92

BORDER_PX = 4

FILES = sorted(MODES.glob("*.webp"))


def whiten_flat_gray(img: Image.Image) -> None:
    r, g, b, a = img.split()
    gray = Image.merge("RGB", (r, g, b)).convert("L")
    bw = gray.point(lambda v: 255 if v >= WHITEN_LUMA_MIDPOINT else 0)
    white = Image.new("RGBA", img.size, (255, 255, 255, 255))
    black = Image.new("RGBA", img.size, (0, 0, 0, 255))
    quantized = Image.composite(white, black, bw)
    quantized.putalpha(a)
    img.paste(quantized, (0, 0))


def despeckle_keep_largest(img: Image.Image) -> None:
    w, h = img.size
    alpha = img.split()[-1]
    alpha_px = alpha.load()
    px = img.load()
    visited = bytearray(w * h)
    components: list[list[tuple[int, int]]] = []

    def is_opaque(x: int, y: int) -> bool:
        return alpha_px[x, y] > 10

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if visited[idx] or not is_opaque(x, y):
                visited[idx] = 1
                continue
            stack = [(x, y)]
            visited[idx] = 1
            component: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx]:
                            visited[nidx] = 1
                            if is_opaque(nx, ny):
                                stack.append((nx, ny))
            components.append(component)

    if not components:
        return
    largest = max(components, key=len)
    for component in components:
        if component is largest or len(component) >= DESPECKLE_MIN_KEEP_AREA:
            continue
        for cx, cy in component:
            px[cx, cy] = (0, 0, 0, 0)


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


def rescale_to_canvas(img: Image.Image, name: str, match_height_fill: float) -> Image.Image:
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    content = img.crop(bbox) if bbox else img

    if name in MATCH_HEIGHT_FILES:
        boost = PLAYER_COUNT_SCALE_BOOST.get(name, 1.0)
        scale = (CANVAS * match_height_fill * boost) / content.height
    else:
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


def prepare(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    if path.name in WHITEN_FLAT_GRAY_FILES:
        whiten_flat_gray(img)
    despeckle_keep_largest(img)
    fill_small_enclosed_holes(img)
    return img


def compute_match_height_fill(prepared: dict[str, Image.Image]) -> float:
    fill = MATCH_HEIGHT_FILL
    for name in MATCH_HEIGHT_FILES:
        img = prepared[name]
        bbox = img.split()[-1].getbbox()
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        boost = PLAYER_COUNT_SCALE_BOOST.get(name, 1.0)
        max_fill_for_width = (MATCH_HEIGHT_WIDTH_CAP * h / w) / boost
        fill = min(fill, max_fill_for_width)
    return fill


def process(path: Path, img: Image.Image, match_height_fill: float) -> None:
    img = rescale_to_canvas(img, path.name, match_height_fill)
    if path.name not in SKIP_BORDER_FILES:
        img = add_border(img)
    img.save(path, format="WEBP", quality=92, method=6)
    print(f"processed {path.name}")


def main() -> None:
    prepared = {f.name: prepare(f) for f in FILES}
    match_height_fill = compute_match_height_fill(prepared)
    print(f"match_height_fill={match_height_fill:.3f}")
    by_name = {f.name: f for f in FILES}
    for name, img in prepared.items():
        process(by_name[name], img, match_height_fill)


if __name__ == "__main__":
    main()
