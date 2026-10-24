# backend/app/services/scoreboard_ocr/loadout.py
"""Reads the loadout row of the scoreboard: 4 perks, offering, item, 2 add-ons.

None of it is text, so OCR cannot help: each slot is cut out and compared with the
icons the site already has on disk (``static/icons/...``, the files behind
``Perk.icon_local_path``, ``Item.icon_local_path``, ...). The comparison runs on the
darkest RGB channel, where the white glyph stands out from every slot background (the
purple perk diamond and each rarity colour alike), after normalising brightness and
contrast, so the dimmed rows of other players match as well as the highlighted one.
A slot is tried at a few sizes and offsets around its expected place.

Each slot is only compared with the icons that can be there: survivor perks on a
survivor row, killer perks on the killer row, the add-ons of the item class that was
recognised, the add-ons of the killer that was recognised, the offerings of the role.
Such a group's reference features are computed the first time a screenshot needs it,
kept in memory, and saved to a cache directory shared by every worker (and kept across
restarts), keyed by the icon files' paths, sizes and modification times.

Also here: finding the perk diamonds of a survivor row, which locates the whole panel.
"""
from __future__ import annotations

import hashlib
import logging
import os
import tempfile
import threading
from collections import OrderedDict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Sequence

import cv2
import numpy as np
from PIL import Image

from app.services.scoreboard_ocr import layout
from app.services.scoreboard_ocr.layout import Panel

logger = logging.getLogger(__name__)

GRID = 40              # every icon is compared as a GRID x GRID map
EMPTY_STD = 14.0       # glyph contrast below this: the slot is empty
SIZES = (-2, 0, 2)     # tried around the expected slot size
SHIFTS = (-2, 0, 2)    # tried around the expected slot centre

# Similarity thresholds per slot kind, from the sample screenshots: a correct match
# scores >= ~0.93 (perks), the best *wrong* icon (what wins when the right one is
# missing from the icon set) ~0.79 median. Items overlap more (Camping Aid Kit vs First
# Aid Kit differ in details), hence the smaller margin there.
MATCH_MIN = {"perk": 0.86, "offering": 0.85, "item": 0.85, "addon": 0.85}   # below: not recognised
CONFIDENT = {"perk": 0.92, "offering": 0.90, "item": 0.90, "addon": 0.90}   # below: flagged unsure
MARGIN_MIN = {"perk": 0.04, "offering": 0.04, "item": 0.02, "addon": 0.04}  # runner-up closer: unsure
# A dimmed row (a dead or escaped player) scores a bit lower overall, but a big lead over
# the runner-up still settles it: with the right icon removed, the wrong winner never
# scored >= 0.88 with a lead of 0.10 (perks, add-ons) or 0.15 (items, offerings).
STRONG_SCORE = 0.88
STRONG_LEAD = {"perk": 0.10, "offering": 0.15, "item": 0.15, "addon": 0.10}
# Some icons differ only in their centre (Deja Vu / Kindred / Object of Obsession are one
# eye with a different pupil): a very high score with a small lead is settled by comparing
# the centre alone, at a finer grid, among the top candidates. A wrong winner (right icon
# missing) never scored above 0.941 on the samples.
# Some slots draw the icon on a textured background (speckled add-on squares, grainy
# event offering hexagons), which lowers the similarity of the *right* icon too -- but it
# still leads the field by far. With the right icon removed, a wrong winner never led by
# more than 0.074 (add-ons) / 0.142 (other kinds) on the samples, so such a lead decides.
DECISIVE_SCORE = 0.70
DECISIVE_LEAD = {"perk": 0.20, "offering": 0.20, "item": 0.20, "addon": 0.12}
NEAR_TIE_SCORE = 0.94
NEAR_TIE_LEAD = 0.025
CENTRE_GRID = 64

KINDS = ("perk", "offering", "item", "addon")
FEATURE_VERSION = 3    # bump when the feature extraction changes: invalidates the disk cache
_MEMORY_GROUPS = 64    # reference groups kept in memory per worker


@dataclass(frozen=True)
class IconRef:
    """One reference icon. `role` is "survivor", "killer" or "" (both); `group` is the
    item category for items and item add-ons and the killer's name for killer add-ons."""

    kind: str
    name: str
    path: str
    role: str = ""
    group: str = ""
    rarity: str = ""  # items, add-ons, offerings: Common, Uncommon, Rare, Very Rare, Ultra Rare, Event, Special


