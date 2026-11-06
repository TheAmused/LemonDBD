# backend/scripts/generate_map_images.py
"""Generate tactical DbD map callout images in WebP format.

Matches the vector map engine in admin tools (MapLayoutView / mapLayout.ts) 100%:
- Exact clock label positions (raycast to perimeter tiles, 1-12 + MID)
- Clipped 8m solid and 16m dashed game-tile grids
- Visible grey blocked dead-zone cutouts (preserving dumbbell map shapes)
- Bold DbD crimson contour
- Landmark footprints with dashed boundaries and vector glyphs
- 32m scale bar
"""
import argparse
import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SEEDS_DIR = ROOT / "app" / "seeds" / "data" / "content"
MAP_LAYOUTS_FILE = SEEDS_DIR / "map_layouts.json"
MAPS_FILE = SEEDS_DIR / "maps" / "lemondbd.json"
REALMS_FILE = SEEDS_DIR / "realms.json"
OUTPUT_BASE = ROOT / "app" / "static" / "maps" / "callouts" / "lemondbd"


def slugify(text: str) -> str:
    """Normalize and convert text to a clean snake_case slug."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "_", text)


def _get_font(size: int, bold: bool = False) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    """Attempt to load a clean system font or fallback to default."""
    candidates = [
        "segoeuib.ttf" if bold else "segoeui.ttf",
        "arialbd.ttf" if bold else "arial.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def point_in_ring(x: float, y: float, ring: list[list[float]]) -> bool:
    """Even-odd point-in-polygon test. Identical to mapLayout.ts pointInRing."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < ((xj - xi) * (y - yi)) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def point_on_floor(floor: dict[str, Any], x: float, y: float) -> bool:
    """Check if point is playable floor (inside outline, outside blocked)."""
    outline = floor.get("outline", [])
    if not any(point_in_ring(x, y, ring) for ring in outline):
        return False
    if any(point_in_ring(x, y, ring) for ring in floor.get("holes", [])):
        return False
    blocked = floor.get("blocked", [])
    if any(point_in_ring(x, y, ring) for ring in blocked):
        return False
    return True


def room_box(room: dict[str, Any]) -> dict[str, float]:
    """Where a room's name is printed, as a landmark-like box the clock numbers keep clear of."""
    ring = room.get("ring")
    if not ring:  # a name placed on its own, over a zone that is drawn elsewhere
        return {"x": float(room.get("x", 0.0)), "y": float(room.get("y", 0.0)), "w": float(room.get("w", 12.0)), "h": float(room.get("h", 4.0))}
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return {
        "x": float(room.get("x", (min(xs) + max(xs)) / 2.0)),
        "y": float(room.get("y", (min(ys) + max(ys)) / 2.0)),
        "w": min(max(xs) - min(xs), 14.0),
        "h": min(max(ys) - min(ys), 6.0),
    }


def floor_bounds(floor: dict[str, Any]) -> tuple[float, float, float, float]:
    """Compute bounding box for floor outline in metres."""
    pts = [p for ring in floor.get("outline", []) for p in ring]
    if not pts:
        return 0.0, 0.0, 0.0, 0.0
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def has_clearance(floor: dict[str, Any], x: float, y: float, m: float) -> bool:
    """Check clearance around point in 8 directions. Identical to mapLayout.ts."""
    d = m * 0.7071067811865476  # SQRT1_2
    probes = [
        (0.0, 0.0), (m, 0.0), (-m, 0.0), (0.0, m), (0.0, -m),
        (d, d), (d, -d), (-d, d), (-d, -d)
    ]
    return all(point_on_floor(floor, x + px, y + py) for px, py in probes)


def distance_to_landmark(lm: dict[str, Any], x: float, y: float) -> float:
    """Distance from point to landmark footprint or marker. Identical to mapLayout.ts."""
    marker_half_m = 4.5
    hw = marker_half_m
    hh = marker_half_m
    w = lm.get("w")
    h = lm.get("h")
    if w and h:
        angle_deg = lm.get("angle", 0) or 0
        a = math.radians(angle_deg)
        hw = (abs(w * math.cos(a)) + abs(h * math.sin(a))) / 2.0
        hh = (abs(w * math.sin(a)) + abs(h * math.cos(a))) / 2.0
    dx = max(abs(x - float(lm.get("x", 0))) - hw, 0.0)
    dy = max(abs(y - float(lm.get("y", 0))) - hh, 0.0)
    return math.hypot(dx, dy)


