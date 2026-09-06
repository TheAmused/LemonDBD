# Split wikigg.py Into Domain Mixins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single 1747-line `WikiGGScraperDriver` class in `backend/app/scrapers/wikigg.py` (one class doing characters, chapters, perks, items, addons, offerings, and realms scraping) into 7 focused per-domain mixin files, composed back into the exact same class via multiple inheritance, so every existing caller (`scraper_service.py`, `pipeline.py`, all scraper tests) keeps working against the identical public API with zero call-site changes.

**Architecture:** Each domain's methods move verbatim (same signatures, same bodies) into their own file as a small mixin class (e.g. `WikiGGChaptersMixin`). `wikigg.py` keeps its module-level parsing helpers, `__init__`, `fetch_page_html`, `fetch_lang_page_html`, `scrape_translations`, and `scrape_all`, and the final `WikiGGScraperDriver` class inherits from all 7 mixins plus its own body — so `isinstance(driver, WikiGGScraperDriver)` and every `driver.scrape_X()` call anywhere in the codebase behaves exactly as before. This is a pure move: no method is rewritten, no signature changes, no new abstractions.

**Tech Stack:** Python 3.12, Flask, BeautifulSoup4, pytest.

**Spec:** No separate spec file — this plan's own Goal/Architecture plus the brainstorming conversation that produced it (backend refactor sub-project 1, branch `refactor/codebase-cleanup-and-optimization`) is the spec. Prior work already removed the dead `WikiGGDriverEN`/`drivers.WikiGGScraperDriver` duplicate on this same branch (commit `9a08c34`) — that is done and is not part of this plan.

## Global Constraints