# ---------------------------------------------------------------- masks / features
def _mask(kind: str) -> np.ndarray:
    yy, xx = np.mgrid[0:GRID, 0:GRID]
    c = (GRID - 1) / 2
    if kind == "perk":
        # inside the diamond, without the tier marks drawn at its top right
        m = (np.abs(xx - c) + np.abs(yy - c)) <= 0.82 * c
        return m & ~((xx > 0.58 * GRID) & (yy < 0.42 * GRID))
    if kind == "offering":
        return ((xx - c) ** 2 + (yy - c) ** 2) <= (0.8 * c) ** 2
    m = np.maximum(np.abs(xx - c), np.abs(yy - c)) <= 0.86 * c
    if kind == "addon":  # the "+" badge in the top right corner
        m &= ~((xx > 0.72 * GRID) & (yy < 0.28 * GRID))
    return m


MASKS = {kind: _mask(kind) for kind in KINDS}
SLOT_SIZES = {
    "perk": layout.PERK_SIZE, "offering": layout.OFFERING_SIZE,
    "item": layout.ITEM_SIZE, "addon": layout.ADDON_SIZE,
}


def _channel(rgb: np.ndarray) -> np.ndarray:
    return rgb.min(axis=2).astype(np.float32)


def _feature(channel: np.ndarray, kind: str) -> np.ndarray:
    g = cv2.resize(channel, (GRID, GRID), interpolation=cv2.INTER_AREA)
    g = cv2.GaussianBlur(g, (3, 3), 0)
    v = g[MASKS[kind]]
    v = v - v.mean()
    return v / (float(np.linalg.norm(v)) + 1e-6)


def _reference_rgb(path: str, kind: str) -> np.ndarray | None:
    try:
        with Image.open(path) as im:
            icon = im.convert("RGBA")
    except Exception:  # noqa: BLE001 - a missing or broken icon file just drops out
        logger.debug("icon unreadable: %s", path, exc_info=True)
        return None
    bg = (40, 40, 50, 255) if kind == "perk" else (40, 40, 40, 255)
    base = Image.new("RGBA", icon.size, bg)
    base.alpha_composite(icon)
    return np.asarray(base.convert("RGB"))


# ---------------------------------------------------------------- reference groups
@dataclass
class _Index:
    refs: list[IconRef]
    matrix: np.ndarray  # one feature row per ref


_groups: "OrderedDict[str, _Index]" = OrderedDict()
_groups_lock = threading.Lock()


def _cache_dir() -> Path | None:
    raw = os.environ.get("SCOREBOARD_ICON_CACHE") or os.path.join(tempfile.gettempdir(), "lemondbd-scoreboard-icons")
    path = Path(raw)
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError:
        return None
    return path


def _group_index(kind: str, refs: Sequence[IconRef]) -> _Index:
    """Feature matrix for exactly these icons: from memory, else the disk cache, else computed."""
    signature, present = [], []
    for ref in sorted(refs, key=lambda r: (r.name, r.path)):
        try:
            st = os.stat(ref.path)
        except OSError:
            continue
        present.append(ref)
        signature.append(f"{ref.path}:{st.st_size}:{st.st_mtime_ns}:{ref.name}:{ref.rarity}:{ref.group}")
    key = hashlib.sha256(f"{FEATURE_VERSION}|{kind}|{'|'.join(signature)}".encode()).hexdigest()[:40]

    with _groups_lock:
        hit = _groups.get(key)
        if hit is not None:
            _groups.move_to_end(key)
            return hit

    index = _load_cached(key, present) or _compute(kind, present, key)
    with _groups_lock:
        _groups[key] = index
        while len(_groups) > _MEMORY_GROUPS:
            _groups.popitem(last=False)
    return index


def _load_cached(key: str, present: list[IconRef]) -> _Index | None:
    folder = _cache_dir()
    if folder is None:
        return None
    try:
        with np.load(folder / f"{key}.npz") as data:
            kept, matrix = data["kept"], data["matrix"]
    except (OSError, KeyError, ValueError):
        return None
    if kept.size and int(kept.max()) >= len(present):
        return None
    return _Index([present[i] for i in kept.tolist()], matrix)


