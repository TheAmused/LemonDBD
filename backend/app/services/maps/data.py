# backend/app/services/maps/data.py
"""Deliberately empty.

`SAMPLE_MAPS` and `DEFAULT_TILES_SEED_A` lived here: six hardcoded maps and
five generic tile names ("12 O'Clock: Main Landmark / North Exit Gate") that
two different code paths planted into the database whenever a table looked
empty. They claimed primary keys 1-6, which `maps.json` assigns to six
entirely different maps, and the collision broke the real import on every
boot.

The 58 real maps come from `app/seeds/data/content/maps.json`, and the per-map
callouts the tile names were standing in for live in the frontend's
`utils/mapLandmarks.ts`.
"""
