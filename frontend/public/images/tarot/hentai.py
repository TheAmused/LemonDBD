# frontend/public/images/tarot/hentai.py
"""
LemonDBD - Dead by Daylight Procedural Gothic Tarot Card Generator
Renders ultra-detailed 480x720 Tarot cards with 3x supersampling (1440x2160)
and anti-aliased occult vector illustrations, ambient fog, and gothic frames.

Requires: pip install Pillow
"""

import math
import os
import random
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

# ==============================================================================
# CONFIGURATION & PALETTES
# ==============================================================================

TARGET_W, TARGET_H = 480, 720
SCALE = 3  # Supersampling scale factor
WIDTH, HEIGHT = TARGET_W * SCALE, TARGET_H * SCALE

OUTPUT_DIR = r"C:\Users\bezie\Desktop\proje\LemonDBD\frontend\public\images\tarot"
if not os.path.exists(OUTPUT_DIR):
    OUTPUT_DIR = "."  # Fallback to local directory if path not found

CARDS = [
    {
        "id": "the-boon",
        "numeral": "I",
        "title": "THE BOON",
        "bg_center": (10, 42, 58),
        "bg_edge": (3, 12, 18),
        "accent": (65, 215, 250),
        "gold": (212, 175, 55),
        "type": "boon",
    },
    {
        "id": "the-caregiver",
        "numeral": "II",
        "title": "THE CAREGIVER",
        "bg_center": (8, 45, 32),
        "bg_edge": (2, 16, 10),
        "accent": (75, 240, 165),
        "gold": (205, 180, 75),
        "type": "caregiver",
    },
    {
        "id": "the-chase",
        "numeral": "III",
        "title": "THE CHASE",
        "bg_center": (55, 25, 8),
        "bg_edge": (20, 7, 2),
        "accent": (255, 130, 35),
        "gold": (230, 165, 45),
        "type": "chase",
    },
    {
        "id": "the-entity",
        "numeral": "0",
        "title": "THE ENTITY",
        "bg_center": (42, 6, 12),
        "bg_edge": (10, 1, 3),
        "accent": (255, 40, 55),
        "gold": (220, 70, 70),
        "type": "entity",
    },
    {
        "id": "the-exhaustion",
        "numeral": "IV",
        "title": "THE EXHAUSTION",
        "bg_center": (48, 30, 8),
        "bg_edge": (16, 9, 2),
        "accent": (255, 185, 45),
        "gold": (210, 150, 40),
        "type": "exhaustion",
    },
    {
        "id": "the-hex",
        "numeral": "V",
        "title": "THE HEX",
        "bg_center": (38, 10, 52),
        "bg_edge": (12, 2, 18),
        "accent": (215, 65, 255),
        "gold": (195, 120, 230),
        "type": "hex",
    },
    {
        "id": "the-machinist",
        "numeral": "VI",
        "title": "THE MACHINIST",
        "bg_center": (14, 30, 48),
        "bg_edge": (4, 10, 18),
        "accent": (90, 200, 245),
        "gold": (190, 180, 140),
        "type": "machinist",
    },
    {
        "id": "the-obsession",
        "numeral": "VII",
        "title": "THE OBSESSION",
        "bg_center": (46, 8, 35),
        "bg_edge": (15, 2, 12),
        "accent": (255, 60, 170),
        "gold": (230, 140, 180),
        "type": "obsession",
    },
    {
        "id": "the-sacrifice",
        "numeral": "VIII",
        "title": "THE SACRIFICE",
        "bg_center": (48, 8, 8),
        "bg_edge": (14, 2, 2),
        "accent": (255, 50, 50),
        "gold": (205, 140, 60),
        "type": "sacrifice",
    },
    {
        "id": "the-shadow",
        "numeral": "IX",
        "title": "THE SHADOW",
        "bg_center": (22, 24, 30),
        "bg_edge": (6, 7, 10),
        "accent": (185, 205, 225),
        "gold": (150, 160, 175),
        "type": "shadow",
    },
    {
        "id": "the-watcher",
        "numeral": "X",
        "title": "THE WATCHER",
        "bg_center": (15, 25, 48),
        "bg_edge": (4, 8, 18),
        "accent": (110, 225, 255),
        "gold": (210, 185, 90),
        "type": "watcher",
    },
]