def _compute(kind: str, present: list[IconRef], key: str) -> _Index:
    kept, rows = [], []
    for i, ref in enumerate(present):
        rgb = _reference_rgb(ref.path, kind)
        if rgb is not None:
            kept.append(i)
            rows.append(_feature(_channel(rgb), kind))
    matrix = np.stack(rows).astype(np.float32) if rows else np.zeros((0, int(MASKS[kind].sum())), np.float32)
    folder = _cache_dir()
    if folder is not None:
        tmp = folder / f"{key}.{os.getpid()}.{threading.get_ident()}.tmp.npz"
        try:
            np.savez(tmp, kept=np.array(kept, dtype=np.int32), matrix=matrix)
            os.replace(tmp, folder / f"{key}.npz")
        except OSError:
            logger.debug("could not write the icon feature cache", exc_info=True)
            tmp.unlink(missing_ok=True)
    return _Index([present[i] for i in kept], matrix)


EVENT_CLASS = "event"


def _flat(text: str) -> str:
    return "".join(c for c in text.casefold() if c.isalnum())


class IconCatalog:
    """The reference icons, handed out per slot as the smallest group that can apply."""

    def __init__(self, refs: Iterable[IconRef]):
        self.refs = tuple(refs)

    def __bool__(self) -> bool:
        return bool(self.refs)

    def index(self, kind: str, *, role: str | None = None, group: str | tuple[str, ...] | None = None) -> _Index:
        """Icons of `kind` usable by `role` ("survivor"/"killer"; icons for both roles
        included), narrowed to `group` -- an item class or a killer, or several -- when
        that narrows to anything."""
        refs = [r for r in self.refs if r.kind == kind and (role is None or r.role in ("", role))]
        groups = {g.casefold() for g in ((group,) if isinstance(group, str) else (group or ())) if g}
        if groups:
            narrowed = [r for r in refs if r.group.casefold() in groups]
            if narrowed:
                refs = narrowed
        return _group_index(kind, refs)

    def category_of(self, item_name: str) -> str | None:
        return next((r.group for r in self.refs if r.kind == "item" and r.name == item_name and r.group), None)

    def addon_groups_for(self, item_name: str | None, category: str | None) -> tuple[str, ...] | None:
        """Which item add-on classes can sit next to this item (None: any).

        Event items are filed under the class "Event" although a Masquerade Med-Kit takes
        Med-Kit add-ons: their real class is the class name inside the item's name. The
        Event add-ons themselves are allowed next to every item."""
        if not category:
            return None
        if category.casefold() != EVENT_CLASS:
            return (category, EVENT_CLASS)
        classes = {r.group for r in self.refs if r.kind == "addon" and r.role in ("", "survivor") and r.group}
        flat_name = _flat(item_name or "")
        inside = [c for c in classes if c.casefold() != EVENT_CLASS and _flat(c) and _flat(c) in flat_name]
        return (max(inside, key=len), EVENT_CLASS) if inside else None


# ---------------------------------------------------------------- slot reading
def _crop(rgb: np.ndarray, cx: float, cy: float, size: int) -> np.ndarray | None:
    h = size // 2
    x0, y0 = int(round(cx)) - h, int(round(cy)) - h
    if x0 < 0 or y0 < 0 or x0 + size > rgb.shape[1] or y0 + size > rgb.shape[0] or size < 8:
        return None
    return rgb[y0 : y0 + size, x0 : x0 + size]


def slot_is_empty(rgb: np.ndarray, cx: float, cy: float, kind: str, scale: float = 1.0) -> bool:
    crop = _crop(rgb, cx, cy, int(round(SLOT_SIZES[kind] * scale)))
    if crop is None:
        return True
    ch = cv2.resize(_channel(crop), (GRID, GRID), interpolation=cv2.INTER_AREA)[MASKS[kind]]
    return float(ch.std()) < EMPTY_STD


def _variants(rgb: np.ndarray, cx: float, cy: float, kind: str, scale: float) -> np.ndarray:
    base = SLOT_SIZES[kind] * scale
    out = []
    for dd in SIZES:
        size = int(round(base)) + dd
        for sy in SHIFTS:
            for sx in SHIFTS:
                crop = _crop(rgb, cx + sx, cy + sy, size)
                if crop is not None:
                    out.append(_feature(_channel(crop), kind))
    return np.stack(out) if out else np.zeros((0, int(MASKS[kind].sum())), np.float32)


def _scores(rgb, cx, cy, kind, scale, index: _Index) -> np.ndarray | None:
    if index.matrix.shape[0] == 0:
        return None
    q = _variants(rgb, cx, cy, kind, scale)
    if q.shape[0] == 0:
        return None
    return (q @ index.matrix.T).max(axis=0)


