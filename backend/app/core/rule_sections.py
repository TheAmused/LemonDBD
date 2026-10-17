# backend/app/core/rule_sections.py
"""Which section of the Rules page a decision cites (pure: no Flask, no database).

Only the sections a person can break are numbered, in page order: "Section 1: ...". The opening
section (`scope`, "The trial grounds") says who the Rules apply to and has no number. Mirrors
`RULE_REFS` in `frontend/src/types/moderation.ts`, which the Rules page uses for its "Section N" labels.
"""

RULE_SECTION_NUMBERS: dict[str, int] = {
    "respect": 1,
    "fairPlay": 2,
    "yourContent": 3,
    "smashOrPass": 4,
    "serverCare": 5,
    "reporting": 6,
    "enforcement": 7,
}