# ==============================================================================
# DRAWING UTILITIES & GOTHIC PROCEDURAL SHAPES
# ==============================================================================


def get_fonts():
    """Attempt loading high quality serif system fonts, falling back gracefully."""
    font_paths = [
        "georgia.ttf",
        "times.ttf",
        "Cinzel-Regular.ttf",
        "Cinzel-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
    ]
    title_font = None
    sub_font = None
    num_font = None

    for p in font_paths:
        try:
            title_font = ImageFont.truetype(p, int(42 * SCALE))
            sub_font = ImageFont.truetype(p, int(15 * SCALE))
            num_font = ImageFont.truetype(p, int(22 * SCALE))
            break
        except Exception:
            continue

    if not title_font:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        num_font = ImageFont.load_default()

    return title_font, sub_font, num_font


def create_radial_gradient(w, h, inner_c, outer_c, center_y_ratio=0.45):
    """Generate dark atmospheric radial background."""
    img = Image.new("RGBA", (w, h), outer_c + (255,))
    cx, cy = w / 2.0, h * center_y_ratio
    max_radius = math.hypot(w / 2.0, h / 2.0) * 1.05

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    steps = 90
    for i in range(steps, 0, -1):
        r = max_radius * (i / steps)
        t = i / steps
        # Hermite smooth interpolation
        t_smooth = t * t * (3 - 2 * t)
        color = tuple(
            int(inner_c[j] * (1 - t_smooth) + outer_c[j] * t_smooth)
            for j in range(3)
        )
        alpha = int(255 * (1.0 - t_smooth * 0.8))
        draw.ellipse(
            [cx - r, cy - r * 1.1, cx + r, cy + r * 1.1],
            fill=color + (alpha,),
        )

    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=15 * SCALE))
    img = Image.alpha_composite(img, overlay)
    return img


def add_fog_and_grain(base_img, accent_color, intensity=0.15):
    """Layer dark noise and foggy mist particles."""
    fog = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    fog_draw = ImageDraw.Draw(fog)
    random.seed(42)

    # Ambient particle dust
    for _ in range(350):
        px = random.randint(0, WIDTH)
        py = random.randint(0, HEIGHT)
        pr = random.randint(2 * SCALE, 7 * SCALE)
        p_alpha = random.randint(15, 65)
        fog_draw.ellipse(
            [px - pr, py - pr, px + pr, py + pr],
            fill=accent_color + (p_alpha,),
        )

    fog = fog.filter(ImageFilter.GaussianBlur(radius=8 * SCALE))
    return Image.alpha_composite(base_img, fog)


def draw_diamond(draw, cx, cy, radius, outline, fill=None, width=1):
    points = [
        (cx, cy - radius),
        (cx + radius, cy),
        (cx, cy + radius),
        (cx - radius, cy),
    ]
    draw.polygon(points, outline=outline, fill=fill, width=width)


def draw_gothic_frame(draw, w, h, gold, accent):
    """Draw layered tarot borders, runes, and corner flourishes."""
    margin_outer = int(24 * SCALE)
    margin_inner = int(34 * SCALE)
    margin_hairline = int(40 * SCALE)

    # Outer gold border
    draw.rectangle(
        [margin_outer, margin_outer, w - margin_outer, h - margin_outer],
        outline=gold + (240,),
        width=int(2.5 * SCALE),
    )

    # Inner decorative border
    draw.rectangle(
        [margin_inner, margin_inner, w - margin_inner, h - margin_inner],
        outline=accent + (160,),
        width=int(1.2 * SCALE),
    )

    # Hairline frame
    draw.rectangle(
        [margin_hairline, margin_hairline, w - margin_hairline, h - margin_hairline],
        outline=gold + (100,),
        width=int(0.8 * SCALE),
    )

    # Corner diamond filigrees
    corner_inset = margin_inner + int(12 * SCALE)
    corners = [
        (corner_inset, corner_inset),
        (w - corner_inset, corner_inset),
        (corner_inset, h - corner_inset),
        (w - corner_inset, h - corner_inset),
    ]

    for cx, cy in corners:
        draw_diamond(draw, cx, cy, int(7 * SCALE), outline=gold + (255,), width=int(1.5 * SCALE))
        draw_diamond(draw, cx, cy, int(3 * SCALE), outline=None, fill=accent + (220,))

    # Dead by Daylight 4-tally slash marks at top/bottom centers
    tally_y_top = margin_outer + int(5 * SCALE)
    for k in range(4):
        x = w / 2 - int(12 * SCALE) + k * int(7 * SCALE)
        draw.line(
            [(x, tally_y_top), (x - int(2 * SCALE), tally_y_top + int(8 * SCALE))],
            fill=gold + (200,),
            width=int(1.5 * SCALE),
        )
    # Fifth strike across
    draw.line(
        [
            (w / 2 - int(15 * SCALE), tally_y_top + int(6 * SCALE)),
            (w / 2 + int(13 * SCALE), tally_y_top + int(2 * SCALE)),
        ],
        fill=accent + (220,),
        width=int(1.5 * SCALE),
    )


