# Character Scraper — Portraits, Categories and Release Order

**Date:** 2026-08-06
**Branch:** `fix/character-scraper-portraits`
**Status:** Approved

## Goal

Fix the character data at its source. Today the scraper files killers under the
`Survivor` category, fills the `Killer` category with powers and add-ons, and
attaches power icons to killers instead of portraits. Everything downstream — the
Page streak roster, the Gauntlet roster, perk cards — inherits those errors.

## The defect, precisely

`ScraperService.scrape_characters_dynamically` walks two wiki index pages and, for
each `/wiki/` link containing an `<img>`, records a character:

```python
process_page(self.SURVIVORS_URL, "Survivor")
process_page(self.KILLERS_URL, "Killer")
```

Three things go wrong:

1. **Category comes from which page the link was found on**, and `seen_slugs` is
   shared across both calls. The Survivors page also links to killers, so — running
   first — it claims them as `Survivor`. Measured on the live wiki: the Survivors
   page links 190 distinct titles, the Killers page 217, and 85 titles appear on
   both.
2. **Only leftovers reach the Killer category.** After survivors and killers are
   consumed by the first pass, the Killers page contributes mostly powers and
   add-ons — which is why `/api/v1/characters?category=Killer` returns "Bear Traps"
   and "Hunting Hatchets" as characters.
3. **The avatar is whatever image the link happened to carry.** For many killers the
   index links via the power icon, so `avatars/survivors/trapper.png` is a bear
   trap while `the_clown.png` is a real portrait. File sizes show the split
   plainly: portraits ~100 KB, power icons ~7-14 KB.

The current defences — an `EXCLUDED_SLUGS` set and substring checks for `"perk"`,
`"power"`, `"addon"` in the slug — cannot fix this because they filter on the slug,
not on what the image actually is.

## The signal that resolves it

Portrait filenames on the wiki encode both role and release number:

| Example filename | Meaning |
|---|---|
| `K01_TheTrapper_Portrait.png` | killer #1 |
| `K04_TheNurse_Portrait.png` | killer #4 |
| `S07_AceVisconti_Portrait.png` | survivor #7 |
| `S40_AlanWake_Portrait.png` | survivor #40 |
| `IconPowers_trap.png` | a power — not a character |

So a link is a character if and only if its image filename matches
`^(K|S)(\d+)_.*_Portrait`. The prefix gives the category, the number gives release
order, and everything without a portrait — powers, items, and wiki concepts like
"Realm", "Entity", "Hatch" — is excluded by construction.

Verified against the live wiki before this spec was written:

- 86 portrait links on the Killers page, 88 on the Survivors page.
- All 40 killers currently in the Page streak roster are matched by the portrait
  rule — none are lost.
- The 85-title overlap between the pages is resolved by the filename prefix rather
  than by page order.

## Decisions

Each was chosen by the user over stated alternatives:

1. **Killer names keep no article** — `Trapper`, not `The Trapper`, matching the
   `character` field perks already carry. The wiki title (`The Trapper`) is kept in
   `real_name`.
2. **The two existing Gauntlet runs are reset**, not migrated. One of them is
   pinned to "Blood Bond" — a power — so it is invalid data anyway.
3. **Both roles are fixed**, not killers alone, since one rule covers both and
   leaving survivors on the old path would keep the broken code alive.
4. **Release order is stored and consumed now.** Page streak currently infers order
   from the position of a `The <name>` entry in `characters.json`; that heuristic is
   replaced by the portrait number, which also fixes the five killers that today
   fall to the end alphabetically.

## Scope

In scope:

- Rewrite character discovery in `scraper_service.py` around the portrait rule.
- Add `release_number` to the character record and persist it.
- Normalise killer names by stripping a leading `The `, keeping the full title as
  `real_name`.
- Point `character_avatar_path` at the portrait for every character.
- Replace Page streak's ordering heuristic with `release_number`.
- Reset the two existing Gauntlet runs.

