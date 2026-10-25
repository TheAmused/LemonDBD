# backend/scripts/generate_map_images.py
"""Generate tactical DbD map callout images in WebP format with baked-in clock numbers and grid tiles."""
import argparse
import json
import math
import os
import re
import unicodedata
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

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


def render_map_layout_to_image(
    layout: dict[str, Any],
    map_name: str = "",
    realm_name: str = "",
    canvas_size: int = 1200,
) -> Image.Image:
    """Render a top-down tactical map with 8m/16m grid, outline, clock positions, and landmarks."""
    img = Image.new("RGBA", (canvas_size, canvas_size), (13, 17, 23, 255))  # Dark tactical slate
    draw = ImageDraw.Draw(img)

    width_m = layout.get("width_m", 128)
    height_m = layout.get("height_m", 128)
    cell_m = layout.get("cell_m", 8)
    floors = layout.get("floors", [])

    margin = 90  # Padding for 12 clock numbers and headers
    content_w = canvas_size - 2 * margin
    content_h = canvas_size - 2 * margin

    scale = min(content_w / max(width_m, 1), content_h / max(height_m, 1))
    ox = margin + (content_w - width_m * scale) / 2
    oy = margin + (content_h - height_m * scale) / 2

    def to_canvas(x: float, y: float) -> tuple[float, float]:
        return ox + x * scale, oy + y * scale

    # 1. Draw 8m and 16m tactical grid lines
    cols = int(math.ceil(width_m / cell_m))
    rows = int(math.ceil(height_m / cell_m))

    for c in range(cols + 1):
        gx = c * cell_m
        x1, y1 = to_canvas(gx, 0)
        x2, y2 = to_canvas(gx, height_m)
        is_major = (gx % 16 == 0)
        color = (40, 52, 75, 200) if is_major else (26, 34, 48, 160)
        width = 2 if is_major else 1
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)

    for r in range(rows + 1):
        gy = r * cell_m
        x1, y1 = to_canvas(0, gy)
        x2, y2 = to_canvas(width_m, gy)
        is_major = (gy % 16 == 0)
        color = (40, 52, 75, 200) if is_major else (26, 34, 48, 160)
        width = 2 if is_major else 1
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)

    # 2. Render ground floor outline
    ground_floor = floors[0] if floors else {}
    outlines = ground_floor.get("outline", [])
    blocked = ground_floor.get("blocked", [])

    for ring in outlines:
        if len(ring) >= 3:
            pts = [to_canvas(pt[0], pt[1]) for pt in ring]
            draw.polygon(pts, fill=(24, 30, 42, 230), outline=(99, 102, 241, 255), width=3)

    for ring in blocked:
        if len(ring) >= 3:
            pts = [to_canvas(pt[0], pt[1]) for pt in ring]
            draw.polygon(pts, fill=(13, 17, 23, 255), outline=(71, 85, 105, 200), width=2)

    # 3. Render 1-12 clock callouts around the map
    cx_m = width_m / 2.0
    cy_m = height_m / 2.0
    cx_px, cy_px = to_canvas(cx_m, cy_m)

    clock_radius = (min(content_w, content_h) / 2.0) + (margin * 0.55)
    clock_font = _get_font(20, bold=True)

    for hour in range(1, 13):
        angle_deg = (hour * 30.0) - 90.0
        angle_rad = math.radians(angle_deg)
        bx = cx_px + clock_radius * math.cos(angle_rad)
        by = cy_px + clock_radius * math.sin(angle_rad)

        badge_r = 18
        # Outer ring
        draw.ellipse(
            [(bx - badge_r, by - badge_r), (bx + badge_r, by + badge_r)],
            fill=(30, 41, 59, 240),
            outline=(245, 158, 11, 255),  # Amber clock badge
            width=2,
        )
        # Clock number text
        h_str = str(hour)
        bbox = draw.textbbox((0, 0), h_str, font=clock_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((bx - tw / 2, by - th / 2 - 1), h_str, fill=(255, 255, 255, 255), font=clock_font)

    # 4. Render Landmarks
    landmarks = ground_floor.get("landmarks", [])
    lm_font = _get_font(13, bold=True)

    for lm in landmarks:
        lx, ly = to_canvas(lm.get("x", 0), lm.get("y", 0))
        kind = lm.get("kind", "feature")
        code = lm.get("code") or lm.get("label") or "•"

        if kind == "shack":
            fill_color = (239, 68, 68, 240)    # Crimson red
            border_color = (254, 202, 202, 255)
            badge_text = "SHACK"
        elif kind == "main":
            fill_color = (59, 130, 246, 240)   # Blue
            border_color = (191, 219, 254, 255)
            badge_text = "MAIN"
        else:
            fill_color = (16, 185, 129, 220)   # Emerald
            border_color = (167, 243, 208, 255)
            badge_text = code

        bbox = draw.textbbox((0, 0), badge_text, font=lm_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        pad_x, pad_y = 7, 4

        # Draw rounded pin / badge
        x0 = lx - tw / 2 - pad_x
        y0 = ly - th / 2 - pad_y
        x1 = lx + tw / 2 + pad_x
        y1 = ly + th / 2 + pad_y

        draw.rounded_rectangle([(x0, y0), (x1, y1)], radius=4, fill=fill_color, outline=border_color, width=1)
        draw.text((lx - tw / 2, ly - th / 2 - 1), badge_text, fill=(255, 255, 255, 255), font=lm_font)

    # 5. Header / Title bar
    if map_name:
        title_font = _get_font(22, bold=True)
        sub_font = _get_font(14, bold=False)
        draw.text((margin, 24), map_name.upper(), fill=(241, 245, 249, 255), font=title_font)
        if realm_name:
            draw.text((margin, 52), realm_name, fill=(148, 163, 184, 255), font=sub_font)

    # 6. Dimensions and Legend at bottom
    dim_text = f"{int(width_m)}m × {int(height_m)}m  •  8m grid  •  12-Clock Callouts"
    dim_font = _get_font(12, bold=False)
    draw.text((margin, canvas_size - 40), dim_text, fill=(100, 116, 139, 255), font=dim_font)

    return img.convert("RGB")


def generate_all_map_images() -> None:
    """Generate WebP images for all LemonDBD maps and update lemondbd.json."""
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
        if not layout:
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
            canvas_size=1200,
        )
        img.save(out_file, format="WEBP", quality=90)

        map_item["callout_image_local_path"] = rel_path
        generated_count += 1

    with open(MAPS_FILE, "w", encoding="utf-8") as f:
        json.dump(maps_data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Successfully generated {generated_count} WebP map images and updated {MAPS_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate DbD tactical map callout images in WebP format.")
    parser.add_argument("--all", action="store_true", help="Generate all maps")
    args = parser.parse_args()
    generate_all_map_images()