def get_clock_labels(floor: dict[str, Any]) -> tuple[tuple[float, float], list[dict[str, Any]], bool]:
    """Calculate 1-12 clock callout positions and MID. Exact port of clockLabels in mapLayout.ts."""
    min_x, min_y, max_x, max_y = floor_bounds(floor)
    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0
    reach = math.hypot(max_x - min_x, max_y - min_y)
    landmarks = list(floor.get("landmarks", [])) + [room_box(r) for r in floor.get("rooms", [])]

    landmark_clearance_m = 4.0
    # Corridors between named rooms are narrow: a number there needs less clear floor around it.
    clock_clearance_m = 2.0 if floor.get("rooms") else 4.0
    clock_inset_m = 7.0
    # Landmarks are only dodged a short way inwards of the edge.
    landmark_search_m = 10.0
    # On a floor with named rooms the numbers would sit on the names: they are printed just outside
    # the outline instead, in the margin of the picture.
    outside_m = 5.0 if bool(floor.get("rooms")) else None
    ray_step_m = 0.5
    sector_offsets = [0, 5, -5, 10, -10, 14, -14]

    def clear_of_landmarks(x: float, y: float) -> bool:
        return all(distance_to_landmark(lm, x, y) >= landmark_clearance_m for lm in landmarks)

    def place(degrees: float) -> tuple[float, float] | None:
        angle = math.radians(degrees)
        dx = math.sin(angle)
        dy = -math.cos(angle)
        last_inside = -1.0
        r = 0.0
        last_in_outline = -1.0
        while r <= reach:
            if point_on_floor(floor, cx + dx * r, cy + dy * r):
                last_inside = r
            if any(point_in_ring(cx + dx * r, cy + dy * r, ring) for ring in floor.get("outline", [])):
                last_in_outline = r
            r += ray_step_m
        if last_inside < 0:
            return None
        if outside_m is not None:
            # Beyond the last point of the outline itself: a blocked room at the edge is no reason to stop short.
            out_r = max(last_in_outline, last_inside) + outside_m
            return (cx + dx * out_r, cy + dy * out_r)

        start = max(0.0, last_inside - clock_inset_m)
        edge_safe = None
        best = None
        stop = max(0.0, start - landmark_search_m)
        r = start
        while r >= stop and best is None:
            x = cx + dx * r
            y = cy + dy * r
            if has_clearance(floor, x, y, clock_clearance_m):
                if edge_safe is None:
                    edge_safe = r
                if clear_of_landmarks(x, y):
                    best = r
            r -= ray_step_m

        r = stop
        while edge_safe is None and r >= 0:
            if has_clearance(floor, cx + dx * r, cy + dy * r, clock_clearance_m):
                edge_safe = r
            r -= ray_step_m

        final_r = best if best is not None else (edge_safe if edge_safe is not None else last_inside)
        return (cx + dx * final_r, cy + dy * final_r)

    labels = []
    for hour in range(1, 13):
        point = None
        for offset in sector_offsets:
            point = place(hour * 30.0 + offset)
            if point is not None:
                break
        if point is not None:
            labels.append({"hour": hour, "x": point[0], "y": point[1]})

    show_mid = has_clearance(floor, cx, cy, clock_clearance_m) and clear_of_landmarks(cx, cy)
    return (cx, cy), labels, show_mid


def draw_dashed_line(
    draw: ImageDraw.ImageDraw,
    p1: tuple[float, float],
    p2: tuple[float, float],
    fill: tuple[int, ...],
    width: int = 1,
    dash_len: float = 8.0,
    gap_len: float = 6.0,
) -> None:
    """Draw a straight dashed line between two points."""
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    dist = math.hypot(dx, dy)
    if dist <= 0:
        return
    ux = dx / dist
    uy = dy / dist
    curr = 0.0
    while curr < dist:
        start_pt = (p1[0] + ux * curr, p1[1] + uy * curr)
        end_len = min(curr + dash_len, dist)
        end_pt = (p1[0] + ux * end_len, p1[1] + uy * end_len)
        draw.line([start_pt, end_pt], fill=fill, width=width)
        curr += dash_len + gap_len