_CENTRE = (lambda yy, xx, c: ((xx - c) ** 2 + (yy - c) ** 2) <= (0.42 * CENTRE_GRID) ** 2)(
    *np.mgrid[0:CENTRE_GRID, 0:CENTRE_GRID], (CENTRE_GRID - 1) / 2
)
_centre_refs: dict[tuple[str, str], np.ndarray | None] = {}


def _centre_feature(channel: np.ndarray) -> np.ndarray:
    g = cv2.resize(channel, (CENTRE_GRID, CENTRE_GRID), interpolation=cv2.INTER_AREA)
    g = cv2.GaussianBlur(g, (3, 3), 0)
    v = g[_CENTRE].astype(np.float32)
    v = v - v.mean()
    return v / (float(np.linalg.norm(v)) + 1e-6)


def _centre_winner(rgb, cx, cy, kind, scale, refs: list[IconRef]) -> str | None:
    """Which of `refs` matches the slot's centre best (the near-tie decider)."""
    rows, names = [], []
    for ref in refs:
        key = (kind, ref.path)
        if key not in _centre_refs:
            ref_rgb = _reference_rgb(ref.path, kind)
            _centre_refs[key] = None if ref_rgb is None else _centre_feature(_channel(ref_rgb))
        if _centre_refs[key] is not None:
            rows.append(_centre_refs[key])
            names.append(ref.name)
    if not rows:
        return None
    base = SLOT_SIZES[kind] * scale
    queries = [
        _centre_feature(_channel(crop))
        for dd in SIZES for sy in SHIFTS for sx in SHIFTS
        if (crop := _crop(rgb, cx + sx, cy + sy, int(round(base)) + dd)) is not None
    ]
    if not queries:
        return None
    scores = (np.stack(queries) @ np.stack(rows).T).max(axis=0)
    return names[int(np.argmax(scores))]


def _verdict(
    kind: str,
    scores: np.ndarray | None,
    index: _Index,
    exclude: frozenset[str] | set[str] = frozenset(),
    centre=None,
) -> dict:
    if scores is None:
        return {"name": None, "empty": False, "confidence": 0.0, "uncertain": True}
    order = [i for i in np.argsort(-scores) if scores[i] > -1.0 and index.refs[i].name not in exclude]
    if not order:
        return {"name": None, "empty": False, "confidence": 0.0, "uncertain": True}
    best = float(scores[order[0]])
    # the runner-up is the best *other* name (one icon can be on disk twice)
    runner = next((float(scores[i]) for i in order[1:] if index.refs[i].name != index.refs[order[0]].name), -1.0)
    lead = best - runner
    decisive = best >= DECISIVE_SCORE and lead >= DECISIVE_LEAD[kind]
    if best < MATCH_MIN[kind] and not decisive:
        return {"name": None, "empty": False, "confidence": round(best, 3), "uncertain": True}
    sure = (
        decisive
        or (best >= CONFIDENT[kind] and lead >= MARGIN_MIN[kind])
        or (best >= STRONG_SCORE and lead >= STRONG_LEAD[kind])
    )
    if not sure and centre is not None and best >= NEAR_TIE_SCORE and lead >= NEAR_TIE_LEAD:
        top: list[IconRef] = []
        for i in order:
            if index.refs[i].name not in {r.name for r in top}:
                top.append(index.refs[i])
            if len(top) == 3:
                break
        sure = centre(top) == index.refs[order[0]].name
    uncertain = not sure
    out = {"name": index.refs[order[0]].name, "empty": False, "confidence": round(best, 3), "uncertain": uncertain}
    if uncertain:
        names: list[str] = []
        for i in order:
            if index.refs[i].name not in names:
                names.append(index.refs[i].name)
            if len(names) == 3:
                break
        out["candidates"] = names
    return out


EMPTY = {"name": None, "empty": True, "confidence": 0.0, "uncertain": False}

# The background colour of an item, add-on or offering slot is its rarity. Measured on the
# sample screenshots (hue in degrees): Common brown (grey on a dimmed row), Uncommon green,
# Rare blue, Very Rare purple, Ultra Rare pink, Event gold -- 150/150 confident matches on
# survivor rows and the highlighted row classified right. On a *dimmed killer row* the slots
# are see-through over the red background and the colours shift, so it is not used there.
RARITY_TRUST_GAP = 0.10  # same-rarity best this far below the overall best: ignore the colour