# ==============================================================================
# PROCEDURAL EMBLEM GENERATORS (THEMATIC ARTWORK)
# ==============================================================================


def draw_entity_claws(draw, cx, cy, accent, gold):
    """The Entity: Monolithic multi-jointed spider claws reaching across a crimson vortex."""
    # Central Void Eye
    for r in range(int(95 * SCALE), int(20 * SCALE), -int(10 * SCALE)):
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=accent + (int(255 * (1 - r / (100 * SCALE))),),
            width=int(2 * SCALE),
        )

    # Organic curved talons
    angles = [-145, -115, -65, -35, 35, 65, 115, 145]
    for deg in angles:
        rad = math.radians(deg)
        pts = []
        seg_count = 14
        length = 190 * SCALE
        curv = 0.4 if deg < 0 else -0.4

        for s in range(seg_count):
            t = s / seg_count
            dist = length * t
            wobble = math.sin(t * math.pi) * 35 * SCALE * curv
            px = cx + math.cos(rad) * dist + math.cos(rad + math.pi / 2) * wobble
            py = cy + math.sin(rad) * dist + math.sin(rad + math.pi / 2) * wobble
            pts.append((px, py))

        # Draw segmented claw
        for k in range(len(pts) - 1):
            w = max(1, int((1.0 - k / len(pts)) * 10 * SCALE))
            draw.line([pts[k], pts[k + 1]], fill=accent + (230,), width=w)
            if k % 3 == 0:
                draw_diamond(
                    draw, pts[k][0], pts[k][1], int(4 * SCALE), outline=gold + (255,), fill=accent + (255,)
                )

    draw_diamond(draw, cx, cy, int(22 * SCALE), outline=gold + (255,), fill=(20, 2, 5, 240), width=int(2 * SCALE))
    draw_diamond(draw, cx, cy, int(10 * SCALE), outline=None, fill=accent + (255,))


def draw_sacrifice_hook(draw, cx, cy, accent, gold):
    """The Sacrifice: Iron meat hook suspended by heavy chains with blood-well aura."""
    # Halo rings
    for r, a in [(120, 40), (95, 90), (70, 160)]:
        draw.ellipse(
            [cx - r * SCALE, cy - r * SCALE, cx + r * SCALE, cy + r * SCALE],
            outline=accent + (a,),
            width=int(1.5 * SCALE),
        )

    # Chain links from ceiling
    top_y = cy - int(190 * SCALE)
    chain_bottom_y = cy - int(30 * SCALE)
    y = top_y
    while y < chain_bottom_y:
        draw.ellipse(
            [cx - int(7 * SCALE), y, cx + int(7 * SCALE), y + int(18 * SCALE)],
            outline=gold + (220,),
            width=int(2.5 * SCALE),
        )
        y += int(14 * SCALE)

    # The Heavy Curved Hook
    hook_top = chain_bottom_y
    pts = []
    # Stem
    for sy in range(int(hook_top), int(cy + 40 * SCALE), int(4 * SCALE)):
        pts.append((cx, sy))
    # Curve
    for a in range(0, 220, 10):
        rad = math.radians(a)
        hx = cx - math.sin(rad) * (50 * SCALE)
        hy = cy + (40 * SCALE) + (1 - math.cos(rad)) * (45 * SCALE)
        pts.append((hx, hy))

    # Draw hook spine
    for i in range(len(pts) - 1):
        w = max(int(2 * SCALE), int((1.0 - (i / len(pts)) * 0.5) * 8 * SCALE))
        draw.line([pts[i], pts[i + 1]], fill=gold + (255,), width=w)

    # Hook Barb tip
    tip_x, tip_y = pts[-1]
    draw.polygon(
        [
            (tip_x, tip_y),
            (tip_x + int(12 * SCALE), tip_y + int(8 * SCALE)),
            (tip_x + int(4 * SCALE), tip_y - int(15 * SCALE)),
        ],
        fill=accent + (255,),
    )

    # Blood drip droplets
    for dy, drop_r in [(75, 4), (110, 6), (145, 3)]:
        draw.ellipse(
            [
                cx - int(drop_r * SCALE),
                cy + int(dy * SCALE),
                cx + int(drop_r * SCALE),
                cy + int((dy + drop_r * 2) * SCALE),
            ],
            fill=accent + (240,),
        )