Out of scope:

- Perk scraping, perk icons, and the perk→character matching rules beyond what the
  corrected character list changes on its own.
- The Gauntlet, Draft, SWF and Build Vault UIs — they consume the corrected data
  unchanged.
- Re-theming any screen. Portraits will simply start appearing where power icons
  are now.

## Character record

`CharacterData` and the persisted JSON gain one field:

| Field | Change |
|---|---|
| `name` | killer article stripped: `Trapper` |
| `real_name` | full wiki title: `The Trapper` |
| `category` | from the portrait prefix (`K` → `Killer`, `S` → `Survivor`), no longer from the page |
| `release_number` | **new** — integer from the portrait filename (`K01` → 1) |
| `avatar_url` / `avatar_local_path` | the portrait image, never a power icon |

`avatar_local_path` keeps the existing `avatars/<killers|survivors>/<name>.png`
shape, but killers now genuinely land under `avatars/killers/`, which today holds
only power icons.

## Discovery algorithm

For each of the two index pages, for every `/wiki/` link containing an `<img>`:

1. Read the image URL, take the filename, and test it against
   `^(K|S)(\d+)_.*_Portrait`. No match → skip the link entirely.
2. Category from the prefix; `release_number` from the digits.
3. Name from the link title, with a leading `The ` stripped for killers.
4. Deduplicate on category plus normalised name, keeping the first occurrence.

Both pages are still visited, because each carries portraits the other omits, and
`seen_slugs` no longer decides anything about category.

## Page streak ordering

`PageStreakService._character_positions` currently builds a map from the order of
entries in the character list, preferring a `The <name>` entry. It is replaced by a
lookup of `release_number` keyed on the character name. The public behaviour of
`get_killers()` is unchanged in shape: known killers first in release order, unknown
ones after them alphabetically, so a killer missing from the character list still
appears rather than vanishing from the roster.

`PerkService.get_characters_in_scrape_order()`, added for the old heuristic, is
removed once nothing calls it.

## Existing data

Re-scraping rewrites `characters.json` and the avatar files. Killer names change
from the current mixture (`Trapper`, `The Clown`) to the consistent unprefixed form
(`Trapper`, `Clown`), so rows keyed on the old names are stale.

On startup, a one-time migration deletes rows in `challenge_runs` and `match_logs`
whose character no longer exists in the character list. Page streak needs no
migration in practice — its tables are empty — but the same check applies to
`page_streak_runs` for safety, and its history cascades on delete.

## Error handling

- A link whose image is missing, malformed, or not a portrait is skipped silently;
  that is the normal case for most links on both pages.
- If a page yields zero portraits, the scrape logs an error and leaves the existing
  `characters.json` untouched rather than writing an empty list — an empty roster
  would break every tab.
- A portrait filename with an unparseable number is skipped rather than defaulted,
  so a bad record cannot silently sort first.

## Verification

Backend tests are the gate — the parsing rules are pure functions over HTML and
filenames, which is exactly what the existing suite covers well:

- the portrait regex accepts `K01_TheTrapper_Portrait.png` and
  `S07_AceVisconti_Portrait.png`, and rejects `IconPowers_trap.png`,
  `IconItems_flashlight.png` and an empty string
- category and release number are read from the prefix, not from the page argument
- a killer title `The Trapper` yields `name="Trapper"`, `real_name="The Trapper"`
- a survivor title is left unstripped (`Ace Visconti` stays whole)
- a page containing only power links yields no characters
- duplicate titles across both pages produce one record, with the category from the
  filename rather than from page order
- `PageStreakService.get_killers()` orders by `release_number`, and a killer without
  one still appears, after the ordered ones

Fixture HTML is inlined in the tests; no test may reach the network.

Manual verification after a re-scrape: `/api/v1/characters?category=Killer` contains
no powers, the Page streak roster starts Trapper, Wraith, Hillbilly, Nurse, Shape,
and the roster cards show portraits rather than power icons.
