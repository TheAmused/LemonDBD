# backend/scripts/map_geometry.py
"""Floor geometry of a map layout: point tests, clearances and the 1 to 12 clock callout positions.

A port of mapLayout.ts in the frontend. Used by generate_map_images.py.
"""
import math
from typing import Any


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


def has_box_clearance(floor: dict[str, Any], x: float, y: float, hw: float, hh: float) -> bool:
    """Check clearance across a rectangular label box around (x, y). Identical to mapLayout.ts."""
    probes = [
        (0.0, 0.0), (hw, 0.0), (-hw, 0.0), (0.0, hh), (0.0, -hh),
        (hw, hh), (hw, -hh), (-hw, hh), (-hw, -hh),
    ]
    return all(point_on_floor(floor, x + px, y + py) for px, py in probes)


def ring_perimeter(ring: list[list[float]]) -> float:
    """Length of a closed ring. Identical to mapLayout.ts."""
    return sum(
        math.hypot(ring[(i + 1) % len(ring)][0] - p[0], ring[(i + 1) % len(ring)][1] - p[1])
        for i, p in enumerate(ring)
    )


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
    # Landmarks are only dodged a short way inwards of the edge.
    # On a floor with named rooms the numbers would sit on the names: they are printed just outside
    # the outline instead, in the margin of the picture.
    outside_m = 5.0 if bool(floor.get("rooms")) else None
    ray_step_m = 0.5
    sector_offsets = [0, 5, -5, 10, -10, 14, -14]

    def clear_of_landmarks(x: float, y: float) -> bool:
        return all(distance_to_landmark(lm, x, y) >= landmark_clearance_m for lm in landmarks)

    show_mid = has_clearance(floor, cx, cy, clock_clearance_m) and clear_of_landmarks(cx, cy)
    if floor.get("clock"):
        return (cx, cy), list(floor["clock"]), show_mid

    def place_outside(degrees: float) -> tuple[float, float] | None:
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
        out_r = max(last_in_outline, last_inside) + (outside_m or 5.0)
        return (cx + dx * out_r, cy + dy * out_r)

    labels = []
    outline = floor.get("outline", [])
    if outside_m is not None or not outline or len(outline[0]) < 3 or ring_perimeter(outline[0]) == 0:
        for hour in range(1, 13):
            point = None
            for offset in sector_offsets:
                point = place_outside(hour * 30.0 + offset)
                if point is not None:
                    break
            if point is not None:
                labels.append({"hour": hour, "x": point[0], "y": point[1]})
    else:
        ring = list(outline[0])
        n = len(ring)
        area = sum(ring[i][0] * ring[(i + 1) % n][1] - ring[(i + 1) % n][0] * ring[i][1] for i in range(n))
        if area < 0:
            ring.reverse()
        segs: list[tuple[list[float], list[float], float, float]] = []
        total = 0.0
        for i in range(n):
            p0, p1 = ring[i], ring[(i + 1) % n]
            length = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
            if length > 0:
                segs.append((p0, p1, length, total))
                total += length

        def ray_param(dx: float, dy: float) -> float:
            best_r = -1.0
            best_d = 0.0
            for p0, p1, length, start in segs:
                sx, sy = p1[0] - p0[0], p1[1] - p0[1]
                denom = dx * sy - dy * sx
                if abs(denom) < 1e-9:
                    continue
                qx, qy = p0[0] - cx, p0[1] - cy
                r = (qx * sy - qy * sx) / denom
                t = (qx * dy - qy * dx) / denom
                if r > 0 and -1e-6 <= t <= 1.0 + 1e-6 and r > best_r:
                    best_r = r
                    best_d = start + max(0.0, min(1.0, t)) * length
            return best_d

        d12 = ray_param(0.0, -1.0)
        d3 = ray_param(1.0, 0.0)
        d6 = ray_param(0.0, 1.0)
        d9 = ray_param(-1.0, 0.0)

        def arc(a: float, b: float) -> float:
            return (b - a) % total

        anchors = [
            (1, (d12 + arc(d12, d3) / 3.0) % total),
            (2, (d12 + 2.0 * arc(d12, d3) / 3.0) % total),
            (3, d3),
            (4, (d3 + arc(d3, d6) / 3.0) % total),
            (5, (d3 + 2.0 * arc(d3, d6) / 3.0) % total),
            (6, d6),
            (7, (d6 + arc(d6, d9) / 3.0) % total),
            (8, (d6 + 2.0 * arc(d6, d9) / 3.0) % total),
            (9, d9),
            (10, (d9 + arc(d9, d12) / 3.0) % total),
            (11, (d9 + 2.0 * arc(d9, d12) / 3.0) % total),
            (12, d12),
        ]

        def at_arc(raw_d: float) -> tuple[float, float, float, float]:
            d = raw_d % total
            for p0, p1, length, start in segs:
                if start <= d <= start + length + 1e-9:
                    t = (d - start) / length
                    return (
                        p0[0] + (p1[0] - p0[0]) * t,
                        p0[1] + (p1[1] - p0[1]) * t,
                        -(p1[1] - p0[1]) / length,
                        (p1[0] - p0[0]) / length,
                    )
            return cx, cy, 0.0, 0.0

        for hour, d in anchors:
            hw = 5.5 if hour >= 10 else 4.0
            hh = 4.5
            best = None
            for d_off in (0.0, 5.0, -5.0, 10.0, -10.0, 15.0, -15.0):
                ex, ey, nx, ny = at_arc(d + d_off)
                for inset in (7.0, 8.5, 10.0, 12.0, 14.0, 5.5):
                    tx, ty = ex + nx * inset, ey + ny * inset
                    if (
                        has_box_clearance(floor, tx, ty, hw, hh)
                        and clear_of_landmarks(tx, ty)
                        and all(math.hypot(tx - p["x"], ty - p["y"]) >= 11.0 for p in labels)
                    ):
                        best = (tx, ty)
                        break
                if best is not None:
                    break
            if best is None:
                ex, ey, _, _ = at_arc(d)
                dx, dy = cx - ex, cy - ey
                dl = math.hypot(dx, dy) or 1.0
                for inset in (7.0, 9.0, 11.0, 13.0, 15.0, 18.0, 5.0):
                    tx, ty = ex + (dx / dl) * inset, ey + (dy / dl) * inset
                    if has_box_clearance(floor, tx, ty, hw, hh):
                        best = (tx, ty)
                        break
                if best is None:
                    for inset in (7.0, 5.0, 9.0, 3.0):
                        tx, ty = ex + (dx / dl) * inset, ey + (dy / dl) * inset
                        if point_on_floor(floor, tx, ty):
                            best = (tx, ty)
                            break
            labels.append({"hour": hour, "x": best[0] if best else cx, "y": best[1] if best else cy})

    return (cx, cy), labels, show_mid
