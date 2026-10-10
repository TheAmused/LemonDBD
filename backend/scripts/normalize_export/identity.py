# backend/scripts/normalize_export/identity.py
"""Stable integer ids and foreign-key resolution."""
from __future__ import annotations

from typing import Any

from .bootstrap import name_key


class IdAssigner:
    """Hands out stable integer ids for one entity.

    Seeded from whatever the target file already contains, so ids survive a
    re-run: a row that was id 42 last time is id 42 again, and anything new
    starts after the highest id ever issued. Rows are identified for this
    purpose by a normalized natural key (a character's name, a map's map_id) --
    that key is used *here*, offline, to decide what number a row gets, and
    never at import time, where the id itself is the only thing consulted.
    """

    def __init__(self, existing_rows: list[dict[str, Any]], key_of) -> None:
        self._key_of = key_of
        self._assigned: dict[str, int] = {}
        self._next = 1
        #: True once any prior id has been read. On a first conversion nothing
        #: has been seeded, and ids come from `position` -- which is what a
        #: database built from the pre-conversion file already holds.
        self._seeded = False
        for row in existing_rows:
            row_id = row.get("id")
            if not isinstance(row_id, int):
                continue
            key = key_of(row)
            if key and key not in self._assigned:
                self._assigned[key] = row_id
            self._next = max(self._next, row_id + 1)
            self._seeded = True

    def __call__(self, row: dict[str, Any], position: int) -> int:
        """Id for `row`. Falls back to 1-based position on a first run, which
        reproduces the ids a database seeded from these files already holds."""
        key = self._key_of(row)
        if key and key in self._assigned:
            return self._assigned[key]
        # `position` on a first conversion, so ids match a database built from
        # the pre-conversion file; `_next` once ids exist, so a re-scrape
        # appends rather than renumbering.
        assigned = self._next if self._seeded else position
        self._next = max(self._next, assigned + 1)
        if key:
            self._assigned[key] = assigned
        return assigned

    @property
    def reused(self) -> int:
        return len(self._assigned)


def by_name(row: dict[str, Any]) -> str:
    return name_key(row.get("name"))


def by_map_id(row: dict[str, Any]) -> str:
    """A map's natural key for id assignment: its name.

    Used here, offline, only to decide which integer a map keeps across a
    re-run. `map_realms` has no string key any more -- it was
    `hens_autohaven_wreckers_azarovs_resting_place`, which spelled out the
    callout provider, the realm and the name, all three of which are columns on
    the same row.
    """
    return name_key(row.get("name"))


def fk(row: dict[str, Any], column: str, resolve) -> int | None:
    """The row's existing integer foreign key, or one resolved from legacy text.

    This is what makes the script idempotent: an already-converted file carries
    `chapter_id` / `killer_id` / `realm_id` and keeps them; a fresh scrape
    carries `chapter_name` / `associated_target` / `realm` and gets them
    resolved once.
    """
    existing = row.get(column)
    if isinstance(existing, int):
        return existing
    return resolve()