def draw_totem_boon_hex(draw, cx, cy, accent, gold, is_boon=True):
    """Boon/Hex: Occult Bone Totem with woven branches, skulls, and blazing runic circles."""
    # Outer mystic circle with celestial markers
    radius = int(115 * SCALE)
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        outline=gold + (140,),
        width=int(2 * SCALE),
    )
    for deg in range(0, 360, 30):
        rad = math.radians(deg)
        mx = cx + math.cos(rad) * radius
        my = cy + math.sin(rad) * radius
        draw_diamond(draw, mx, my, int(4 * SCALE), outline=accent + (220,), fill=gold + (200,))

    # Crossed wooden sticks / bones
    b_len = int(130 * SCALE)
    for angle in [-35, 35]:
        rad = math.radians(angle)
        dx, dy = math.cos(rad) * b_len, math.sin(rad) * b_len
        draw.line(
            [(cx - dx, cy - dy), (cx + dx, cy + dy)],
            fill=(180, 160, 130, 240),
            width=int(8 * SCALE),
        )
        draw.line(
            [(cx - dx, cy - dy), (cx + dx, cy + dy)],
            fill=gold + (180,),
            width=int(2 * SCALE),
        )

    # Upright spine bone
    draw.line(
        [(cx, cy - int(90 * SCALE)), (cx, cy + int(110 * SCALE))],
        fill=(220, 210, 190, 255),
        width=int(10 * SCALE),
    )

    # Central Skull / Relic
    skull_y = cy - int(15 * SCALE)
    draw.ellipse(
        [
            cx - int(24 * SCALE),
            skull_y - int(24 * SCALE),
            cx + int(24 * SCALE),
            skull_y + int(24 * SCALE),
        ],
        fill=(230, 220, 200, 255),
        outline=gold + (255,),
        width=int(2 * SCALE),
    )
    # Eye sockets
    for eye_x in [cx - int(9 * SCALE), cx + int(9 * SCALE)]:
        draw.ellipse(
            [
                eye_x - int(4 * SCALE),
                skull_y - int(2 * SCALE),
                eye_x + int(4 * SCALE),
                skull_y + int(7 * SCALE),
            ],
            fill=accent + (255,) if is_boon else (15, 2, 5, 255),
        )

    # Surrounding blue flames (Boon) or purple hex sparks
    flame_count = 12
    for i in range(flame_count):
        a = (i / flame_count) * math.pi * 2
        flame_r = int(55 * SCALE + math.sin(i * 3) * 12 * SCALE)
        fx = cx + math.cos(a) * flame_r
        fy = cy + math.sin(a) * flame_r
        draw.ellipse(
            [
                fx - int(5 * SCALE),
                fy - int(5 * SCALE),
                fx + int(5 * SCALE),
                fy + int(5 * SCALE),
            ],
            fill=accent + (200,),
        )