def draw_dashed_polygon(
    draw: ImageDraw.ImageDraw,
    pts: list[tuple[float, float]],
    fill: tuple[int, ...],
    width: int = 2,
    dash_len: float = 8.0,
    gap_len: float = 6.0,
) -> None:
    """Draw a closed polygon with dashed perimeter edges."""
    n = len(pts)
    for i in range(n):
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        draw_dashed_line(draw, p1, p2, fill=fill, width=width, dash_len=dash_len, gap_len=gap_len)


def draw_house_icon(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    color: tuple[int, ...],
    width: int = 2,
) -> None:
    """Draw Lucide Home icon glyph."""
    s = size / 24.0

    def pt(x: float, y: float) -> tuple[float, float]:
        return (cx + (x - 12.0) * s, cy + (y - 12.0) * s)

    pts = [pt(4, 10), pt(12, 3), pt(20, 10), pt(20, 21), pt(4, 21)]
    draw.polygon(pts, outline=color, width=width)
    door_pts = [pt(9, 21), pt(9, 13), pt(15, 13), pt(15, 21)]
    draw.line(door_pts, fill=color, width=width)


def draw_building_icon(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    color: tuple[int, ...],
    width: int = 2,
) -> None:
    """Draw Lucide Building2 icon glyph."""
    s = size / 24.0

    def pt(x: float, y: float) -> tuple[float, float]:
        return (cx + (x - 12.0) * s, cy + (y - 12.0) * s)

    # Center tower
    draw.rectangle([pt(6, 3), pt(18, 22)], outline=color, width=width)
    # Left wing
    draw.rectangle([pt(2, 12), pt(6, 22)], outline=color, width=width)
    # Right wing
    draw.rectangle([pt(18, 9), pt(22, 22)], outline=color, width=width)
    # Windows
    draw.line([pt(10, 7), pt(14, 7)], fill=color, width=width)
    draw.line([pt(10, 11), pt(14, 11)], fill=color, width=width)
    draw.line([pt(10, 15), pt(14, 15)], fill=color, width=width)


FLOOR_ORDER = {"lower": 0, None: 1, "upper": 2}
FLOOR_TITLES = {"lower": "LOWER FLOOR", "upper": "UPPER FLOOR"}
PANEL_GAP_PX = 48


