# Character Scraper — Portraits, Categories and Release Order: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make character discovery decide category, name and release order from the portrait image filename instead of from which wiki page a link happened to appear on — so killers stop being filed as survivors and stop wearing their power icons.

**Architecture:** One pure classifier (`classify_portrait`) turns an image URL into `(category, release_number)` or nothing. `scrape_characters_dynamically` keeps both index pages but filters every link through it, so page order no longer influences category. `release_number` is persisted and becomes the roster's ordering key, replacing the position heuristic Page streak uses today. A startup migration drops rows keyed on character names that no longer exist.

**Tech Stack:** Python 3.12, Flask, SQLite, BeautifulSoup, `unittest`.

**Spec:** `docs/superpowers/specs/2026-08-06-character-scraper-portraits-design.md`

## Global Constraints

- Branch: `fix/character-scraper-portraits`. All work commits there.
- **Backend gate:** containerised, source mounted (the image does not ship `tests/`), run from the repo root:
  `docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests`
  Baseline before this plan: **105 tests, OK**.
- **No test may reach the network.** Every scraper test feeds inline fixture HTML to a parsing function. Never call `fetch_html`, never call `run_sync_pipeline`, never trigger a real scrape from a test.
- Killer names carry no article: `The Trapper` → `name="Trapper"`, `real_name="The Trapper"`. Survivor names are never stripped.
- The portrait rule is `^(K|S)(\d+)_.*_Portrait` against the image **filename**, case-sensitive on the `K`/`S` prefix.
- Do not touch the frontend. Do not re-run a real scrape as part of a task — the controller does that once, manually, at the end.
- No new dependencies.
- Verified facts you may rely on (measured against the live wiki, do not re-derive): the Killers page yields 86 portrait links and the Survivors page 88; 85 titles appear on both pages; all 40 killers currently in the Page streak roster are matched by the portrait rule.

---

### Task 1: The portrait classifier

**Files:**
- Modify: `backend/app/services/scraper_service.py`
- Test: `backend/tests/test_character_scraper.py` (new)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ScraperService.classify_portrait(image_url: str) -> Optional[Tuple[str, int]]` — `("Killer", 1)` for `K01_TheTrapper_Portrait.png`, `("Survivor", 7)` for `S07_AceVisconti_Portrait.png`, `None` for anything that is not a portrait.
  - `ScraperService.normalise_character_name(title: str, category: str) -> str` — strips a single leading `The ` for killers only.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_character_scraper.py`:

```python
import unittest
from app.services.scraper_service import ScraperService


class TestClassifyPortrait(unittest.TestCase):
    def test_killer_portrait_yields_category_and_number(self):
        self.assertEqual(
            ScraperService.classify_portrait(
                "https://static.wikia.nocookie.net/x/images/8/81/K01_TheTrapper_Portrait.png/revision/latest"
            ),
            ("Killer", 1),
        )

    def test_survivor_portrait_yields_category_and_number(self):
        self.assertEqual(
            ScraperService.classify_portrait(
                "https://static.wikia.nocookie.net/x/images/a/a1/S07_AceVisconti_Portrait.png"
            ),
            ("Survivor", 7),
        )

    def test_double_digit_release_number(self):
        self.assertEqual(
            ScraperService.classify_portrait("https://x/images/c/c9/K23_TheTrickster_Portrait.png"),
            ("Killer", 23),
        )

    def test_power_icon_is_not_a_portrait(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/0/0f/IconPowers_trap.png"))

    def test_item_icon_is_not_a_portrait(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/1/1a/IconItems_flashlight.png"))

    def test_portrait_without_role_prefix_is_rejected(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/2/2b/Entity_Portrait.png"))

    def test_lowercase_prefix_is_rejected(self):
        self.assertIsNone(ScraperService.classify_portrait("https://x/images/2/2b/k01_TheTrapper_Portrait.png"))

    def test_empty_url(self):
        self.assertIsNone(ScraperService.classify_portrait(""))


class TestNormaliseCharacterName(unittest.TestCase):
    def test_killer_loses_the_article(self):
        self.assertEqual(ScraperService.normalise_character_name("The Trapper", "Killer"), "Trapper")

    def test_killer_with_multiword_title(self):
        self.assertEqual(ScraperService.normalise_character_name("The Ghost Face", "Killer"), "Ghost Face")

    def test_killer_without_article_is_untouched(self):
        self.assertEqual(ScraperService.normalise_character_name("Xenomorph", "Killer"), "Xenomorph")

    def test_only_the_leading_article_is_stripped(self):
        self.assertEqual(ScraperService.normalise_character_name("The Unknown", "Killer"), "Unknown")

    def test_survivor_name_is_never_stripped(self):
        self.assertEqual(ScraperService.normalise_character_name("The Man", "Survivor"), "The Man")

    def test_whitespace_is_trimmed(self):
        self.assertEqual(ScraperService.normalise_character_name("  The Nurse  ", "Killer"), "Nurse")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

Run from the repo root:

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper -v
```