def draw_watcher_eye(draw, cx, cy, accent, gold):
    """The Watcher: All-seeing occult eye with radiant sight-beams and celestial iris."""
    # Radiant rays
    for deg in range(0, 360, 15):
        rad = math.radians(deg)
        r1 = 70 * SCALE
        r2 = 125 * SCALE if deg % 30 == 0 else 105 * SCALE
        draw.line(
            [
                (cx + math.cos(rad) * r1, cy + math.sin(rad) * r1),
                (cx + math.cos(rad) * r2, cy + math.sin(rad) * r2),
            ],
            fill=accent + (160,),
            width=int(1.5 * SCALE),
        )

    # Eye almond shape
    w_eye, h_eye = int(90 * SCALE), int(48 * SCALE)
    top_lid = [
        (cx - w_eye, cy),
        (cx - w_eye * 0.5, cy - h_eye),
        (cx + w_eye * 0.5, cy - h_eye),
        (cx + w_eye, cy),
    ]
    bot_lid = [
        (cx + w_eye, cy),
        (cx + w_eye * 0.5, cy + h_eye),
        (cx - w_eye * 0.5, cy + h_eye),
        (cx - w_eye, cy),
    ]

    draw.polygon(top_lid + bot_lid, outline=gold + (255,), fill=(10, 18, 30, 240), width=int(3 * SCALE))

    # Iris & Pupil
    draw.ellipse(
        [
            cx - int(32 * SCALE),
            cy - int(32 * SCALE),
            cx + int(32 * SCALE),
            cy + int(32 * SCALE),
        ],
        outline=accent + (255,),
        fill=(15, 45, 70, 255),
        width=int(2 * SCALE),
    )
    draw.ellipse(
        [
            cx - int(14 * SCALE),
            cy - int(14 * SCALE),
            cx + int(14 * SCALE),
            cy + int(14 * SCALE),
        ],
        fill=accent + (255,),
    )
    # Pupil slit
    draw.ellipse(
        [
            cx - int(4 * SCALE),
            cy - int(12 * SCALE),
            cx + int(4 * SCALE),
            cy + int(12 * SCALE),
        ],
        fill=(5, 5, 8, 255),
    )


def draw_machinist_gears(draw, cx, cy, accent, gold):
    """The Machinist: Intricate interlocking mechanical generator gears and spark telemetry."""
    # Outer generator ring
    draw.ellipse(
        [
            cx - int(110 * SCALE),
            cy - int(110 * SCALE),
            cx + int(110 * SCALE),
            cy + int(110 * SCALE),
        ],
        outline=gold + (140,),
        width=int(2 * SCALE),
    )

    def draw_gear(gx, gy, radius, teeth, color):
        draw.ellipse(
            [gx - radius, gy - radius, gx + radius, gy + radius],
            outline=color,
            width=int(3 * SCALE),
        )
        for t in range(teeth):
            rad = (t / teeth) * math.pi * 2
            x1 = gx + math.cos(rad) * (radius - 4 * SCALE)
            y1 = gy + math.sin(rad) * (radius - 4 * SCALE)
            x2 = gx + math.cos(rad) * (radius + 12 * SCALE)
            y2 = gy + math.sin(rad) * (radius + 12 * SCALE)
            draw.line([(x1, y1), (x2, y2)], fill=color, width=int(3.5 * SCALE))
        # Hub
        draw.ellipse(
            [
                gx - radius * 0.3,
                gy - radius * 0.3,
                gx + radius * 0.3,
                gy + radius * 0.3,
            ],
            fill=color,
        )

    draw_gear(cx - int(25 * SCALE), cy - int(20 * SCALE), int(60 * SCALE), 12, gold + (240,))
    draw_gear(cx + int(45 * SCALE), cy + int(35 * SCALE), int(42 * SCALE), 8, accent + (240,))

    # Lightning spark arcs
    spark_pts = [
        (cx - int(90 * SCALE), cy + int(70 * SCALE)),
        (cx - int(50 * SCALE), cy + int(50 * SCALE)),
        (cx - int(65 * SCALE), cy + int(90 * SCALE)),
        (cx - int(20 * SCALE), cy + int(75 * SCALE)),
    ]
    for i in range(len(spark_pts) - 1):
        draw.line([spark_pts[i], spark_pts[i + 1]], fill=accent + (255,), width=int(2.5 * SCALE))