def render_floor_image(
    layout: dict[str, Any],
    floor: dict[str, Any],
    target_width: int = 1200,
    title: str | None = None,
) -> Image.Image:
    """Render one floor of a map layout to a high-fidelity tactical callout panel.

    Matches MapLayoutView:
    - ViewBox: [-PAD_M, -PAD_M] to [width + PAD_M * 2, height + PAD_M * 3]
    - Clipped 8m solid and 16m dashed game tile grids
    - Distinct solid grey blocked cutouts
    - Bold DbD crimson red outline
    - Raycast 1-12 clock callouts and MID
    - Landmark dashed footprints with building and house glyphs
    - 32m scale bar
    """
    PAD_M = 8.0
    SCALE_BAR_M = 32.0
    GAME_TILE_M = 16.0

    width_m = float(layout.get("width_m", 128))
    height_m = float(layout.get("height_m", 128))
    cell_m = float(layout.get("cell_m", 8))
    side_extra_m = 4.0 if any(f.get("rooms") for f in layout.get("floors", [])) else 0.0
    total_w_m = width_m + PAD_M * 2.0 + side_extra_m * 2.0
    # Clock numbers of floors with named rooms are printed outside the outline: leave room above it
    # for the 12 under the floor title. Every floor of the map gets it so the panels stay the same size.
    top_extra_m = 8.0 if any(f.get("rooms") for f in layout.get("floors", [])) else 0.0
    total_h_m = height_m + PAD_M * 3.0 + top_extra_m

    scale = target_width / max(total_w_m, 1.0)
    target_height = int(math.ceil(total_h_m * scale))

    def to_canvas(x: float, y: float) -> tuple[float, float]:
        return (x + PAD_M + side_extra_m) * scale, (y + PAD_M + top_extra_m) * scale

    # Theme colors matching MapLayoutView in dark theme
    BG_PRIMARY = (11, 14, 20, 255)         # Canvas void / background
    BG_ELEVATED = (22, 27, 34, 255)        # Playable floor fill
    STROKE_RED = (239, 68, 68, 255)        # DbD Crimson Red (#ef4444)
    SHACK_FILL = (245, 158, 11, 75)        # Shack footprint tint, the amber of the frontend (#f59e0b)
    SHACK_STROKE = (245, 158, 11, 255)     # Shack dashed outline
    SHACK_ICON = (252, 211, 77, 255)       # Shack house glyph, a lighter amber (#fcd34d)
    BLOCKED_FILL = (56, 65, 82, 255)       # Non-playable blocked dead-space (#384152)
    BLOCKED_STROKE = (100, 116, 139, 255)  # Blocked stroke (#64748b)
    GRID_BORDER = (45, 55, 72, 200)        # 8m sub-grid stroke (#2d3748)
    GRID_TILE = (107, 114, 128, 220)       # 16m game tile dashed stroke (#6b7280)
    TEXT_PRIMARY = (255, 255, 255, 255)    # White bold text for clock numbers
    TEXT_MUTED = (148, 163, 184, 255)      # Slate text for MID and scale bar (#94a3b8)

    # 1. Base canvas
    img = Image.new("RGBA", (target_width, target_height), BG_PRIMARY)

    # 2. Playable Floor Mask
    floor_mask = Image.new("L", (target_width, target_height), 0)
    mask_draw = ImageDraw.Draw(floor_mask)
    for ring in floor.get("outline", []):
        if len(ring) >= 3:
            pts = [to_canvas(pt[0], pt[1]) for pt in ring]
            mask_draw.polygon(pts, fill=255)
    for ring in floor.get("holes", []):
        if len(ring) >= 3:
            mask_draw.polygon([to_canvas(pt[0], pt[1]) for pt in ring], fill=0)

    # 3. Floor Elevated Fill
    floor_layer = Image.new("RGBA", (target_width, target_height), BG_ELEVATED)
    img.paste(floor_layer, (0, 0), floor_mask)

    # 4. Grids strictly clipped to floor mask
    grid_layer = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_layer)

    # 8m solid grid lines
    cols_8 = int(math.ceil(width_m / cell_m))
    rows_8 = int(math.ceil(height_m / cell_m))
    for c in range(cols_8 + 1):
        gx = c * cell_m
        p1 = to_canvas(gx, 0)
        p2 = to_canvas(gx, height_m)
        grid_draw.line([p1, p2], fill=GRID_BORDER, width=max(1, int(round(scale * 0.25))))
    for r in range(rows_8 + 1):
        gy = r * cell_m
        p1 = to_canvas(0, gy)
        p2 = to_canvas(width_m, gy)
        grid_draw.line([p1, p2], fill=GRID_BORDER, width=max(1, int(round(scale * 0.25))))

    # 16m dashed game-tile lines
    cols_16 = int(math.ceil(width_m / GAME_TILE_M))
    rows_16 = int(math.ceil(height_m / GAME_TILE_M))
    dash_px = max(6.0, scale * 1.5)
    gap_px = max(5.0, scale * 1.2)
    dash_w = max(1, int(round(scale * 0.45)))

    for c in range(cols_16 + 1):
        gx = c * GAME_TILE_M
        p1 = to_canvas(gx, 0)
        p2 = to_canvas(gx, height_m)
        draw_dashed_line(grid_draw, p1, p2, fill=GRID_TILE, width=dash_w, dash_len=dash_px, gap_len=gap_px)
    for r in range(rows_16 + 1):
        gy = r * GAME_TILE_M
        p1 = to_canvas(0, gy)
        p2 = to_canvas(width_m, gy)
        draw_dashed_line(grid_draw, p1, p2, fill=GRID_TILE, width=dash_w, dash_len=dash_px, gap_len=gap_px)

    # Lay the grid over the floor (composited, so the floor keeps its fill; a paste would replace it with the
    # layer's transparent pixels and turn the floor, and everything tinted over it, into flat colour).
    grid_layer.putalpha(ImageChops.multiply(grid_layer.getchannel("A"), floor_mask))
    img.alpha_composite(grid_layer)

    # 5. Blocked / Cutout Polygons
    draw = ImageDraw.Draw(img)
    for ring in floor.get("blocked", []):
        if len(ring) >= 3:
            pts = [to_canvas(pt[0], pt[1]) for pt in ring]
            draw.polygon(pts, fill=BLOCKED_FILL, outline=BLOCKED_STROKE, width=max(1, int(round(scale * 0.4))))

    # 6. Bold Crimson Red Floor Outline
    outline_w = max(2, int(round(scale * 1.1)))
    for ring in [*floor.get("outline", []), *floor.get("holes", [])]:
        if len(ring) >= 3:
            pts = [to_canvas(pt[0], pt[1]) for pt in ring]
            draw.polygon(pts, outline=STROKE_RED, width=outline_w)

    # 6b. Rooms: thin outlines with their names, under the landmarks and the clock numbers.
    ROOM_STROKE = (118, 130, 148, 255)
    ROOM_TEXT = (226, 232, 240, 255)
    for room in floor.get("rooms", []):
        ring = room.get("ring") or []
        if len(ring) >= 3:
            draw.polygon([to_canvas(pt[0], pt[1]) for pt in ring], outline=ROOM_STROKE, width=max(1, int(round(scale * 0.25))))
        label = str(room.get("label", ""))
        if not label:
            continue
        box = room_box(room)
        lines = label.split("\n")
        avail_w = max(box["w"], 6.0) * scale * 0.94
        size = max(9, int(round(scale * 2.6)))
        while size > 9:
            font = _get_font(size, bold=True)
            if max(draw.textlength(line, font=font) for line in lines) <= avail_w:
                break
            size -= 1
        font = _get_font(size, bold=True)
        line_h = size * 1.15
        cx_px, cy_px = to_canvas(box["x"], box["y"])
        top = cy_px - line_h * len(lines) / 2.0
        for i, line in enumerate(lines):
            tw = draw.textlength(line, font=font)
            draw.text((cx_px - tw / 2.0, top + i * line_h), line, fill=ROOM_TEXT, font=font)

    # 7. Landmarks (Main Building, Shack, Feature Codes)
    landmarks = floor.get("landmarks", [])
    for lm in landmarks:
        kind = lm.get("kind")
        lx = float(lm.get("x", 0))
        ly = float(lm.get("y", 0))
        w = lm.get("w")
        h = lm.get("h")
        c_pt = to_canvas(lx, ly)

        if w and h:
            fw = float(w)
            fh = float(h)
            angle_deg = float(lm.get("angle", 0) or 0)
            icon_size = min(7.0, min(fw, fh) * 0.7) * scale
            icon_stroke_w = max(2, int(round(scale * 0.2)))

            # Rotated bounding box corners in metres
            rad = math.radians(angle_deg)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)
            hw = fw / 2.0
            hh = fh / 2.0
            corners_m = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
            corners_canvas = [
                to_canvas(lx + dx * cos_a - dy * sin_a, ly + dx * sin_a + dy * cos_a)
                for dx, dy in corners_m
            ]

            tint_layer = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
            tint_draw = ImageDraw.Draw(tint_layer)

            if kind == "main":
                tint_draw.polygon(corners_canvas, fill=(239, 68, 68, 55))
                img.alpha_composite(tint_layer)
                lm_dash = max(6.0, scale * 1.6)
                lm_gap = max(4.0, scale * 1.2)
                draw_dashed_polygon(draw, corners_canvas, fill=(239, 68, 68, 255), width=max(2, int(round(scale * 0.5))), dash_len=lm_dash, gap_len=lm_gap)
                draw_building_icon(draw, c_pt[0], c_pt[1], icon_size, (255, 120, 120, 255), width=icon_stroke_w)
            elif kind == "shack":
                tint_draw.polygon(corners_canvas, fill=SHACK_FILL)
                img.alpha_composite(tint_layer)
                shack_dash = max(4.0, scale * 1.0)
                shack_gap = max(3.0, scale * 0.8)
                draw_dashed_polygon(draw, corners_canvas, fill=SHACK_STROKE, width=max(2, int(round(scale * 0.4))), dash_len=shack_dash, gap_len=shack_gap)
                draw_house_icon(draw, c_pt[0], c_pt[1], icon_size, SHACK_ICON, width=icon_stroke_w)
            else:
                tint_draw.polygon(corners_canvas, fill=(148, 163, 184, 55))
                img.alpha_composite(tint_layer)
                draw_dashed_polygon(draw, corners_canvas, fill=TEXT_MUTED, width=max(1, int(round(scale * 0.4))), dash_len=dash_px, gap_len=gap_px)
                label = lm.get("label", "")
                if label:
                    f_size = max(12, int(round(scale * 3.4)))
                    font = _get_font(f_size, bold=True)
                    bbox = draw.textbbox((0, 0), label, font=font)
                    tw = bbox[2] - bbox[0]
                    th = bbox[3] - bbox[1]
                    draw.text((c_pt[0] - tw / 2, c_pt[1] - th / 2 - 1), label, fill=TEXT_PRIMARY, font=font)
        else:
            # Chip marker without footprint
            label = lm.get("label", "")
            if label:
                f_size = max(11, int(round(scale * 3.2)))
                font = _get_font(f_size, bold=True)
                bbox = draw.textbbox((0, 0), label, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                draw.text((c_pt[0] - tw / 2, c_pt[1] - th / 2 - 1), label, fill=TEXT_PRIMARY, font=font)

    # 8. 12-Clock Callouts & MID
    center, labels, show_mid = get_clock_labels(floor)
    clock_font_size = max(16, int(round(scale * 5.8)))
    clock_font = _get_font(clock_font_size, bold=True)

    for l in labels:
        h_str = str(l["hour"])
        c_x, c_y = to_canvas(l["x"], l["y"])
        bbox = draw.textbbox((0, 0), h_str, font=clock_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((c_x - tw / 2, c_y - th / 2 - 1), h_str, fill=TEXT_PRIMARY, font=clock_font)

    if show_mid:
        mid_font_size = max(11, int(round(scale * 3.6)))
        mid_font = _get_font(mid_font_size, bold=True)
        c_x, c_y = to_canvas(center[0], center[1])
        bbox = draw.textbbox((0, 0), "MID", font=mid_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((c_x - tw / 2, c_y - th / 2 - 1), "MID", fill=TEXT_MUTED, font=mid_font)

    # Floor title in the top margin (only on maps with more than one floor)
    if title:
        title_font = _get_font(max(18, int(round(scale * 4.4))), bold=True)
        bbox = draw.textbbox((0, 0), title, font=title_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(((target_width - tw) / 2, PAD_M * scale * 0.5 - th / 2), title, fill=TEXT_PRIMARY, font=title_font)

    # 9. Scale Bar (Bottom Left: 32m)
    # Below the outline the 5, 6 and 7 are printed on floors with named rooms: the ruler goes lower.
    sb_y_m = height_m + (12.5 if bool(floor.get("rooms")) else PAD_M * 0.9)
    sb_p1 = to_canvas(0, sb_y_m)
    sb_p2 = to_canvas(SCALE_BAR_M, sb_y_m)
    tick_len = scale * 1.2
    sb_w = max(1, int(round(scale * 0.5)))

    # Ruler line: M0 -1.2 V0 H32 V-1.2
    draw.line([(sb_p1[0], sb_p1[1] - tick_len), (sb_p1[0], sb_p1[1])], fill=TEXT_MUTED, width=sb_w)
    draw.line([sb_p1, sb_p2], fill=TEXT_MUTED, width=sb_w)
    draw.line([(sb_p2[0], sb_p2[1] - tick_len), (sb_p2[0], sb_p2[1])], fill=TEXT_MUTED, width=sb_w)

    sb_font_size = max(10, int(round(scale * 3.2)))
    sb_font = _get_font(sb_font_size, bold=False)
    draw.text((sb_p2[0] + scale * 2, sb_p2[1] - tick_len / 2 - 1), f"{int(SCALE_BAR_M)} m", fill=TEXT_MUTED, font=sb_font)

    return img.convert("RGB")


def render_map_layout_to_image(
    layout: dict[str, Any],
    map_name: str = "",
    realm_name: str = "",
    target_width: int = 1200,
) -> Image.Image:
    """Render a map layout to one callout image: every floor, lower floor first, side by side.

    A single-floor map is one panel `target_width` wide. A map with several floors gets one panel per
    floor, each with its own 1-12 clock callouts, landmarks and scale bar (all floors share the map's
    frame, so panels are the same size), a floor title and a divider between them.
    """
    floors = sorted(layout.get("floors") or [{}], key=lambda f: FLOOR_ORDER.get(f.get("label"), 1))
    if len(floors) == 1:
        return render_floor_image(layout, floors[0], target_width)

    panels = [
        render_floor_image(layout, f, target_width, title=FLOOR_TITLES.get(f.get("label"), f"FLOOR {i + 1}"))
        for i, f in enumerate(floors)
    ]
    panel_w, panel_h = panels[0].size
    total_w = panel_w * len(panels) + PANEL_GAP_PX * (len(panels) - 1)
    canvas = Image.new("RGB", (total_w, panel_h), (11, 14, 20))
    draw = ImageDraw.Draw(canvas)
    for i, panel in enumerate(panels):
        x = i * (panel_w + PANEL_GAP_PX)
        canvas.paste(panel, (x, 0))
        if i > 0:
            line_x = x - PANEL_GAP_PX // 2
            draw.line([(line_x, int(panel_h * 0.04)), (line_x, int(panel_h * 0.96))], fill=(107, 114, 128), width=3)
    return canvas


def generate_all_map_images(only_ids: set[int] | None = None) -> None:
    """Generate accurate WebP callout images for all LemonDBD maps (or just `only_ids`)."""
    with open(MAP_LAYOUTS_FILE, encoding="utf-8") as f:
        layouts_data = json.load(f)["map_layouts"]
    layout_by_map_id = {item["map_id"]: item["layout_data"] for item in layouts_data}

    with open(REALMS_FILE, encoding="utf-8") as f:
        realms = {r["id"]: r["name"] for r in json.load(f)["realms"]}

    with open(MAPS_FILE, encoding="utf-8") as f:
        maps_data = json.load(f)

    generated_count = 0
    for map_item in maps_data["maps"]:
        map_id = map_item["id"]
        layout = layout_by_map_id.get(map_id)
        if not layout or (only_ids is not None and map_id not in only_ids):
            continue

        realm_name = realms.get(map_item["realm_id"], "Unknown Realm")
        realm_slug = slugify(realm_name)
        map_slug = slugify(map_item["name"])

        realm_out_dir = OUTPUT_BASE / realm_slug
        realm_out_dir.mkdir(parents=True, exist_ok=True)

        out_file = realm_out_dir / f"{map_slug}.webp"
        rel_path = f"maps/callouts/lemondbd/{realm_slug}/{map_slug}.webp"

        img = render_map_layout_to_image(
            layout,
            map_name=map_item["name"],
            realm_name=realm_name,
            target_width=1200,
        )
        img.save(out_file, format="WEBP", quality=92)

        map_item["callout_image_local_path"] = rel_path
        generated_count += 1
        print(f"[{generated_count}] Generated {rel_path} ({img.size[0]}x{img.size[1]})")

    with open(MAPS_FILE, "w", encoding="utf-8") as f:
        json.dump(maps_data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nSuccessfully generated {generated_count} tactical WebP map images!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate DbD tactical map callout images in WebP format.")
    parser.add_argument("--all", action="store_true", help="Generate all maps")
    parser.add_argument("--ids", type=int, nargs="+", help="Generate only these map ids")
    args = parser.parse_args()
    generate_all_map_images(set(args.ids) if args.ids else None)