Expected: FAIL — `AttributeError: type object 'ScraperService' has no attribute 'classify_portrait'`.

- [ ] **Step 3: Implement both helpers**

In `backend/app/services/scraper_service.py`, add this module-level constant just below `logger = logging.getLogger(__name__)`:

```python
# Wiki portraits are named K01_TheTrapper_Portrait.png / S07_AceVisconti_Portrait.png.
# The prefix letter is the role and the digits are the release number, which makes the
# filename the only reliable way to tell a character from a power or an item.
PORTRAIT_PATTERN = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)

ROLE_BY_PREFIX = {"K": "Killer", "S": "Survivor"}
```

Then add these two static methods to `ScraperService`, immediately after `extract_slug_from_href`:

```python
    @staticmethod
    def classify_portrait(image_url: str):
        """Return (category, release_number) when the image is a character portrait.

        Anything else — power icons, item icons, wiki concept images — returns None,
        which is how powers stop being mistaken for characters.
        """
        if not image_url:
            return None

        filename = image_url.split("/revision")[0].rstrip("/").split("/")[-1]
        match = PORTRAIT_PATTERN.match(filename)
        if not match:
            return None

        category = ROLE_BY_PREFIX.get(match.group(1))
        if not category:
            return None

        try:
            release_number = int(match.group(2))
        except ValueError:
            return None

        return category, release_number

    @staticmethod
    def normalise_character_name(title: str, category: str) -> str:
        """Killers lose their leading article; survivors keep their name intact."""
        clean = (title or "").strip()
        if category == "Killer" and clean.startswith("The "):
            return clean[4:].strip()
        return clean
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper -v
```

Expected: PASS — 14 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/scraper_service.py backend/tests/test_character_scraper.py
git commit -m "feat(scraper): classify characters by portrait filename"
```

---

### Task 2: Rebuild character discovery around the classifier

**Files:**
- Modify: `backend/app/services/scraper_service.py` (`CharacterData`, `scrape_characters_dynamically`, and the now-dead `EXCLUDED_SLUGS`)
- Test: `backend/tests/test_character_scraper.py` (append)

**Interfaces:**
- Consumes: `classify_portrait`, `normalise_character_name` from Task 1.
- Produces:
  - `CharacterData` gains `release_number: int`.
  - `ScraperService.parse_character_page(html: str) -> List[CharacterData]` — a new pure function that does the parsing so it can be tested without the network.
  - `scrape_characters_dynamically()` keeps its signature and returns characters from both pages, deduplicated.

**Why a separate parse function:** the current logic is a closure inside `scrape_characters_dynamically`, reachable only by making two live HTTP requests. Extracting it is what makes this task testable at all.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_character_scraper.py`, above the `if __name__` block:

```python
KILLER_PAGE_HTML = """
<div class="mw-parser-output">
  <a href="/wiki/The_Trapper" title="The Trapper">
    <img data-src="https://x/images/8/81/K01_TheTrapper_Portrait.png/revision/latest"/>
  </a>
  <a href="/wiki/The_Wraith" title="The Wraith">
    <img data-src="https://x/images/9/92/K02_TheWraith_Portrait.png"/>
  </a>
  <a href="/wiki/Bear_Traps" title="Bear Traps">
    <img data-src="https://x/images/0/0f/IconPowers_trap.png"/>
  </a>
  <a href="/wiki/Ace_Visconti" title="Ace Visconti">
    <img data-src="https://x/images/a/a1/S07_AceVisconti_Portrait.png"/>
  </a>
  <a href="/wiki/Entity" title="Entity">
    <img data-src="https://x/images/2/2b/Entity_Portrait.png"/>
  </a>
  <a href="/wiki/Generator" title="Generator">no image here</a>
</div>
"""


class TestParseCharacterPage(unittest.TestCase):
    def setUp(self):
        self.service = ScraperService()
        self.characters = self.service.parse_character_page(KILLER_PAGE_HTML)
        self.by_name = {c.name: c for c in self.characters}

    def test_only_portraits_become_characters(self):
        self.assertEqual(sorted(self.by_name), ["Ace Visconti", "Trapper", "Wraith"])

    def test_power_link_is_dropped(self):
        self.assertNotIn("Bear Traps", self.by_name)

    def test_concept_portrait_without_role_prefix_is_dropped(self):
        self.assertNotIn("Entity", self.by_name)

    def test_killer_category_comes_from_the_filename_not_the_page(self):
        self.assertEqual(self.by_name["Trapper"].category, "Killer")

    def test_survivor_on_the_killer_page_is_still_a_survivor(self):
        self.assertEqual(self.by_name["Ace Visconti"].category, "Survivor")

    def test_release_number_is_captured(self):
        self.assertEqual(self.by_name["Trapper"].release_number, 1)
        self.assertEqual(self.by_name["Wraith"].release_number, 2)
        self.assertEqual(self.by_name["Ace Visconti"].release_number, 7)

    def test_real_name_keeps_the_wiki_title(self):
        self.assertEqual(self.by_name["Trapper"].real_name, "The Trapper")

    def test_avatar_path_follows_the_category(self):
        self.assertEqual(self.by_name["Trapper"].avatar_local_path, "avatars/killers/trapper.png")
        self.assertEqual(self.by_name["Ace Visconti"].avatar_local_path, "avatars/survivors/ace_visconti.png")

    def test_avatar_url_is_the_portrait(self):
        self.assertIn("K01_TheTrapper_Portrait", self.by_name["Trapper"].avatar_url)

    def test_duplicate_links_produce_one_character(self):
        doubled = self.service.parse_character_page(KILLER_PAGE_HTML + KILLER_PAGE_HTML)
        self.assertEqual(len([c for c in doubled if c.name == "Trapper"]), 1)

    def test_page_without_portraits_yields_nothing(self):
        html = '<div class="mw-parser-output"><a href="/wiki/Hatch" title="Hatch">' \
               '<img data-src="https://x/images/1/1a/IconHelp_hatch.png"/></a></div>'
        self.assertEqual(self.service.parse_character_page(html), [])
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper.TestParseCharacterPage -v
```

Expected: FAIL — `AttributeError: 'ScraperService' object has no attribute 'parse_character_page'`.

- [ ] **Step 3: Add the release number to the record**

In `backend/app/services/scraper_service.py`, extend the `CharacterData` dataclass:

```python
@dataclass
class CharacterData:
    name: str
    real_name: str
    wiki_slug: str
    short_name: str
    category: str
    avatar_url: str
    avatar_local_path: str
    release_number: int = 0
```

- [ ] **Step 4: Replace the discovery logic**

Replace the entire `scrape_characters_dynamically` method — from its `def` line through `return characters` — with:

```python
    def parse_character_page(self, html: str) -> List[CharacterData]:
        """Extract characters from a wiki index page.

        A link is a character only when its image is a portrait; the filename decides
        the category and release number, so it does not matter which index page the
        link was found on.
        """
        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: List[CharacterData] = []
        seen = set()

        for link in content.find_all("a", href=re.compile(r"^/wiki/")):
            img = link.find("img")
            if not img:
                continue

            image_url = self.extract_high_res_url(img)
            classified = self.classify_portrait(image_url)
            if not classified:
                continue

            category, release_number = classified

            title = (link.get("title") or "").strip() or link.get_text().strip()
            name = self.normalise_character_name(title, category)
            if not name:
                continue

            key = (category, name.lower())
            if key in seen:
                continue
            seen.add(key)

            slug = self.extract_slug_from_href(link.get("href", ""))
            sanitized = self.sanitize_filename(name)
            sub_dir = "survivors" if category == "Survivor" else "killers"

            characters.append(
                CharacterData(
                    name=name,
                    real_name=title,
                    wiki_slug=slug,
                    short_name=slug.lower(),
                    category=category,
                    avatar_url=image_url,
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=release_number,
                )
            )

        return characters

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        characters: List[CharacterData] = []
        seen = set()

        for url in (self.SURVIVORS_URL, self.KILLERS_URL):
            try:
                logger.info(f"Scraping character index: {url}")
                page_characters = self.parse_character_page(self.fetch_html(url))
            except Exception as e:
                logger.error(f"Error scraping {url}: {e}")
                continue

            if not page_characters:
                logger.error(f"No portraits found on {url} — wiki layout may have changed.")

            for character in page_characters:
                key = (character.category, character.name.lower())
                if key in seen:
                    continue
                seen.add(key)
                characters.append(character)

        characters.sort(key=lambda c: (c.category, c.release_number, c.name))
        return characters
```

Both index pages are still fetched because each carries portraits the other omits, and a failure on one page no longer aborts the other.

- [ ] **Step 5: Delete the dead exclusion list**

`EXCLUDED_SLUGS` was the old defence against powers and concepts; the portrait rule replaces it. Remove the whole `EXCLUDED_SLUGS = { ... }` class attribute. Then confirm nothing else references it:

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend grep -rn "EXCLUDED_SLUGS" app/ tests/
```

Expected: no output. If anything still references it, keep the attribute and report that in your notes instead of deleting.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper -v
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests
```

Expected: the new file passes 25 tests; the whole suite stays green.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/scraper_service.py backend/tests/test_character_scraper.py
git commit -m "feat(scraper): discover characters from portraits instead of page order"
```

---

### Task 3: Carry release_number through the data layer

**Files:**
- Modify: `backend/app/services/perk_service.py` (`CharacterModel`, and the perk→character name lookup)
- Modify: `backend/app/services/scraper_service.py` (`parse_perks` owner matching)
- Test: `backend/tests/test_character_scraper.py` (append)

**Interfaces:**
- Consumes: `CharacterData.release_number` from Task 2.
- Produces: `CharacterModel.release_number: Optional[int] = None`, so `/api/v1/characters` and every consumer can read it.

**Why the perk lookup needs touching:** perks are matched to characters by slug or by name. With killer names now stripped (`Trapper`), a perks-page owner cell whose link title reads `The Trapper` no longer matches by name. The slug still matches, but relying on that alone would silently send affected perks to `General`. Adding `real_name` to the lookup keeps both paths working.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_character_scraper.py`, above the `if __name__` block:

```python
class TestCharacterModelCarriesReleaseNumber(unittest.TestCase):
    def test_model_accepts_and_returns_release_number(self):
        from app.services.perk_service import CharacterModel

        model = CharacterModel(
            name="Trapper",
            real_name="The Trapper",
            category="Killer",
            avatar_local_path="avatars/killers/trapper.png",
            release_number=1,
        )
        self.assertEqual(model.model_dump()["release_number"], 1)

    def test_release_number_defaults_when_absent(self):
        from app.services.perk_service import CharacterModel

        model = CharacterModel(name="Meg Thomas", real_name="Meg Thomas", category="Survivor")
        self.assertIsNone(model.model_dump()["release_number"])


PERKS_HTML = """
<div class="mw-parser-output">
  <h2>Killer Perks</h2>
  <table class="wikitable">
    <tr><th>Icon</th><th>Name</th><th>Description</th><th>Character</th></tr>
    <tr>
      <td><img data-src="https://x/images/f/f1/IconPerks_agitation.png"/></td>
      <td>Agitation</td>
      <td>You get excited.</td>
      <td><a href="/wiki/The_Trapper" title="The Trapper">The Trapper</a></td>
    </tr>
  </table>
</div>
"""


class TestPerkOwnerMatching(unittest.TestCase):
    def test_perk_matches_a_killer_whose_name_lost_its_article(self):
        service = ScraperService()
        characters = service.parse_character_page(KILLER_PAGE_HTML)
        perks = service.parse_perks(PERKS_HTML, characters)

        agitation = next(p for p in perks if p.name == "Agitation")
        self.assertEqual(agitation.character, "Trapper")
        self.assertEqual(agitation.character_real_name, "The Trapper")
        self.assertEqual(agitation.character_avatar_path, "avatars/killers/trapper.png")
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper.TestCharacterModelCarriesReleaseNumber tests.test_character_scraper.TestPerkOwnerMatching -v
```