def draw_obsession_emblem(draw, cx, cy, accent, gold):
    """The Obsession: The iconic DbD entity ring with twin predatory surrounding claws."""
    r_core = int(65 * SCALE)
    draw.ellipse(
        [cx - r_core, cy - r_core, cx + r_core, cy + r_core],
        outline=accent + (255,),
        width=int(3 * SCALE),
    )
    draw_diamond(draw, cx, cy, int(35 * SCALE), outline=gold + (255,), fill=accent + (80,), width=int(2 * SCALE))

    # 4 encircling curved crescent claws (the obsession HUD motif)
    for angle_offset in [-55, 55, 125, 235]:
        pts = []
        for i in range(12):
            t = i / 11.0
            rad = math.radians(angle_offset + t * 65)
            r = (85 + math.sin(t * math.pi) * 22) * SCALE
            pts.append((cx + math.cos(rad) * r, cy + math.sin(rad) * r))
        for k in range(len(pts) - 1):
            draw.line([pts[k], pts[k + 1]], fill=accent + (230,), width=int(3.5 * SCALE))
            draw_diamond(
                draw,
                pts[k][0],
                pts[k][1],
                int(3 * SCALE),
                outline=gold + (255,),
                fill=accent + (255,),
            )


def draw_chase_slashes(draw, cx, cy, accent, gold):
    """The Chase: Aggressive triple claw strikes and speed vectors."""
    # Speed geometry diamond
    for d in [105, 80]:
        draw_diamond(draw, cx, cy, int(d * SCALE), outline=gold + (130,), width=int(1.5 * SCALE))

    # Triple Beast Slashes across center
    slash_offsets = [-int(40 * SCALE), 0, int(40 * SCALE)]
    for off in slash_offsets:
        x1, y1 = cx + off - int(70 * SCALE), cy - int(95 * SCALE)
        x2, y2 = cx + off + int(70 * SCALE), cy + int(95 * SCALE)
        # Jagged slash points
        mid_x = (x1 + x2) / 2 + random.randint(-int(8 * SCALE), int(8 * SCALE))
        mid_y = (y1 + y2) / 2
        draw.line([(x1, y1), (mid_x, mid_y)], fill=accent + (255,), width=int(6 * SCALE))
        draw.line([(mid_x, mid_y), (x2, y2)], fill=accent + (255,), width=int(6 * SCALE))

        # Sharp claw taper heads
        draw.polygon(
            [
                (x2, y2),
                (x2 - int(10 * SCALE), y2 - int(25 * SCALE)),
                (x2 + int(8 * SCALE), y2 - int(10 * SCALE)),
            ],
            fill=gold + (255,),
        )


def draw_caregiver_hands(draw, cx, cy, accent, gold):
    """The Caregiver: Sacred lotus/hands cupping a radiant restorative light."""
    # Aura rings
    for r in range(int(100 * SCALE), int(20 * SCALE), -int(20 * SCALE)):
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=accent + (int(180 * (1 - r / (110 * SCALE))),),
            width=int(2 * SCALE),
        )

    # Healing Medical Cross Sigil inside Diamond
    draw_diamond(draw, cx, cy - int(20 * SCALE), int(45 * SCALE), outline=gold + (255,), width=int(2.5 * SCALE))
    cw = int(9 * SCALE)
    ch = int(24 * SCALE)
    cross_y = cy - int(20 * SCALE)
    # Vertical bar
    draw.rectangle([cx - cw, cross_y - ch, cx + cw, cross_y + ch], fill=accent + (255,))
    # Horizontal bar
    draw.rectangle([cx - ch, cross_y - cw, cx + ch, cross_y + cw], fill=accent + (255,))

    # Cupping hands / leaves at base
    leaf_pts_l = [
        (cx - int(70 * SCALE), cy + int(40 * SCALE)),
        (cx - int(30 * SCALE), cy + int(70 * SCALE)),
        (cx, cy + int(45 * SCALE)),
        (cx - int(40 * SCALE), cy + int(20 * SCALE)),
    ]
    leaf_pts_r = [
        (cx + int(70 * SCALE), cy + int(40 * SCALE)),
        (cx + int(30 * SCALE), cy + int(70 * SCALE)),
        (cx, cy + int(45 * SCALE)),
        (cx + int(40 * SCALE), cy + int(20 * SCALE)),
    ]
    draw.polygon(leaf_pts_l, outline=gold + (255,), fill=accent + (160,), width=int(2 * SCALE))
    draw.polygon(leaf_pts_r, outline=gold + (255,), fill=accent + (160,), width=int(2 * SCALE))