- Every new type must be concrete (no untyped `dict`/`Any` shortcuts) — project-wide rule from `CLAUDE.md`.
- No em dash character in any comment or string — project-wide rule from `CLAUDE.md`.
- Keep commits to a single line, no long explanatory bodies — user preference.
- This is a pure structural move: method bodies must be copied verbatim (byte-for-byte, aside from re-indentation from moving into a new file) — no behavior change, no incidental fixes to unrelated code smells encountered along the way (e.g. `enrich_characters_from_pages` hardcodes `AsyncSession(impersonate="chrome120", ...)` instead of `self.IMPERSONATE_BROWSER` — leave this exactly as-is, it is a pre-existing inconsistency outside this plan's scope).
- `canonicalise_addons` is called externally as `WikiGGScraperDriver.canonicalise_addons(...)` (class-level, not instance-level) in `tests/unit/scrapers/test_addon_canonicalisation.py` — its `@staticmethod` decorator must move with it unchanged, and it must still be reachable as `WikiGGScraperDriver.canonicalise_addons` after the mixin composition (this works automatically via the MRO once the mixin is inherited — no special handling needed, but Task 6's verification step confirms it explicitly).
- After every task, run only the test files listed in that task's Interfaces section — never the full suite mid-task. The full backend suite is run once, in the final task.

---

### Task 1: Extract chapters mixin (`wikigg_chapters.py`)

**Files:**
- Create: `backend/app/scrapers/wikigg_chapters.py`
- Modify: `backend/app/scrapers/wikigg.py` (remove lines 407-558: `_extract_dlc_image_url`, `scrape_dlcs_from_wiki`, `scrape_chapter_images`)
- Test: `backend/tests/unit/test_chapter_scraper.py` (existing, must still pass unmodified)

**Interfaces:**
- Produces: `WikiGGChaptersMixin` class with methods `_extract_dlc_image_url(self, node: Tag) -> str | None`, `scrape_dlcs_from_wiki(self) -> list[dict[str, Any]]`, `scrape_chapter_images(self) -> list["ChapterImageData"]`. These are the exact same signatures already in `wikigg.py` — do not change them.
- Consumes (from `wikigg.py`, which this mixin will be composed with later in Task 8): `self.fetch_page_html`, `self.BASE_DOMAIN`, module-level `parse_date_and_year`.

This is the first extraction because `WikiGGCharactersMixin` (Task 2) calls `self.scrape_dlcs_from_wiki()` — that cross-mixin call only resolves once both mixins are composed into `WikiGGScraperDriver` in Task 8, so extracting chapters first (with no dependency on characters) keeps each task's own test run meaningful before composition happens.

- [ ] **Step 1: Read the exact current method bodies**

Read `backend/app/scrapers/wikigg.py` lines 1-43 (imports and module docstring area) and lines 407-558 (the three methods to move) in full, so you copy them verbatim.

- [ ] **Step 2: Create the new mixin file**

Create `backend/app/scrapers/wikigg_chapters.py`. Structure:

```python
# backend/app/scrapers/wikigg_chapters.py
from __future__ import annotations

from typing import Any
from bs4 import BeautifulSoup, Tag

from app.scrapers.types import ChapterImageData
from app.scrapers.utils import extract_high_res_url, sanitize_filename
from app.scrapers.wikigg import parse_date_and_year


class WikiGGChaptersMixin:
    """DLC/chapter banner-image scraping, mixed into WikiGGScraperDriver."""

    def _extract_dlc_image_url(self, node: Tag) -> str | None:
        # paste the exact body of wikigg.py's _extract_dlc_image_url here, unchanged

    def scrape_dlcs_from_wiki(self) -> list[dict[str, Any]]:
        # paste the exact body of wikigg.py's scrape_dlcs_from_wiki here, unchanged

    def scrape_chapter_images(self) -> list["ChapterImageData"]:
        # paste the exact body of wikigg.py's scrape_chapter_images here, unchanged
```

Import `parse_date_and_year` from `app.scrapers.wikigg` (it stays there as a module-level helper — this creates one import edge from the new mixin back to `wikigg.py`, which is fine since `wikigg.py` will import this mixin class, not the other way around at class-definition time; the function import itself has no circular-import problem since it does not import anything from `wikigg_chapters.py`). Double-check the exact set of names the three methods reference (BeautifulSoup, Tag, ChapterImageData, extract_high_res_url, sanitize_filename, parse_date_and_year, self.fetch_page_html, self.BASE_DOMAIN) against what you actually pasted — add or drop imports to match reality, not this list, if they differ.

- [ ] **Step 3: Remove the moved methods from wikigg.py**

Delete lines 407-558 from `backend/app/scrapers/wikigg.py` (the three methods you just moved). Leave everything else in the file untouched for now — `WikiGGScraperDriver` will temporarily be missing these three methods until Task 8 composes the mixins back in; this is expected and fine because Task 1 through Task 7 each verify only their own extracted mixin's tests, not the full `WikiGGScraperDriver` class.

- [ ] **Step 4: Verify the extracted mixin in isolation**

Run: `cd backend && python -m pytest tests/unit/test_chapter_scraper.py -v`

This test file imports `from app.scrapers.wikigg import WikiGGScraperDriver` and calls `driver._extract_dlc_image_url(...)` on an instance. Since `WikiGGScraperDriver` no longer has this method after Step 3, this test is EXPECTED TO FAIL right now with an `AttributeError`. That failure is the correct, temporary state confirming the method really moved out cleanly — do not treat it as a bug to fix in this task. Instead, confirm the failure message specifically names the missing attribute (e.g. `'WikiGGScraperDriver' object has no attribute '_extract_dlc_image_url'`), which proves the method is gone from the old location. Then write a temporary standalone check instead:

```bash
python -c "
from app.scrapers.wikigg_chapters import WikiGGChaptersMixin
assert hasattr(WikiGGChaptersMixin, '_extract_dlc_image_url')
assert hasattr(WikiGGChaptersMixin, 'scrape_dlcs_from_wiki')
assert hasattr(WikiGGChaptersMixin, 'scrape_chapter_images')
print('OK: all three methods present on WikiGGChaptersMixin')
"
```

Run this from `backend/`. Expected: `OK: all three methods present on WikiGGChaptersMixin`, no import errors.

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/wikigg_chapters.py backend/app/scrapers/wikigg.py
git commit -m "refactor: extract chapters mixin from wikigg.py"
```

---

### Task 2: Extract characters mixin (`wikigg_characters.py`)

**Files:**
- Create: `backend/app/scrapers/wikigg_characters.py`
- Modify: `backend/app/scrapers/wikigg.py` (remove lines 298-406 and 559-871: `scrape_roster_from_page`, `enrich_characters_from_pages`, `scrape_characters_dynamically` — note these are two separate ranges since `_extract_dlc_image_url`/`scrape_dlcs_from_wiki`/`scrape_chapter_images` from Task 1 originally sat between them; after Task 1's removal, re-check the current line numbers with `grep -n "^    def " backend/app/scrapers/wikigg.py` before deleting, since Task 1 already shifted everything after line 406 up by roughly 152 lines)
- Test: none can pass standalone yet (see Step 4) — full verification happens in Task 8

**Interfaces:**
- Produces: `WikiGGCharactersMixin` class with methods `scrape_roster_from_page(self, page_title: str, role: str) -> list[CharacterData]`, `enrich_characters_from_pages(self, characters: list[CharacterData]) -> None`, `scrape_characters_dynamically(self) -> list[CharacterData]`.
- Consumes: `self.fetch_page_html`, `self.BASE_DOMAIN`, `self.API_URL`, `self.scrape_dlcs_from_wiki` (from `WikiGGChaptersMixin`, Task 1 — only resolves once both mixins are composed in Task 8), module-level `PORTRAIT_PATTERN`, `parse_date_and_year`, `clean_chapter_title` (all stay in `wikigg.py`).

- [ ] **Step 1: Re-find the current line numbers**

Run: `cd backend && grep -n "^    def \|^class " app/scrapers/wikigg.py`

Use this fresh output to find the current start/end lines of `scrape_roster_from_page`, `enrich_characters_from_pages`, and `scrape_characters_dynamically` — Task 1's deletion shifted every line number after its removed range. Read the full body of each of these three methods before moving them.

- [ ] **Step 2: Create the new mixin file**

Create `backend/app/scrapers/wikigg_characters.py`:

```python
# backend/app/scrapers/wikigg_characters.py
from __future__ import annotations

import asyncio
import re
import unicodedata
from collections import defaultdict
from typing import Any
from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from app.core.json_provider import safe_json_dumps
from app.scrapers.types import CharacterData, KillerPowerData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    sanitize_filename,
)
from app.scrapers.wikigg import PORTRAIT_PATTERN, clean_chapter_title, logger


class WikiGGCharactersMixin:
    """Character roster scraping and page enrichment, mixed into WikiGGScraperDriver."""

    def scrape_roster_from_page(self, page_title: str, role: str) -> list[CharacterData]:
        # paste the exact body here, unchanged

    def enrich_characters_from_pages(self, characters: list[CharacterData]) -> None:
        # paste the exact body here, unchanged -- includes the call to
        # self.scrape_dlcs_from_wiki(), which only resolves after Task 8

    def scrape_characters_dynamically(self) -> list[CharacterData]:
        # paste the exact body here, unchanged
```

Reconcile the import list against what the three pasted bodies actually reference (check for `parse_date_and_year` too — confirm whether `enrich_characters_from_pages` uses it directly; if so add it to the `from app.scrapers.wikigg import (...)` line). `logger` is `wikigg.py`'s module-level `logging.getLogger(__name__)` — importing it here means log lines from this mixin's code are attributed to the `app.scrapers.wikigg` logger name, matching current behavior exactly (do not create a new `logger = logging.getLogger(__name__)` in this file, which would attribute logs to `app.scrapers.wikigg_characters` instead and change observable behavior).

- [ ] **Step 3: Remove the moved methods from wikigg.py**

Delete the two ranges identified in Step 1 from `backend/app/scrapers/wikigg.py`.

- [ ] **Step 4: Verify the extracted mixin's syntax and imports**

Run this from `backend/`:

```bash
python -c "
from app.scrapers.wikigg_characters import WikiGGCharactersMixin
assert hasattr(WikiGGCharactersMixin, 'scrape_roster_from_page')
assert hasattr(WikiGGCharactersMixin, 'enrich_characters_from_pages')
assert hasattr(WikiGGCharactersMixin, 'scrape_characters_dynamically')
print('OK: all three methods present on WikiGGCharactersMixin')
"
```

Expected: prints OK, no `ImportError`/`SyntaxError`. This only proves the file parses and imports cleanly — it cannot prove behavior yet, since `self.scrape_dlcs_from_wiki` does not exist until Task 8 composes the mixins. That is expected.

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/wikigg_characters.py backend/app/scrapers/wikigg.py
git commit -m "refactor: extract characters mixin from wikigg.py"
```

---

### Task 3: Extract perks mixin (`wikigg_perks.py`)

**Files:**
- Create: `backend/app/scrapers/wikigg_perks.py`
- Modify: `backend/app/scrapers/wikigg.py` (remove `parse_perks` — re-find its current line range with `grep -n "^    def " app/scrapers/wikigg.py` first, since Tasks 1-2 shifted line numbers)
- Test: none can pass standalone yet — this method is called externally by `app/services/scraper_service.py` and by `tests/unit/scrapers/test_character_scraper.py`, both of which import `WikiGGScraperDriver` from `app.scrapers.wikigg`, so they will fail the same expected, temporary way as Task 2 until Task 8

**Interfaces:**
- Produces: `WikiGGPerksMixin` class with method `parse_perks(self, html_content: str, characters: list[CharacterData]) -> list[PerkData]`.
- Consumes: `self.BASE_DOMAIN`.

- [ ] **Step 1: Re-find the current line range and read the method**

Run: `cd backend && grep -n "^    def " app/scrapers/wikigg.py` and read the full `parse_perks` body.

- [ ] **Step 2: Create the new mixin file**

Create `backend/app/scrapers/wikigg_perks.py`:

```python
# backend/app/scrapers/wikigg_perks.py
from __future__ import annotations

import re
from bs4 import BeautifulSoup

from app.scrapers.constants import GENERIC_PERK_CANONICAL_MAP
from app.scrapers.types import CharacterData, PerkData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    normalize_name_key,
    sanitize_filename,
)


class WikiGGPerksMixin:
    """Perk scraping, mixed into WikiGGScraperDriver."""

    def parse_perks(self, html_content: str, characters: list[CharacterData]) -> list[PerkData]:
        # paste the exact body here, unchanged
```

Reconcile imports against the actual pasted body.

- [ ] **Step 3: Remove the moved method from wikigg.py**

Delete `parse_perks` from `backend/app/scrapers/wikigg.py`.

- [ ] **Step 4: Verify the extracted mixin's syntax and imports**

```bash
cd backend && python -c "
from app.scrapers.wikigg_perks import WikiGGPerksMixin
assert hasattr(WikiGGPerksMixin, 'parse_perks')
print('OK: parse_perks present on WikiGGPerksMixin')
"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/wikigg_perks.py backend/app/scrapers/wikigg.py
git commit -m "refactor: extract perks mixin from wikigg.py"
```

---

### Task 4: Extract items mixin (`wikigg_items.py`)

**Files:**
- Create: `backend/app/scrapers/wikigg_items.py`
- Modify: `backend/app/scrapers/wikigg.py` (remove `parse_wiki_items` — re-find its current line range first)
- Test: none can pass standalone yet — same temporary-failure situation as Task 2/3

**Interfaces:**
- Produces: `WikiGGItemsMixin` class with method `parse_wiki_items(self, html_content: str) -> list[ItemData]`.
- Consumes: `self.BASE_DOMAIN`, module-level `extract_rarity_from_elements` (stays in `wikigg.py`).

- [ ] **Step 1: Re-find the current line range and read the method**

Run: `cd backend && grep -n "^    def " app/scrapers/wikigg.py` and read the full `parse_wiki_items` body.

- [ ] **Step 2: Create the new mixin file**

Create `backend/app/scrapers/wikigg_items.py`:

```python
# backend/app/scrapers/wikigg_items.py
from __future__ import annotations

from bs4 import BeautifulSoup

from app.scrapers.types import ItemData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import extract_rarity_from_elements


class WikiGGItemsMixin:
    """Item scraping, mixed into WikiGGScraperDriver."""

    def parse_wiki_items(self, html_content: str) -> list[ItemData]:
        # paste the exact body here, unchanged
```

Reconcile imports against the actual pasted body.

- [ ] **Step 3: Remove the moved method from wikigg.py**

Delete `parse_wiki_items` from `backend/app/scrapers/wikigg.py`.

- [ ] **Step 4: Verify the extracted mixin's syntax and imports**

```bash
cd backend && python -c "
from app.scrapers.wikigg_items import WikiGGItemsMixin
assert hasattr(WikiGGItemsMixin, 'parse_wiki_items')
print('OK: parse_wiki_items present on WikiGGItemsMixin')
"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/wikigg_items.py backend/app/scrapers/wikigg.py
git commit -m "refactor: extract items mixin from wikigg.py"
```

---

### Task 5: Extract addons mixin (`wikigg_addons.py`)

**Files:**
- Create: `backend/app/scrapers/wikigg_addons.py`
- Modify: `backend/app/scrapers/wikigg.py` (remove `canonicalise_addons`, `parse_wiki_addons`, `collect_addon_rows`, `scrape_addons_from_character_page`, `collect_character_addon_rows` — re-find current line ranges first)
- Test: none can pass standalone yet

**Interfaces:**
- Produces: `WikiGGAddonsMixin` class with methods `canonicalise_addons(raw_addons: list[dict]) -> list[AddonData]` (a `@staticmethod` — this decorator is load-bearing, see Global Constraints), `parse_wiki_addons(self, html_content: str, characters: list[CharacterData] | None = None) -> list[AddonData]`, `collect_addon_rows(self, html_content: str, characters: list[CharacterData] | None = None) -> list[dict]`, `scrape_addons_from_character_page(self, char: CharacterData) -> list[AddonData]`, `collect_character_addon_rows(self, char: CharacterData) -> list[dict]`.
- Consumes: `self.BASE_DOMAIN`, `self.fetch_page_html`, module-level `extract_rarity_from_elements` (stays in `wikigg.py`). Internally, `parse_wiki_addons` and the other instance methods likely call `self.collect_addon_rows`/`self.collect_character_addon_rows`/`self.canonicalise_addons` on each other — since all five stay together in this one mixin, those calls resolve immediately with no cross-mixin dependency.

- [ ] **Step 1: Re-find the current line ranges and read all five methods**

Run: `cd backend && grep -n "^    def \|@staticmethod" app/scrapers/wikigg.py` and read the full body of all five methods, plus the `@staticmethod` decorator line immediately above `canonicalise_addons`.

- [ ] **Step 2: Create the new mixin file**

Create `backend/app/scrapers/wikigg_addons.py`:

```python
# backend/app/scrapers/wikigg_addons.py
from __future__ import annotations

import re
from collections import defaultdict
from bs4 import BeautifulSoup

from app.scrapers.constants import KNOWN_KILLER_POWER_ALIASES
from app.scrapers.types import AddonData, CharacterData
from app.scrapers.utils import (
    extract_cell_markdown_text,
    extract_high_res_url,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import extract_rarity_from_elements


class WikiGGAddonsMixin:
    """Add-on scraping and canonicalisation, mixed into WikiGGScraperDriver."""

    @staticmethod
    def canonicalise_addons(raw_addons: list[dict]) -> list[AddonData]:
        # paste the exact body here, unchanged -- keep the @staticmethod decorator

    def parse_wiki_addons(self, html_content: str, characters: list[CharacterData] | None = None) -> list[AddonData]:
        # paste the exact body here, unchanged

    def collect_addon_rows(self, html_content: str, characters: list[CharacterData] | None = None) -> list[dict]:
        # paste the exact body here, unchanged

    def scrape_addons_from_character_page(self, char: CharacterData) -> list[AddonData]:
        # paste the exact body here, unchanged

    def collect_character_addon_rows(self, char: CharacterData) -> list[dict]:
        # paste the exact body here, unchanged
```

Keep the five methods in this exact order (matching their original order in `wikigg.py`) so any internal `self.`-based calls between them read the same way they did before. Reconcile imports against what you actually pasted.

- [ ] **Step 3: Remove the moved methods from wikigg.py**

Delete all five methods (and the `@staticmethod` decorator line) from `backend/app/scrapers/wikigg.py`.

- [ ] **Step 4: Verify the extracted mixin's syntax and imports, and the staticmethod contract**

```bash
cd backend && python -c "
from app.scrapers.wikigg_addons import WikiGGAddonsMixin
assert hasattr(WikiGGAddonsMixin, 'canonicalise_addons')
assert hasattr(WikiGGAddonsMixin, 'parse_wiki_addons')
assert hasattr(WikiGGAddonsMixin, 'collect_addon_rows')
assert hasattr(WikiGGAddonsMixin, 'scrape_addons_from_character_page')
assert hasattr(WikiGGAddonsMixin, 'collect_character_addon_rows')
result = WikiGGAddonsMixin.canonicalise_addons([])
assert result == [], f'expected empty list for empty input, got {result!r}'
print('OK: all five methods present, canonicalise_addons callable at class level')
"
```

The `canonicalise_addons([])` call is the important check here: it proves the method is still callable directly on the class (`WikiGGAddonsMixin.canonicalise_addons(...)`, not requiring an instance) exactly the way `tests/unit/scrapers/test_addon_canonicalisation.py` calls `WikiGGScraperDriver.canonicalise_addons(...)` today — confirming the `@staticmethod` decorator survived the move correctly.

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/wikigg_addons.py backend/app/scrapers/wikigg.py
git commit -m "refactor: extract addons mixin from wikigg.py"
```

---

### Task 6: Extract offerings mixin (`wikigg_offerings.py`)

**Files:**
- Create: `backend/app/scrapers/wikigg_offerings.py`
- Modify: `backend/app/scrapers/wikigg.py` (remove `parse_wiki_offerings`, `scrape_offerings` — re-find current line ranges first)
- Test: none can pass standalone yet

**Interfaces:**
- Produces: `WikiGGOfferingsMixin` class with methods `parse_wiki_offerings(self, html_content: str) -> list[OfferingData]`, `scrape_offerings(self) -> list[OfferingData]`.
- Consumes: `self.BASE_DOMAIN`, `self.fetch_page_html`, module-level `extract_rarity_from_elements` (stays in `wikigg.py`). `scrape_offerings` calls `self.parse_wiki_offerings` internally — both methods stay in this one mixin so that call resolves immediately.

- [ ] **Step 1: Re-find the current line ranges and read both methods**

Run: `cd backend && grep -n "^    def " app/scrapers/wikigg.py` and read the full body of both methods.

- [ ] **Step 2: Create the new mixin file**

Create `backend/app/scrapers/wikigg_offerings.py`:

```python
# backend/app/scrapers/wikigg_offerings.py
from __future__ import annotations

from bs4 import BeautifulSoup

from app.scrapers.types import OfferingData
from app.scrapers.utils import (
    clean_description_text,
    extract_high_res_url,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import extract_rarity_from_elements, logger


class WikiGGOfferingsMixin:
    """Offering scraping, mixed into WikiGGScraperDriver."""

    def parse_wiki_offerings(self, html_content: str) -> list[OfferingData]:
        # paste the exact body here, unchanged

    def scrape_offerings(self) -> list[OfferingData]:
        # paste the exact body here, unchanged
```

Keep the two methods in this order so `scrape_offerings`'s internal call to `self.parse_wiki_offerings` reads naturally. Reconcile imports against what you actually pasted; keep using `wikigg.py`'s `logger` (see Task 2's note on why, if `scrape_offerings` logs anything).

- [ ] **Step 3: Remove the moved methods from wikigg.py**

Delete both methods from `backend/app/scrapers/wikigg.py`.

- [ ] **Step 4: Verify the extracted mixin's syntax and imports**

```bash
cd backend && python -c "
from app.scrapers.wikigg_offerings import WikiGGOfferingsMixin
assert hasattr(WikiGGOfferingsMixin, 'parse_wiki_offerings')
assert hasattr(WikiGGOfferingsMixin, 'scrape_offerings')
print('OK: both methods present on WikiGGOfferingsMixin')
"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/wikigg_offerings.py backend/app/scrapers/wikigg.py
git commit -m "refactor: extract offerings mixin from wikigg.py"
```

---

### Task 7: Extract realms mixin (`wikigg_realms.py`)

**Files:**
- Create: `backend/app/scrapers/wikigg_realms.py`
- Modify: `backend/app/scrapers/wikigg.py` (remove `scrape_realm_images` plus the two class-level attributes computed just above it, `CANONICAL_REALM_NAMES` and `REALM_NAME_ALIASES` — re-find current line ranges first)
- Test: none can pass standalone yet — `scrape_realm_images` is called by `app/services/scraper/pipeline.py` in production, so this is the highest-stakes extraction in the set; Task 8's full pipeline dry run is what actually proves it

**Interfaces:**
- Produces: `WikiGGRealmsMixin` class with class-level attributes `CANONICAL_REALM_NAMES` and `REALM_NAME_ALIASES` (computed from `FOLDER_REALM_MAP`/`OTHER_MAP_REALM_OVERRIDES` at class-body evaluation time — copy the exact computation, do not just copy the resulting values), and method `scrape_realm_images(self) -> list[RealmImageData]`.
- Consumes: `self.fetch_page_html`, `self.BASE_DOMAIN`, `self.CANONICAL_REALM_NAMES`, `self.REALM_NAME_ALIASES` (both defined in this same mixin, so these resolve immediately with no cross-mixin dependency).

- [ ] **Step 1: Re-find the current line range and read the attributes plus the method**

Run: `cd backend && grep -n "^    def \|^    CANONICAL_REALM_NAMES\|^    REALM_NAME_ALIASES" app/scrapers/wikigg.py` and read the full block: the two class-attribute computations immediately followed by `scrape_realm_images`.

- [ ] **Step 2: Create the new mixin file**

Create `backend/app/scrapers/wikigg_realms.py`:

```python
# backend/app/scrapers/wikigg_realms.py
from __future__ import annotations

from bs4 import BeautifulSoup

from app.scrapers.maps import FOLDER_REALM_MAP, OTHER_MAP_REALM_OVERRIDES
from app.scrapers.types import RealmImageData
from app.scrapers.utils import extract_high_res_url, normalize_name_key, sanitize_filename
from app.scrapers.wikigg import logger


class WikiGGRealmsMixin:
    """Realm banner-image scraping, mixed into WikiGGScraperDriver."""

    # paste the exact CANONICAL_REALM_NAMES computation here, unchanged
    # paste the exact REALM_NAME_ALIASES computation here, unchanged

    def scrape_realm_images(self) -> list[RealmImageData]:
        # paste the exact body here, unchanged
```

Reconcile imports against what you actually pasted.

- [ ] **Step 3: Remove the moved attributes and method from wikigg.py**

Delete the two class attributes and `scrape_realm_images` from `backend/app/scrapers/wikigg.py`.

- [ ] **Step 4: Verify the extracted mixin's syntax, imports, and class attributes**

```bash
cd backend && python -c "
from app.scrapers.wikigg_realms import WikiGGRealmsMixin
assert hasattr(WikiGGRealmsMixin, 'scrape_realm_images')
assert hasattr(WikiGGRealmsMixin, 'CANONICAL_REALM_NAMES')
assert hasattr(WikiGGRealmsMixin, 'REALM_NAME_ALIASES')
assert len(WikiGGRealmsMixin.CANONICAL_REALM_NAMES) > 0
print('OK: scrape_realm_images and both class attributes present on WikiGGRealmsMixin')
"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/scrapers/wikigg_realms.py backend/app/scrapers/wikigg.py
git commit -m "refactor: extract realms mixin from wikigg.py"
```

---

### Task 8: Compose the mixins, remove one more dead function, verify the whole thing

**Files:**
- Modify: `backend/app/scrapers/wikigg.py`

**Interfaces:**
- Produces: `WikiGGScraperDriver` composed from all 7 mixins plus its own remaining body, with the exact same public API it had before Task 1 (every method that any external caller or test uses, unchanged).
- Consumes: everything produced by Tasks 1-7.

- [ ] **Step 1: Read the current state of wikigg.py in full**

After Tasks 1-7, `wikigg.py` should contain only: the module-level helper functions (`extract_icon_token`, `parse_date_and_year`, `clean_chapter_title`, `extract_rarity_from_elements`, `normalize_rarity_name`), and a much-shrunk `WikiGGScraperDriver` class with `__init__`, `fetch_page_html`, `fetch_lang_page_html`, `scrape_translations`, `scrape_all`. Read the full file to confirm this is what remains.

- [ ] **Step 2: Remove the dead `extract_icon_token` module-level function**

`extract_icon_token` (defined near the top of `wikigg.py`) is never called anywhere in `wikigg.py` itself, and every real caller elsewhere in the backend (the per-locale drivers in `app/scrapers/drivers/`) already imports their own copy from `app.scrapers.drivers.base`, not from here. Confirm this with:

```bash
cd backend && grep -rn "extract_icon_token" --include="*.py" . | grep -v __pycache__
```

Expected: the only match inside `wikigg.py` is the function's own definition line — no call sites anywhere, in this file or any other, reference `app.scrapers.wikigg.extract_icon_token`. If that holds, delete the function definition. If you find any call site referencing it (directly or via `from app.scrapers.wikigg import extract_icon_token`), stop and report `NEEDS_CONTEXT` instead of deleting it — do not guess.

- [ ] **Step 3: Import the 7 mixins and compose the class**

Add these imports near the top of `wikigg.py`, alongside the existing imports:

```python
from app.scrapers.wikigg_addons import WikiGGAddonsMixin
from app.scrapers.wikigg_chapters import WikiGGChaptersMixin
from app.scrapers.wikigg_characters import WikiGGCharactersMixin
from app.scrapers.wikigg_items import WikiGGItemsMixin
from app.scrapers.wikigg_offerings import WikiGGOfferingsMixin
from app.scrapers.wikigg_perks import WikiGGPerksMixin
from app.scrapers.wikigg_realms import WikiGGRealmsMixin
```

Change the class declaration from `class WikiGGScraperDriver:` to:

```python
class WikiGGScraperDriver(
    WikiGGCharactersMixin,
    WikiGGChaptersMixin,
    WikiGGPerksMixin,
    WikiGGItemsMixin,
    WikiGGAddonsMixin,
    WikiGGOfferingsMixin,
    WikiGGRealmsMixin,
):
```

`WikiGGCharactersMixin` is listed first because `enrich_characters_from_pages` (in that mixin) calls `self.scrape_dlcs_from_wiki()` (defined in `WikiGGChaptersMixin`) — Python's MRO resolves `self.scrape_dlcs_from_wiki` by walking the whole class hierarchy regardless of declared order, so this ordering is not required for correctness, but list them in this order anyway since it documents the one real cross-mixin dependency in the set.

Watch for a circular import: `wikigg_characters.py`, `wikigg_offerings.py`, and `wikigg_realms.py` each import `logger` (and `wikigg_chapters.py`/`wikigg_items.py`/`wikigg_addons.py` import helper functions) from `app.scrapers.wikigg` at their own module level, while `wikigg.py` now imports those mixin modules at ITS module level too. Python handles this because none of the mixin files import anything from `wikigg.py` that is defined AFTER `wikigg.py`'s own `from app.scrapers.wikigg_* import ...` lines — the module-level functions and `logger` the mixins need are defined earlier in `wikigg.py`, above where the mixin imports need to go. Place the 7 new `from app.scrapers.wikigg_* import ...` lines immediately before the `class WikiGGScraperDriver(...)` line (i.e., after all the module-level helper function definitions), not at the very top of the file, so this ordering holds. If Step 4 raises `ImportError: cannot import name ... from partially initialized module`, this ordering is the first thing to check.

- [ ] **Step 4: Run the full scraper test suite**

Run: `cd backend && python -m pytest tests/unit/scrapers tests/unit/test_chapter_scraper.py tests/unit/test_chapters.py -v`

Expected: every test that passed before Task 1 passes again now, with no `AttributeError`s and no import errors. This is the point where the temporary failures from Tasks 1-7's own verification steps must all resolve.

- [ ] **Step 5: Run the full backend test suite**

Run: `cd backend && python -m pytest tests/unit -q`

Expected: identical results to the pre-refactor baseline — the same pre-existing, unrelated failures in `tests/unit/test_phase4_services.py` (3 tests) and the flaky `tests/unit/api/test_bug_reports_and_profile_routes.py::TestMyBugReportsRoute::test_reports_ordered_newest_first` (passes in isolation, order-dependent), and nothing else. If any other test fails, that is a real regression from this refactor — stop and fix it before proceeding, do not adjust the test to match broken behavior.

- [ ] **Step 6: Run a real end-to-end scrape pipeline and diff against the recorded baseline**

Run this from the repository root (requires the `backend` Docker container running and rebuilt with this branch's code):

```bash
docker compose build backend
docker compose up -d --force-recreate backend
docker compose exec -T backend python -c "
from app import create_app
from app.core.config import Config
from app.services.scraper_service import ScraperService

app = create_app(Config)
with app.app_context():
    svc = ScraperService()
    result = svc.run_sync_pipeline(download_assets=False)
    print('POST-MIXIN-SPLIT PIPELINE RESULT:', result)
"
```

Expected: `characters_synced: 98, perks_synced: 321, total_items: 58, total_addons: 935, total_offerings: 112, realms_synced: 21, maps_synced: 58, chapters_synced: 69` — the exact same numbers recorded as this plan's pre-refactor baseline (see the branch's earlier dead-code-removal work in this same session). If any number differs, a mixin extraction changed real behavior somewhere — stop and find which mixin's moved code diverges from its original body before proceeding.

- [ ] **Step 7: Confirm the net line-count effect**

Run: `cd .. && git diff --stat 9a08c34..HEAD -- backend/app/scrapers/`

(Replace `9a08c34` with the actual commit hash of this branch's prior dead-code-removal commit if it differs.) Note the total insertions/deletions in your final report — this plan does not target a specific number, since the goal is one file with 7 clear responsibilities instead of one file with all of them, not a smaller total line count (splitting a class into mixins does not delete code, it relocates it; net lines may even increase slightly from added `# backend/app/scrapers/wikigg_X.py` headers and per-file imports). Do not describe this task as a "SLOC win" — it is a structural/maintainability change with a verified zero-behavior-change guarantee, which is the actual goal.

- [ ] **Step 8: Commit**

```bash
git add backend/app/scrapers/wikigg.py
git commit -m "refactor: compose WikiGGScraperDriver from its 7 extracted mixins"
```