Expected: FAIL — `KeyError: 'release_number'` on the model test. (The perk test may already pass via the slug path; it is there to lock that behaviour in.)

- [ ] **Step 3: Add the field to the model**

In `backend/app/services/perk_service.py`, add one line to `CharacterModel`, after `avatar_local_path`:

```python
    release_number: Optional[int] = None
```

Change nothing else in that class.

- [ ] **Step 4: Match perk owners by real name too**

In `backend/app/services/scraper_service.py`, inside `parse_perks`, the lookups are currently built as:

```python
        char_by_slug = {c.wiki_slug.lower(): c for c in characters}
        char_by_name = {c.name.lower(): c for c in characters}
```

Replace those two lines with:

```python
        char_by_slug = {c.wiki_slug.lower(): c for c in characters if c.wiki_slug}
        char_by_name = {}
        for c in characters:
            # Killer names are stored without their article, but the perks page links
            # them by full title, so both spellings must resolve.
            for key in (c.name, c.real_name):
                if key:
                    char_by_name.setdefault(key.lower(), c)
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper -v
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests
```

Expected: both green.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/perk_service.py backend/app/services/scraper_service.py backend/tests/test_character_scraper.py
git commit -m "feat(scraper): carry release_number and match perk owners by full title"
```

---

### Task 4: Order the Page streak roster by release_number

**Files:**
- Modify: `backend/app/services/page_streak_service.py`
- Modify: `backend/app/services/perk_service.py` (remove `get_characters_in_scrape_order`)
- Test: `backend/tests/test_page_streak_service.py` (rewrite `TestPageStreakRosterOrder`)

**Interfaces:**
- Consumes: `PerkService.get_characters()` — which sorts alphabetically, but that no longer matters because ordering now comes from each record's `release_number` rather than from list position.
- Produces: `get_killers()` ordered by `release_number` ascending; killers without one after them, alphabetically.

**What this replaces:** `_character_positions` currently maps a killer to its index in the character list, preferring a `The <name>` entry. That heuristic existed only because release order was not in the data. It is deleted, along with the `get_characters_in_scrape_order` accessor added for it.

- [ ] **Step 1: Rewrite the ordering test**

In `backend/tests/test_page_streak_service.py`, replace the whole `OrderedFakePerkService` class and the whole `TestPageStreakRosterOrder` class with:

```python
class OrderedFakePerkService(FakePerkService):
    """Supplies character records carrying release numbers."""

    def __init__(self, perks, characters):
        super().__init__(perks)
        self._characters = characters

    def get_characters(self, category=None):
        if category is None:
            return list(self._characters)
        return [c for c in self._characters if c.get("category") == category]