def classify_rarity(hue: float, sat: float, val: float) -> str | None:
    if sat < 0.16:
        return "Common"
    if 15 <= hue < 44 and val < 0.32:
        return "Common"
    if 44 <= hue < 62 and sat >= 0.5 and val >= 0.33:
        return "Event"
    if 120 <= hue < 165 and sat >= 0.3:
        return "Uncommon"
    if 195 <= hue < 228 and sat >= 0.25:
        return "Rare"
    if 245 <= hue < 280 and sat >= 0.22:
        return "Very Rare"
    if 322 <= hue < 352 and sat >= 0.3:
        return "Ultra Rare"
    return None


def slot_rarity(rgb: np.ndarray, cx: float, cy: float, kind: str, scale: float = 1.0) -> str | None:
    """Rarity from the slot's background: the darker half of the pixels (not the white glyph)."""
    crop = _crop(rgb, cx, cy, int(round(SLOT_SIZES[kind] * scale)))
    if crop is None:
        return None
    small = cv2.resize(crop.astype(np.float32), (GRID, GRID), interpolation=cv2.INTER_AREA)
    pixels = small[MASKS[kind]]
    darkest = pixels.min(axis=1)
    background = pixels[darkest <= np.percentile(darkest, 45)]
    r, g, b = (float(v) / 255.0 for v in np.median(background, axis=0))
    hsv = cv2.cvtColor(np.array([[[r, g, b]]], dtype=np.float32), cv2.COLOR_RGB2HSV)[0, 0]
    return classify_rarity(float(hsv[0]), float(hsv[1]), float(hsv[2]))


def _restrict_to_rarity(scores: np.ndarray | None, index: _Index, rarity: str | None) -> np.ndarray | None:
    """Scores with every icon of another rarity ruled out, unless that costs the best match
    more than RARITY_TRUST_GAP (a misread colour, or a wrong rarity in the database)."""
    if scores is None or not rarity:
        return scores
    same = np.array([r.rarity == rarity for r in index.refs])
    if not same.any():
        return scores
    restricted = np.where(same, scores, -1.0)
    if float(restricted.max()) < float(scores.max()) - RARITY_TRUST_GAP:
        return scores
    return restricted


def read_loadout(
    rgb: np.ndarray,
    panel: Panel,
    body_cy: float,
    role: str,
    catalog: IconCatalog,
    *,
    character: str | None = None,
    colours_reliable: bool = True,
) -> dict:
    """Perks, offering, item and add-ons of one row. `role` is "survivor" or "killer";
    `character` (the roster name, when recognised) narrows a killer's add-ons;
    `colours_reliable` is False for a dimmed killer row, whose slot colours are tinted red."""
    s = panel.scale

    def at(ref_x: float) -> float:
        return panel.x(ref_x)

    def decider(kind: str, cx: float):
        return lambda refs: _centre_winner(rgb, cx, body_cy, kind, s, refs)

    def one(kind: str, ref_x: float, index_fn) -> dict:
        if slot_is_empty(rgb, at(ref_x), body_cy, kind, s):
            return dict(EMPTY)
        index = index_fn()
        rarity = slot_rarity(rgb, at(ref_x), body_cy, kind, s) if colours_reliable else None
        scores = _restrict_to_rarity(_scores(rgb, at(ref_x), body_cy, kind, s, index), index, rarity)
        verdict = _verdict(kind, scores, index, centre=decider(kind, at(ref_x)))
        if rarity:
            verdict["rarity"] = rarity
        return verdict

    perks: list[dict | None] = [None] * 4
    filled = [i for i, x in enumerate(layout.PERK_XS) if not slot_is_empty(rgb, at(x), body_cy, "perk", s)]
    for i in set(range(4)) - set(filled):
        perks[i] = dict(EMPTY)
    if filled:
        perk_index = catalog.index("perk", role=role)
        scored = [(i, _scores(rgb, at(layout.PERK_XS[i]), body_cy, "perk", s, perk_index)) for i in filled]
        # A build never holds the same perk twice: the most certain slot keeps a name and
        # the others fall back to their next best one.
        taken: set[str] = set()
        for i, scores in sorted(scored, key=lambda t: -(float(np.max(t[1])) if t[1] is not None else -2)):
            perks[i] = _verdict("perk", scores, perk_index, exclude=taken, centre=decider("perk", at(layout.PERK_XS[i])))
            if perks[i]["name"]:
                taken.add(perks[i]["name"])

    offering = one("offering", layout.OFFERING_X, lambda: catalog.index("offering", role=role))
    if role == "survivor":
        item = one("item", layout.ITEM_X, lambda: catalog.index("item", role="survivor"))
        # Close item calls are variants of one class (Toolbox / Worn-out Tools): the class
        # is still known when the two best candidates share it.
        category = None
        if item.get("name"):
            names = [item["name"], *item.get("candidates", [])[1:2]] if item.get("uncertain") else [item["name"]]
            classes = {catalog.category_of(n) for n in names}
            category = classes.pop() if len(classes) == 1 else None
        if category:
            item["category"] = category
        addon_groups = catalog.addon_groups_for(item.get("name"), category)
        addons = [one("addon", x, lambda: catalog.index("addon", role="survivor", group=addon_groups)) for x in layout.ADDON_XS]
    else:
        item = None  # the killer's slot shows their power, which the character already tells
        addons = [one("addon", x, lambda: catalog.index("addon", role="killer", group=character)) for x in layout.ADDON_XS]

    slots = [*perks, offering, *addons] + ([item] if item else [])
    return {
        "perks": perks,
        "offering": offering,
        "item": item,
        "addons": addons,
        "empty": all(slot["empty"] for slot in slots),
    }


