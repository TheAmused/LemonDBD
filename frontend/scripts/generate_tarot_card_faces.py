#!/usr/bin/env python3
# frontend/scripts/generate_tarot_card_faces.py
"""
Generates the *revealed* face of every Tarot Deck card (the side that holds the
perk once a card is flipped) so it matches the illustrated card backs
(public/images/tarot/the-*.webp) instead of being a flat dark rectangle.

Nothing here is hand-tuned per card. For each card the script samples the
existing artwork and derives:
  * hue / saturation  -> a soft, desaturated "lantern glow" behind the perk,
  * ink colour        -> the dusty tan of the card's own title lettering,
  * shadow colour     -> the warm near-black of its title band,
so re-running after the art changes re-skins the faces automatically.

Layers (all procedural, seeded per card -> output is reproducible):
  aged card stock (mottling, fibres, grain) -> central glow -> edge wear and
  vignette -> scratches + dust -> tan double frame, corner brackets, dividers
  and a diamond "window" outline that frames the perk.

Output: public/images/tarot/faces/the-<slug>.webp  (2:3, 600x900)
The service worker already caches everything under /images/ cache-first, and
next.config.ts sets long-lived Cache-Control headers for it.

Run:      python frontend/scripts/generate_tarot_card_faces.py
Options:  --art-dir DIR  --out-dir DIR  --size WxH  --quality N
Requires: Pillow, numpy
"""

from __future__ import annotations

import argparse
import colorsys
import zlib
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ART_DIR = ROOT / "public" / "images" / "tarot"
DEFAULT_OUT_DIR = DEFAULT_ART_DIR / "faces"

# Where the interesting parts of the source art live, as fractions of the card.
ART_REGION = (0.08, 0.06, 0.92, 0.86)  # left, top, right, bottom
TITLE_BAND = (0.10, 0.89, 0.90, 0.97)

# Look-and-feel knobs (every magic number of the render lives here).
STYLE = {
    "ss": 2,  # supersampling for the vector layers
    "stock_lift": 0.40,  # how much of the card hue tints the base stock
    "glow_strength": 0.90,
    "glow_value": 0.50,  # HSV value of the glow centre (kept equal across cards)
    "glow_sat_min": 0.16,
    "glow_sat_max": 0.42,
    "glow_center": (0.5, 0.50),
    "glow_radius": 0.72,  # in card widths
    "mottle_amp": 15.0,
    "grain_sigma": 5.5,
    "fiber_amp": 3.0,
    "vignette": 0.55,
    "edge_wear": 0.55,
    "scratches": 34,
    "specks": 320,
    "desaturate": 0.18,
    "frame_outer": 0.045,  # margins as a fraction of width
    "frame_inner": 0.075,
    "ink_alpha": 0.62,
    "window_scale": 0.66,  # diamond window size in card widths
    "lattice_gap": 54,  # px (at 1x) between the faint damask diamonds
    "lattice_alpha": 0.085,
}


@dataclass
class Palette:
    hue: float
    sat: float
    ink: np.ndarray  # dusty tan of the title lettering
    shadow: np.ndarray  # warm near-black of the title band


def _crop(arr: np.ndarray, box: tuple[float, float, float, float]) -> np.ndarray:
    h, w = arr.shape[:2]
    l, t, r, b = box
    return arr[int(h * t) : int(h * b), int(w * l) : int(w * r)].reshape(-1, 3)