class TestPageStreakRosterOrder(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_order.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()

        perks = []
        for killer in ["Wraith", "Trapper", "Nurse", "Animatronic"]:
            perks.extend(make_perks(2, character=killer))
        for i, perk in enumerate(perks, start=1):
            perk["name"] = f"Perk {i:03d}"

        # Deliberately out of order in the list, and Animatronic has no record at all.
        characters = [
            {"name": "Nurse", "category": "Killer", "release_number": 4},
            {"name": "Trapper", "category": "Killer", "release_number": 1},
            {"name": "Wraith", "category": "Killer", "release_number": 2},
            {"name": "Meg Thomas", "category": "Survivor", "release_number": 2},
        ]

        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=OrderedFakePerkService(perks, characters),
        )

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_killers_are_ordered_by_release_number(self):
        self.assertEqual(self.service.get_killers(), ["Trapper", "Wraith", "Nurse", "Animatronic"])

    def test_killer_without_a_release_number_is_kept_at_the_end(self):
        self.assertIn("Animatronic", self.service.get_killers())

    def test_roster_uses_the_same_order(self):
        self.assertEqual(
            [entry["killer"] for entry in self.service.get_roster()],
            ["Trapper", "Wraith", "Nurse", "Animatronic"],
        )

    def test_ordering_survives_a_perk_service_without_characters(self):
        service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(make_perks(3, character="Nurse")),
        )
        self.assertEqual(service.get_killers(), ["Nurse"])
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_page_streak_service.TestPageStreakRosterOrder -v
```

Expected: FAIL — the current implementation looks for `get_characters_in_scrape_order`, which `OrderedFakePerkService` no longer provides, so it falls back to alphabetical `['Animatronic', 'Nurse', 'Trapper', 'Wraith']`.

- [ ] **Step 3: Replace the ordering source**

In `backend/app/services/page_streak_service.py`, replace the whole `_character_positions` method with:

```python
    def _release_numbers(self):
        """Map a killer name to its release number, as scraped from the wiki portrait.

        Returns an empty map when the perk service cannot supply characters, in which
        case ordering falls back to alphabetical.
        """
        get_characters = getattr(self.perk_service, "get_characters", None)
        if not callable(get_characters):
            return {}
        try:
            characters = get_characters() or []
        except Exception:
            return {}

        numbers = {}
        for character in characters:
            name = (character or {}).get("name")
            release_number = (character or {}).get("release_number")
            if name and isinstance(release_number, int) and name not in numbers:
                numbers[name] = release_number
        return numbers
```

Then, in `get_killers`, replace the two lines that read

```python
        positions = self._character_positions()

        def sort_key(name):
            position = positions.get(f"The {name}", positions.get(name))
```

with

```python
        release_numbers = self._release_numbers()

        def sort_key(name):
            position = release_numbers.get(name)
```

Leave the rest of `sort_key` and the final `sorted(names, key=sort_key)` exactly as they are — unknown killers still sort last, alphabetically.

- [ ] **Step 4: Remove the accessor it replaced**

In `backend/app/services/perk_service.py`, delete the whole `get_characters_in_scrape_order` method. Then confirm nothing still calls it:

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend grep -rn "get_characters_in_scrape_order" app/ tests/
```

Expected: no output.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests
```

Expected: the whole suite green.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/page_streak_service.py backend/app/services/perk_service.py backend/tests/test_page_streak_service.py
git commit -m "feat(page-streak): order the roster by scraped release number"
```

---

### Task 5: Drop rows pinned to characters that no longer exist

**Files:**
- Modify: `backend/app/services/db_service.py`
- Test: `backend/tests/test_character_scraper.py` (append)

**Interfaces:**
- Consumes: the corrected character list.
- Produces: `DatabaseService.prune_stale_character_rows(valid_names: set) -> dict` — returns counts of what it deleted, e.g. `{"challenge_runs": 2, "page_streak_runs": 0}`.

**Why:** renaming characters (`The Clown` → `Clown`, and powers disappearing entirely) leaves rows keyed on names that no longer exist. The user chose to reset rather than migrate. One of the two live Gauntlet runs is pinned to "Blood Bond" — a power — so it is invalid regardless.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_character_scraper.py`, above the `if __name__` block:

```python
import os
from app.services.db_service import DatabaseService


