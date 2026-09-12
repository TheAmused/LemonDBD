# backend/app/services/maps/seeder.py
"""Deliberately empty.

This module held `seed_maps_if_empty`, which planted six hardcoded
`SAMPLE_MAPS` rows -- plus their tiles and objectives -- into the raw SQLite
fallback whenever `map_realms` came back empty. It was one of three things
that wrote map data, and the placeholder ids it claimed collided with the real
ones in `maps.json`.

`app/seeds/static_db_seeder.py` is the only seeder. An empty maps table now
reads as an empty list, which is the truth, instead of six maps that do not
exist.
"""