def draw_exhaustion_heart(draw, cx, cy, accent, gold):
    """The Exhaustion: Fractured clock/heart split by shattering lightning."""
    # Hourglass / Ring base
    draw.ellipse(
        [
            cx - int(80 * SCALE),
            cy - int(80 * SCALE),
            cx + int(80 * SCALE),
            cy + int(80 * SCALE),
        ],
        outline=gold + (160,),
        width=int(2 * SCALE),
    )

    # Stylized Heart geometry
    pts = []
    for deg in range(0, 360, 5):
        t = math.radians(deg)
        # Heart formula
        hx = 16 * (math.sin(t) ** 3)
        hy = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + hx * 3.8 * SCALE, cy + hy * 3.8 * SCALE - int(10 * SCALE)))

    draw.polygon(pts, outline=gold + (255,), fill=accent + (140,), width=int(3 * SCALE))

    # Jagged lightning bolt crack down middle
    bolt = [
        (cx + int(5 * SCALE), cy - int(65 * SCALE)),
        (cx - int(12 * SCALE), cy - int(20 * SCALE)),
        (cx + int(10 * SCALE), cy - int(10 * SCALE)),
        (cx - int(8 * SCALE), cy + int(35 * SCALE)),
        (cx + int(4 * SCALE), cy + int(60 * SCALE)),
    ]
    for i in range(len(bolt) - 1):
        draw.line([bolt[i], bolt[i + 1]], fill=(255, 255, 255, 255), width=int(3.5 * SCALE))


def draw_shadow_reaper(draw, cx, cy, accent, gold):
    """The Shadow: Faceless hooded phantom cloaked in darkness with piercing silver eyes."""
    # Crescent moon behind
    moon_r = int(75 * SCALE)
    draw.ellipse(
        [cx - moon_r, cy - moon_r - int(20 * SCALE), cx + moon_r, cy + moon_r - int(20 * SCALE)],
        outline=accent + (180,),
        width=int(2.5 * SCALE),
    )

    # Cloaked Hood Silhouette
    hood_pts = [
        (cx, cy - int(75 * SCALE)),  # Peak
        (cx + int(48 * SCALE), cy - int(20 * SCALE)),
        (cx + int(55 * SCALE), cy + int(65 * SCALE)),
        (cx + int(25 * SCALE), cy + int(50 * SCALE)),
        (cx, cy + int(60 * SCALE)),
        (cx - int(25 * SCALE), cy + int(50 * SCALE)),
        (cx - int(55 * SCALE), cy + int(65 * SCALE)),
        (cx - int(48 * SCALE), cy - int(20 * SCALE)),
    ]
    draw.polygon(hood_pts, fill=(8, 10, 14, 255), outline=gold + (220,), width=int(2 * SCALE))

    # Inner Void & Twin Glowing Slit Eyes
    draw.polygon(
        [
            (cx, cy - int(50 * SCALE)),
            (cx + int(26 * SCALE), cy - int(5 * SCALE)),
            (cx, cy + int(20 * SCALE)),
            (cx - int(26 * SCALE), cy - int(5 * SCALE)),
        ],
        fill=(2, 2, 4, 255),
    )

    eye_y = cy - int(12 * SCALE)
    draw.line(
        [(cx - int(18 * SCALE), eye_y), (cx - int(6 * SCALE), eye_y + int(3 * SCALE))],
        fill=accent + (255,),
        width=int(2.5 * SCALE),
    )
    draw.line(
        [(cx + int(18 * SCALE), eye_y), (cx + int(6 * SCALE), eye_y + int(3 * SCALE))],
        fill=accent + (255,),
        width=int(2.5 * SCALE),
    )


# ==============================================================================
# CARD COMPOSITOR & EXPORTER
# ==============================================================================