class TestPruneStaleCharacterRows(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_prune_stale.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()

        conn = self.db_service.get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO challenge_runs (role, current_character_id, current_streak) VALUES (?, ?, ?);",
            ("killer", "Blood Bond", 3),
        )
        cur.execute(
            "INSERT INTO challenge_runs (role, current_character_id, current_streak) VALUES (?, ?, ?);",
            ("killer", "Trapper", 1),
        )
        cur.execute(
            "INSERT INTO page_streak_runs (killer, pages_json) VALUES (?, ?);",
            ("The Clown", "[]"),
        )
        conn.commit()
        conn.close()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def _count(self, table):
        conn = self.db_service.get_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) AS n FROM {table};")
        n = cur.fetchone()["n"]
        conn.close()
        return n

    def test_rows_with_unknown_characters_are_deleted(self):
        deleted = self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        self.assertEqual(deleted["challenge_runs"], 1)
        self.assertEqual(self._count("challenge_runs"), 1)

    def test_rows_with_known_characters_survive(self):
        self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        conn = self.db_service.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT current_character_id FROM challenge_runs;")
        remaining = [row["current_character_id"] for row in cur.fetchall()]
        conn.close()
        self.assertEqual(remaining, ["Trapper"])

    def test_page_streak_rows_are_pruned_too(self):
        deleted = self.db_service.prune_stale_character_rows({"Trapper", "Clown"})
        self.assertEqual(deleted["page_streak_runs"], 1)
        self.assertEqual(self._count("page_streak_runs"), 0)

    def test_an_empty_valid_set_is_ignored(self):
        deleted = self.db_service.prune_stale_character_rows(set())
        self.assertEqual(deleted, {})
        self.assertEqual(self._count("challenge_runs"), 2)
```

The last test matters: an empty character list means the scrape failed, and wiping every run in response to a failed scrape would be far worse than leaving stale rows.

- [ ] **Step 2: Run the test to verify it fails**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper.TestPruneStaleCharacterRows -v
```

Expected: FAIL — `AttributeError: 'DatabaseService' object has no attribute 'prune_stale_character_rows'`.

- [ ] **Step 3: Implement the prune**

Append this method to `DatabaseService` in `backend/app/services/db_service.py`:

```python
    def prune_stale_character_rows(self, valid_names):
        """Delete run rows pinned to characters that no longer exist.

        A renamed or removed character leaves rows that can never be resolved again.
        An empty valid_names means the character data failed to load — in that case do
        nothing, because deleting every run on a failed scrape would be catastrophic.
        """
        names = {str(n) for n in (valid_names or set())}
        if not names:
            return {}

        deleted = {}
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")

        for table, column in (("challenge_runs", "current_character_id"), ("page_streak_runs", "killer")):
            cursor.execute(f"SELECT id, {column} AS character_name FROM {table};")
            stale = [row["id"] for row in cursor.fetchall() if row["character_name"] not in names]
            if stale:
                placeholders = ",".join("?" for _ in stale)
                cursor.execute(f"DELETE FROM {table} WHERE id IN ({placeholders});", stale)
            deleted[table] = len(stale)

        conn.commit()
        conn.close()
        return deleted
```

`match_logs` and `page_streak_page_logs` both declare `ON DELETE CASCADE`, and the `PRAGMA foreign_keys = ON` above makes SQLite honour it, so their rows go with their parent.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest tests.test_character_scraper -v
docker compose run --rm --no-deps -v "D:/vhost/LemonDBD/backend:/app" backend python -m unittest discover -s tests
```

Expected: both green.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/db_service.py backend/tests/test_character_scraper.py
git commit -m "feat(db): prune run rows pinned to characters that no longer exist"
```

---

## Controller steps (not for subagents)

After Task 5, the controller performs the one live re-scrape and cleanup, because it touches the user's real data:

1. Rebuild the backend image and trigger `POST /api/v1/scrape`, waiting for `/api/v1/scrape/status` to report `is_running: false`.
2. Check `/api/v1/characters?category=Killer` — expect real killers, no powers.
3. Call `prune_stale_character_rows` once with the new character names.
4. Check the Page streak roster order and that avatars point at portraits.

## Done criteria

- Backend suite green (105 before, plus the new tests).
- `/api/v1/characters?category=Killer` lists killers, not powers.
- `avatars/killers/` holds portraits rather than power icons.
- The Page streak roster reads Trapper, Wraith, Hillbilly, Nurse, Shape, … from `release_number`.
- No frontend file changed.
