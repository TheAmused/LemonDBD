# backend/app/core/rule_sections.py
"""Where each citable section sits on the Rules page (pure: no Flask, no database).

The page opens with `scope` (section 1), which no decision cites. Mirrors `RULES_ORDER` in
`frontend/src/components/legal/legalDocs.ts`; a decision names its section as "Section 2: ...".
"""

RULE_SECTION_NUMBERS: dict[str, int] = {
    "respect": 2,
    "fairPlay": 3,
    "yourContent": 4,
    "smashOrPass": 5,
    "serverCare": 6,
    "reporting": 7,
    "enforcement": 8,
}