def generate_tarot_card(card_data):
    """Assemble background, illustration, border, typography, and supersampled export."""
    title_font, sub_font, num_font = get_fonts()

    # 1. Base Gradient Canvas
    img = create_radial_gradient(
        WIDTH,
        HEIGHT,
        card_data["bg_center"],
        card_data["bg_edge"],
    )

    # 2. Add Ambient Fog / Particle Grain
    img = add_fog_and_grain(img, card_data["accent"])

    # 3. Vector Art Layer
    art_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    art_draw = ImageDraw.Draw(art_layer)
    cx, cy = WIDTH // 2, int(HEIGHT * 0.43)
    accent = card_data["accent"]
    gold = card_data["gold"]
    card_type = card_data["type"]

    if card_type == "entity":
        draw_entity_claws(art_draw, cx, cy, accent, gold)
    elif card_type == "sacrifice":
        draw_sacrifice_hook(art_draw, cx, cy, accent, gold)
    elif card_type == "boon":
        draw_totem_boon_hex(art_draw, cx, cy, accent, gold, is_boon=True)
    elif card_type == "hex":
        draw_totem_boon_hex(art_draw, cx, cy, accent, gold, is_boon=False)
    elif card_type == "watcher":
        draw_watcher_eye(art_draw, cx, cy, accent, gold)
    elif card_type == "machinist":
        draw_machinist_gears(art_draw, cx, cy, accent, gold)
    elif card_type == "obsession":
        draw_obsession_emblem(art_draw, cx, cy, accent, gold)
    elif card_type == "chase":
        draw_chase_slashes(art_draw, cx, cy, accent, gold)
    elif card_type == "caregiver":
        draw_caregiver_hands(art_draw, cx, cy, accent, gold)
    elif card_type == "exhaustion":
        draw_exhaustion_heart(art_draw, cx, cy, accent, gold)
    elif card_type == "shadow":
        draw_shadow_reaper(art_draw, cx, cy, accent, gold)

    # Create subtle neon glow underlay from art layer
    glow_layer = art_layer.filter(ImageFilter.GaussianBlur(radius=10 * SCALE))
    img = Image.alpha_composite(img, glow_layer)
    img = Image.alpha_composite(img, art_layer)

    # 4. Draw Gothic Border and Frames
    frame_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    frame_draw = ImageDraw.Draw(frame_layer)
    draw_gothic_frame(frame_draw, WIDTH, HEIGHT, gold, accent)

    # 5. Render Typography (Numeral, Card Title, LemonDBD Tarot)
    # Roman Numeral (Top Center)
    numeral_text = card_data["numeral"]
    frame_draw.text(
        (WIDTH / 2, int(60 * SCALE)),
        numeral_text,
        font=num_font,
        fill=gold + (255,),
        anchor="mm",
    )

    # Card Title (Lower Center)
    title_text = card_data["title"]
    title_y = int(HEIGHT * 0.77)
    # Drop shadow
    frame_draw.text(
        (WIDTH / 2 + int(2 * SCALE), title_y + int(2 * SCALE)),
        title_text,
        font=title_font,
        fill=(0, 0, 0, 240),
        anchor="mm",
    )
    frame_draw.text(
        (WIDTH / 2, title_y),
        title_text,
        font=title_font,
        fill=(255, 255, 255, 255),
        anchor="mm",
    )

    # Subtitle (Bottom Center)
    sub_text = "LEMONDBD TAROT"
    sub_y = int(HEIGHT * 0.89)
    frame_draw.text(
        (WIDTH / 2, sub_y),
        sub_text,
        font=sub_font,
        fill=gold + (210,),
        anchor="mm",
    )

    img = Image.alpha_composite(img, frame_layer)

    # 6. High-Quality Supersampling (Scale down Lanczos: 1440x2160 -> 480x720)
    final_card = img.resize((TARGET_W, TARGET_H), resample=Image.Resampling.LANCZOS)

    # Subtle contrast / sharpness enhancement for crisp borders
    enhancer = ImageEnhance.Sharpness(final_card)
    final_card = enhancer.enhance(1.15)

    # 7. Save WebP Image
    out_path = os.path.join(OUTPUT_DIR, f"{card_data['id']}.webp")
    final_card.save(out_path, format="WEBP", quality=96, method=6)
    print(f"[✓] Generated: {out_path} ({TARGET_W}x{TARGET_H})")


def main():
    print(f"Generating {len(CARDS)} Dead by Daylight Tarot Cards with 3x Supersampling...")
    for card in CARDS:
        generate_tarot_card(card)
    print("All tarot cards successfully generated and rendered!")


if __name__ == "__main__":
    main()
    