# ---------------------------------------------------------------- panel location
def _purple(rgb: np.ndarray) -> np.ndarray:
    f = rgb.astype(np.float32)
    return np.clip((f[:, :, 0] + f[:, :, 2]) / 2 - f[:, :, 1], 0, None)


@lru_cache(maxsize=16)
def _diamond(size: int) -> np.ndarray:
    yy, xx = np.mgrid[0:size, 0:size]
    c = (size - 1) / 2
    return ((np.abs(xx - c) + np.abs(yy - c)) <= c * 0.95).astype(np.float32)


def locate_perk_diamonds(rgb: np.ndarray, body_cy: float, x_guess: float) -> tuple[float, float, float] | None:
    """(x of the first diamond, pitch, match score) for the 4 perk diamonds of a survivor
    row whose loadout line is near `body_cy`, or None when they are not clearly there
    (the killer row's red background, a hidden loadout)."""
    y0 = int(max(0, body_cy - 45))
    y1 = int(min(rgb.shape[0], body_cy + 45))
    x0 = int(max(0, x_guess - 90))
    x1 = int(min(rgb.shape[1], x_guess + 290))
    if y1 - y0 < 70 or x1 - x0 < 200:
        return None
    strip = _purple(rgb[y0:y1, x0:x1])
    best = None
    for size in range(40, 66, 2):
        if size >= strip.shape[0]:
            break
        res = cv2.matchTemplate(strip, _diamond(size), cv2.TM_CCOEFF_NORMED)
        work = res.copy()
        peaks = []
        for _ in range(4):
            yy, xx = np.unravel_index(int(np.argmax(work)), work.shape)
            peaks.append((float(work[yy, xx]), xx + size / 2 + x0, yy + size / 2 + y0))
            work[max(0, yy - size // 2) : yy + size // 2 + 1, max(0, xx - int(size * 0.8)) : xx + int(size * 0.8) + 1] = -1
        score = float(np.mean([p[0] for p in peaks]))
        if best is None or score > best[0]:
            best = (score, sorted(peaks, key=lambda p: p[1]))
    if best is None:
        return None
    score, peaks = best
    xs = [p[1] for p in peaks]
    ys = [p[2] for p in peaks]
    gaps = np.diff(xs)
    pitch = float(np.median(gaps))
    if (
        score < 0.6
        or not 40 <= pitch <= 80
        or float(np.max(np.abs(gaps - pitch))) > 4
        or max(ys) - min(ys) > 6
    ):
        return None
    return xs[0], pitch, score


def locate_panel(rgb: np.ndarray, bodies: Sequence[float], guess: Panel) -> Panel:
    """Refines `guess` from the perk diamonds of the rows' loadout lines."""
    found = [hit for cy in bodies if (hit := locate_perk_diamonds(rgb, cy, guess.x0)) is not None]
    if not found:
        return guess
    x0 = float(np.median([h[0] for h in found]))
    pitch = float(np.median([h[1] for h in found]))
    return Panel(x0=x0, scale=pitch / layout.REF_PERK_PITCH, located=True)
