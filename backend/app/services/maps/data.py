# backend/app/services/maps/data.py
"""Deliberately empty.

`SAMPLE_MAPS` and `DEFAULT_TILES_SEED_A` lived here: six hardcoded maps and
five generic tile names ("12 O'Clock: Main Landmark / North Exit Gate") that
two different code paths planted into the database whenever a table looked
empty. They claimed primary keys 1-6, which `maps.json` assigns to six
entirely different maps, and the collision broke the real import on every
boot.

The 58 real maps come from `app/seeds/data/content/maps.json`. The five tile
names stood in for per-map callouts that nothing ever rendered from a tile
list -- what the UI shows is the callout image at `callout_image_url`.
"""