def sample_palette(art_path: Path) -> Palette:
    arr = np.asarray(Image.open(art_path).convert("RGB")).astype(np.float32) / 255.0

    art = _crop(arr, ART_REGION)
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in art[:: max(1, len(art) // 20000)]])
    # area-weighted (by brightness only): the broad scene colour, not a lone
    # saturated accent such as a flame or a glint
    weight = hsv[:, 2]
    mask = (hsv[:, 1] > 0.08) & (hsv[:, 2] > 0.15)
    if mask.sum() < 50:  # near-monochrome art: fall back to a neutral warm hue
        hue, sat = 0.1, 0.12
    else:
        ang = hsv[mask, 0] * 2 * np.pi
        w = weight[mask]
        hue = (np.arctan2((np.sin(ang) * w).sum(), (np.cos(ang) * w).sum()) / (2 * np.pi)) % 1.0
        sat = float(np.average(hsv[mask, 1], weights=w))

    band = _crop(arr, TITLE_BAND)
    lum = band.mean(1)
    ink = band[lum > np.percentile(lum, 97)].mean(0)
    shadow = band[lum < np.percentile(lum, 40)].mean(0)
    return Palette(hue=float(hue), sat=float(np.clip(sat, STYLE["glow_sat_min"], STYLE["glow_sat_max"])), ink=ink, shadow=shadow)


# --------------------------------------------------------------------------- noise


def fractal_noise(rng: np.random.Generator, w: int, h: int, octaves=(4, 9, 20, 44)) -> np.ndarray:
    """Cloud-like noise in [-1, 1]: bicubic-upscaled random grids, summed."""
    out = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for cells in octaves:
        grid = rng.random((max(2, int(cells * h / w)), cells)).astype(np.float32)
        img = Image.fromarray((grid * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += (np.asarray(img, np.float32) / 255.0 - 0.5) * 2 * amp
        total += amp
        amp *= 0.55
    return out / total


def fibers(rng: np.random.Generator, w: int, h: int) -> np.ndarray:
    """Faint paper fibres: noise smeared along a mostly-vertical direction."""
    n = rng.normal(0, 1, (h, w)).astype(np.float32)
    k = 18
    c = np.cumsum(np.pad(n, ((k, k), (0, 0)), mode="reflect"), axis=0)
    smeared = (c[2 * k :] - c[: -2 * k]) / (2 * k)
    return smeared[:h]


# --------------------------------------------------------------------------- render


def _hsv(h: float, s: float, v: float) -> np.ndarray:
    return np.array(colorsys.hsv_to_rgb(h, s, v), np.float32)


def render_base(pal: Palette, w: int, h: int, rng: np.random.Generator) -> np.ndarray:
    S = STYLE
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h

    # warm near-black stock, nudged toward the card's own hue
    stock = pal.shadow * (1 - S["stock_lift"]) + _hsv(pal.hue, pal.sat * 0.8, 0.17) * S["stock_lift"]
    img = np.ones((h, w, 3), np.float32) * stock
    img *= (0.92 + 0.16 * (1 - np.abs(ny - 0.5) * 2))[..., None]  # slightly lighter mid-band

    # lantern glow behind the perk
    cx, cy = S["glow_center"]
    d = np.sqrt(((nx - cx)) ** 2 + ((ny - cy) * h / w) ** 2) / S["glow_radius"]
    glow = np.clip(1 - d, 0, 1) ** 2.2
    img += glow[..., None] * (_hsv(pal.hue, pal.sat, S["glow_value"]) - stock) * S["glow_strength"]

    # mottling / water stains, darkening only
    mott = fractal_noise(rng, w, h)
    img *= (1 + mott * S["mottle_amp"] / 255.0 * 6)[..., None].clip(0.7, 1.25)

    # fibres + grain
    img += (fibers(rng, w, h) * S["fiber_amp"] / 255.0)[..., None]
    img += rng.normal(0, S["grain_sigma"] / 255.0, (h, w, 1)).astype(np.float32)

    # vignette
    rr = np.sqrt((nx - 0.5) ** 2 + ((ny - 0.5) * 0.85) ** 2) / 0.62
    img *= (1 - S["vignette"] * np.clip(rr, 0, 1.2) ** 2.4)[..., None]

    # chipped, lighter paper edge showing through the wear
    edge = np.minimum.reduce([nx, 1 - nx, ny * h / w, (1 - ny) * h / w])
    wear_noise = fractal_noise(rng, w, h, octaves=(10, 28, 70))
    wear = np.clip(1 - (edge + wear_noise * 0.02) / 0.03, 0, 1) ** 1.5
    img += wear[..., None] * (pal.ink * 0.5 - img) * S["edge_wear"] * 0.35
    return np.clip(img, 0, 1)


def render_overlay(pal: Palette, w: int, h: int, rng: np.random.Generator) -> Image.Image:
    """Frame, ornaments, scratches and dust, drawn supersampled then reduced."""
    S = STYLE
    k = S["ss"]
    W, H = w * k, h * k
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")

    ink = tuple(int(c * 255) for c in pal.ink)
    a = lambda f: int(255 * S["ink_alpha"] * f)  # noqa: E731

    def rect(m: float, width: float, alpha: float, cut: float = 0.0) -> None:
        x0, y0, x1, y1 = W * m, W * m, W * (1 - m), H - W * m
        c = W * cut
        pts = [(x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c), (x1 - c, y1), (x0 + c, y1), (x0, y1 - c), (x0, y0 + c)]
        d.line(pts + [pts[0]], fill=ink + (a(alpha),), width=max(1, int(width * k)))

    rect(S["frame_outer"], 3, 1.0, cut=0.03)
    rect(S["frame_inner"], 1.2, 0.55, cut=0.022)

    def diamond(cx: float, cy: float, r: float, alpha: float, fill: bool = True) -> None:
        pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
        d.polygon(pts, fill=ink + (a(alpha),) if fill else None, outline=ink + (a(alpha),))

    # corner brackets: a small diamond sitting on each corner cut
    mo = S["frame_outer"]
    for cx, cy in [(mo, mo), (1 - mo, mo), (mo, (H - W * mo) / W), (1 - mo, (H - W * mo) / W)]:
        diamond(cx * W, cy * W if cy < 1 else cy * W, 6 * k, 0.9)

    def divider(y_frac: float) -> None:
        y = H * y_frac
        mid = W / 2
        half = W * 0.30
        for off, wd, al in ((0, 1.4, 0.8), (7 * k, 0.8, 0.4)):
            d.line([(mid - half, y + off), (mid - 14 * k, y + off), ], fill=ink + (a(al),), width=max(1, int(wd * k)))
            d.line([(mid + 14 * k, y + off), (mid + half, y + off)], fill=ink + (a(al),), width=max(1, int(wd * k)))
        diamond(mid, y, 7 * k, 1.0)
        for dx in (-half - 10 * k, half + 10 * k):
            diamond(mid + dx, y, 3.5 * k, 0.8)

    divider(0.135)
    divider(0.865)

    # faint damask lattice, clipped to the inner frame
    lat = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lat, "RGBA")
    gap = S["lattice_gap"] * k
    la = int(255 * S["lattice_alpha"])
    for i in range(-int(H / gap) - 2, int(W / gap) + int(H / gap) + 3):
        ld.line([(i * gap, 0), (i * gap + H * 0.55, H)], fill=ink + (la,), width=max(1, k // 2))
        ld.line([(i * gap, 0), (i * gap - H * 0.55, H)], fill=ink + (la,), width=max(1, k // 2))
    mi = W * (S["frame_inner"] + 0.012)
    clip = Image.new("L", (W, H), 0)
    ImageDraw.Draw(clip).rectangle([mi, mi, W - mi, H - mi], fill=255)
    layer.paste(Image.alpha_composite(layer, lat), (0, 0), clip)

    # diamond "window" that echoes the perk icon's own shape
    cx, cy = W * S["glow_center"][0], H * S["glow_center"][1]
    r = W * S["window_scale"] / 2
    for scale, wd, al in ((1.0, 2.2, 0.50), (0.93, 1.0, 0.30), (1.12, 0.8, 0.16)):
        rr = r * scale
        d.polygon(
            [(cx, cy - rr), (cx + rr, cy), (cx, cy + rr), (cx - rr, cy)],
            outline=ink + (a(al),),
            width=max(1, int(wd * k)),
        )
    for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        diamond(cx + dx * r * 1.0, cy + dy * r * 1.0, 5 * k, 0.9)

    # scratches (the source art is scratched too)
    for _ in range(S["scratches"]):
        x, y = rng.random() * W, rng.random() * H
        ang = rng.normal(1.25, 0.5)
        length = rng.uniform(0.04, 0.22) * H
        bend = rng.normal(0, 0.12)
        pts = []
        for t in np.linspace(0, 1, 6):
            aa = ang + bend * t
            pts.append((x + np.cos(aa) * length * t, y + np.sin(aa) * length * t))
        light = rng.random() < 0.7
        col = (225, 215, 195) if light else (0, 0, 0)
        d.line(pts, fill=col + (int(rng.uniform(14, 46)),), width=max(1, int(rng.choice([1, 1, 2]) * k / 2)))

    # dust specks
    for _ in range(S["specks"]):
        x, y = rng.random() * W, rng.random() * H
        rad = rng.uniform(0.5, 2.2) * k / 2
        light = rng.random() < 0.6
        col = (230, 220, 200) if light else (0, 0, 0)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=col + (int(rng.uniform(25, 90)),))

    return layer.resize((w, h), Image.LANCZOS)


def grade(img: np.ndarray, pal: Palette) -> np.ndarray:
    """Final dusty grade: pull saturation toward warm grey, gentle S-curve."""
    grey = img.mean(2, keepdims=True) * np.array([1.04, 1.0, 0.92], np.float32)
    img = img * (1 - STYLE["desaturate"]) + grey * STYLE["desaturate"]
    img = np.clip(img, 0, 1)
    return img * img * (3 - 2 * img) * 0.35 + img * 0.65


def build_face(art_path: Path, size: tuple[int, int]) -> Image.Image:
    w, h = size
    pal = sample_palette(art_path)
    rng = np.random.default_rng(zlib.crc32(art_path.stem.encode()))
    base = grade(render_base(pal, w, h, rng), pal)
    face = Image.fromarray((base * 255).astype(np.uint8)).convert("RGBA")
    face = Image.alpha_composite(face, render_overlay(pal, w, h, rng))
    # a touch of softness so the grain reads as print, not digital noise
    return face.convert("RGB").filter(ImageFilter.GaussianBlur(0.35))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--art-dir", type=Path, default=DEFAULT_ART_DIR)
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    ap.add_argument("--size", default="600x900")
    ap.add_argument("--quality", type=int, default=80)
    args = ap.parse_args()

    w, h = (int(v) for v in args.size.lower().split("x"))
    args.out_dir.mkdir(parents=True, exist_ok=True)
    arts = sorted(args.art_dir.glob("the-*.webp"))
    if not arts:
        raise SystemExit(f"No the-*.webp card art found in {args.art_dir}")

    for art in arts:
        out = args.out_dir / art.name
        build_face(art, (w, h)).save(out, "WEBP", quality=args.quality, method=6)
        print(f"{out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}  {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
