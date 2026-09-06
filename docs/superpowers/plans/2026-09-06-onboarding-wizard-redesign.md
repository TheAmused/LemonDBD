# Onboarding Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the character-ownership onboarding wizard (`/[locale]/welcome`, built in a prior plan on the parent branch) per direct user feedback: a real "Welcome to LemonDBD" intro card before the roster picker, chapters collapsed into an accordion (banner + single owned/not-owned switch) instead of one long always-expanded list, real chapter banner images sourced from wiki.gg instead of a flat grid, a legend using real character portraits (Ace Visconti, three ownership states) instead of icon-only swatches, and a far more visible Skip control.

**Architecture:** Backend gains a `Chapter` lookup table populated by extending the existing DLC scraper, mirroring the already-working `Realm`/`RealmImageData` banner-image pattern used by the Maps feature exactly (same additive-by-name-no-FK design, same pipeline wiring, same asset-download step). Frontend reuses `CharacterOwnershipOverlay` (no new icons -- literally the same component already used everywhere else) and borrows the accordion-expand pattern already implemented for realm cards in `MapExplorer.tsx`. A new small `Switch` component replaces the wizard's old two-button "I own / I don't own" chapter toggle.

**Tech Stack:** Flask + SQLAlchemy + Alembic (backend), Next.js 16 + React + TypeScript + Tailwind (frontend), `node:test` via `tsx` (frontend unit tests), `pytest` (backend unit tests). BeautifulSoup-based scraper already in place at `backend/app/scrapers/wikigg.py`.

**Spec:** This plan's spec is this document's Goal/Architecture/Global Constraints plus the conversation it came from (direct user feedback on the built `/welcome` wizard, including a wiki.gg screenshot of the desired chapter-banner grid style). No separate spec file exists.

## Global Constraints

- No `dict?: any` anywhere -- every new type must be concrete (project-wide rule, `CLAUDE.md`).
- No em dash (`—`) in any UI copy or dictionary string (project-wide rule, `CLAUDE.md`).
- Keep commits to a single line, no long explanatory bodies (user preference).
- **Do not invent new icons for character ownership state.** The locked/owned/partial visual must be the exact existing `CharacterOwnershipOverlay` component (`frontend/src/components/characters/CharacterOwnershipOverlay.tsx`), unchanged -- reused as-is, including in the redesigned legend (which must show real character portraits, not bare icon swatches).
- Chapter banner images must come from real wiki.gg data (scraped), never invented/guessed URLs, and must never render stretched/distorted (`object-fit: contain` or equivalent, not `cover` forced into a mismatched aspect box).
- Chapters render collapsed by default; a chapter's characters (and the ability to toggle individual perks) only become visible after the user expands that specific chapter.
- Each chapter row has exactly one boolean switch control for "I own this chapter" -- not two separate buttons.
- The wizard's first view after arriving at `/welcome` must be a short "Welcome to LemonDBD" explanation card (why we're asking: to match the site to your in-game progress by marking which chapters/characters/perks you own), with a single action to proceed into the chapter picker. The Skip control belongs to the chapter-picker view, not the intro card.
- Skip must be significantly more visually prominent than a small fixed-corner pill button.

---

### Task 1: Backend -- `Chapter` model + migration

**Files:**
- Create: `backend/app/models/chapter.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/migrations/versions/chapter_banners_001.py`
- Test: `backend/tests/unit/test_chapters.py` (new file)

**Interfaces:**
- Produces: `Chapter` model, table `chapters`, columns `id, name (unique, String(150)), banner_url (String(500), nullable), banner_local_path (String(255), nullable), created_at`. `to_dict(lang=None) -> dict` mirroring `Realm.to_dict` exactly (`backend/app/models/map.py:25` onward) but without a translations column (chapter names are already the canonical DLC names used as `Character.chapter_name` -- no separate translation table for this, unlike Realm).

- [ ] **Step 1: Read the precedent model**

Read `backend/app/models/map.py`'s `Realm` class (lines 11-24, plus its `to_dict` starting at line 25) in full before writing `Chapter` -- `Chapter` mirrors it minus the `translations` column.

- [ ] **Step 2: Write the model**

Create `backend/app/models/chapter.py`:

```python
# backend/app/models/chapter.py
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import utcnow


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "banner_url": self.banner_url,
            "banner_local_path": self.banner_local_path,
        }
```

- [ ] **Step 3: Register the model**

In `backend/app/models/__init__.py`, add `Chapter` to the import from `app.models.chapter` (new import line, alongside the existing `from app.models.map import ...` line) and add `"Chapter"` to `__all__` (alongside `"Realm"`).

- [ ] **Step 4: Write the migration**

First confirm the current true Alembic head: `grep -L . backend/migrations/versions/*.py` won't help here -- instead, for every file in `backend/migrations/versions/`, extract `revision =` and `down_revision =` and confirm exactly one file has no other file naming it as `down_revision` (the same check done for the parent branch's `onboarding_flag_001` migration). At the time this plan was written, the head was `onboarding_flag_001` -- **re-verify this yourself, don't trust that value blindly**, since this branch may have other migrations merged in by then.

Create `backend/migrations/versions/chapter_banners_001.py` (adjust `down_revision` to whatever you actually verified is head):

```python
# backend/migrations/versions/chapter_banners_001.py
"""add chapters table for DLC banner images

Revision ID: chapter_banners_001
Revises: onboarding_flag_001
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "chapter_banners_001"
down_revision = "onboarding_flag_001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "chapters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False, unique=True),
        sa.Column("banner_url", sa.String(length=500), nullable=True),
        sa.Column("banner_local_path", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("chapters")
```

- [ ] **Step 5: Write the failing test**

Create `backend/tests/unit/test_chapters.py`:

```python
# backend/tests/unit/test_chapters.py
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Chapter


def test_chapter_upsert_and_to_dict(db_session: Session) -> None:
    ch = Chapter(name="Test Chapter", banner_url="https://example.com/banner.png", banner_local_path="chapters/test_chapter.png")
    db_session.add(ch)
    db_session.flush()

    found = db_session.scalars(select(Chapter).where(Chapter.name == "Test Chapter")).first()
    assert found is not None
    d = found.to_dict()
    assert d == {
        "name": "Test Chapter",
        "banner_url": "https://example.com/banner.png",
        "banner_local_path": "chapters/test_chapter.png",
    }


def test_chapter_name_is_unique(db_session: Session) -> None:
    db_session.add(Chapter(name="Dup"))
    db_session.flush()
    db_session.add(Chapter(name="Dup"))
    import pytest
    from sqlalchemy.exc import IntegrityError
    with pytest.raises(IntegrityError):
        db_session.flush()
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/test_chapters.py -v`
Expected: PASS (2/2). Unit tests use `sqlite:///:memory:` + `db.create_all()`, which creates the new table directly from the model -- the migration is exercised only by the running dev container via `sync_db_schema.py`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/chapter.py backend/app/models/__init__.py backend/migrations/versions/chapter_banners_001.py backend/tests/unit/test_chapters.py
git commit -m "feat: add Chapter model for DLC banner images"
```

---

### Task 2: Backend -- scrape chapter banner images from wiki.gg

**Files:**
- Modify: `backend/app/scrapers/types.py`
- Modify: `backend/app/scrapers/wikigg.py`
- Test: `backend/tests/unit/test_chapter_scraper.py` (new file)

**Interfaces:**
- Produces: `ChapterImageData` dataclass (`name: str`, `banner_url: str`, `banner_local_path: str`); `WikiGGScraperDriver.scrape_chapter_images(self) -> list[ChapterImageData]`.
- Consumes: `WikiGGScraperDriver.scrape_dlcs_from_wiki` (already exists, `backend/app/scrapers/wikigg.py:406-521`) -- extended additively, not replaced. `extract_high_res_url` and `sanitize_filename` from `backend/app/scrapers/utils.py` (already exist, used by `scrape_realm_images`).

- [ ] **Step 1: Read the precedent scraper method in full**

Read `WikiGGScraperDriver.scrape_realm_images` (`backend/app/scrapers/wikigg.py:1599-1647`) in full -- this is the exact technique to reuse: find `<img>` tags on a wiki page, resolve each to a high-res URL via `extract_high_res_url`, match against a canonical name, emit a `*ImageData` record with a `{folder}/{slug}.png` local path.

Also read the existing `scrape_dlcs_from_wiki` (`backend/app/scrapers/wikigg.py:406-521`) in full -- both its two scraping branches (the `<table>` row branch around line 416, and the `<h3>/<h4>` heading-block branch around line 456) already iterate exactly the DOM regions that (per the user's own wiki.gg screenshot) contain a banner image alongside each DLC's name.

- [ ] **Step 2: Add the dataclass**

In `backend/app/scrapers/types.py`, add directly after the existing `RealmImageData` dataclass (found via `grep -n "class RealmImageData" backend/app/scrapers/types.py`):

```python
@dataclass
class ChapterImageData:
    name: str
    banner_url: str
    banner_local_path: str
```

- [ ] **Step 3: Write the failing test for image-URL extraction**

Create `backend/tests/unit/test_chapter_scraper.py`. This test does NOT hit the real network -- it feeds a small hand-written HTML fixture (modeled on the real wiki.gg table-row markup `scrape_dlcs_from_wiki` already parses) directly into the parsing logic, so it must be written against whatever function signature you land on in Step 4 (a pure function or a method you can call with a `BeautifulSoup`-parsed fragment, without going through `fetch_page_html`'s live HTTP call). Write the test AFTER Step 4's implementation exists so you know the exact entry point to call -- this is schema/scraper work where the parsing function's shape has to exist before a meaningful unit test can target it, same ordering rationale as the parent branch's Task 1. A reasonable shape: extract the row-level image-finding logic from `scrape_dlcs_from_wiki`'s table branch into a small pure helper (e.g. `_extract_dlc_image_url(tr_or_block, base_domain) -> str | None`) that both the real scraper and this test can call directly with a BeautifulSoup element, instead of only living inline inside the big method. Test with a minimal fixture like:

```python
from bs4 import BeautifulSoup
from app.scrapers.wikigg import WikiGGScraperDriver


def test_extracts_dlc_banner_image_from_table_row():
    html = '''
    <table class="wikitable">
      <tr>
        <td><a href="/wiki/The_Last_Breath">The Last Breath</a></td>
        <td><img src="/images/thumb/x/y/TheLastBreath_Banner.png/300px-TheLastBreath_Banner.png"></td>
      </tr>
    </table>
    '''
    tr = BeautifulSoup(html, "html.parser").find("tr")
    driver = WikiGGScraperDriver()
    url = driver._extract_dlc_image_url(tr)
    assert url is not None
    assert "TheLastBreath_Banner" in url
```

Adjust this test to match whichever exact helper name/shape you actually implement in Step 4 -- the point is a fast, network-free test of the image-extraction logic in isolation, not an end-to-end scrape.

- [ ] **Step 4: Implement the extraction**

Add a small private helper near `scrape_dlcs_from_wiki` in `backend/app/scrapers/wikigg.py`:

```python
def _extract_dlc_image_url(self, node) -> str | None:
    """Finds the nearest banner/key-art <img> within a DLC catalog row or
    heading-block, resolved to a high-res absolute URL. Returns None if the
    node has no image (frontend falls back to a plain text header)."""
    img_tag = node.find("img")
    if not img_tag:
        return None
    return extract_high_res_url(img_tag, self.BASE_DOMAIN) or None
```

Then call it from BOTH branches of `scrape_dlcs_from_wiki` (the `<tr>` loop and the `<h3>/<h4>` heading-block loop) and add the result to each appended dict under a new key `"dlc_image_url"` (e.g. `dlcs.append({..., "dlc_image_url": self._extract_dlc_image_url(tr)})` for the table branch, and the equivalent for the heading-block branch using whatever the block's root node variable is called there). This is additive -- existing callers of `scrape_dlcs_from_wiki` (e.g. `backend/app/scrapers/drivers/en.py:457`) read specific keys they already expect and are unaffected by one new key appearing in each dict.

- [ ] **Step 5: Add the public wrapper method**

Add `scrape_chapter_images` to `WikiGGScraperDriver`, placed near `scrape_dlcs_from_wiki`:

```python
def scrape_chapter_images(self) -> list["ChapterImageData"]:
    """Wraps scrape_dlcs_from_wiki to produce banner-image records keyed by
    the same canonical DLC/chapter name this app already stores on
    Character.chapter_name, for entries where a banner image was found."""
    results: list[ChapterImageData] = []
    for dlc in self.scrape_dlcs_from_wiki():
        image_url = dlc.get("dlc_image_url")
        if not image_url:
            continue
        name = dlc["dlc_name"]
        slug = sanitize_filename(name)
        results.append(
            ChapterImageData(
                name=name,
                banner_url=image_url,
                banner_local_path=f"chapters/{slug}.png",
            )
        )
    return results
```

Add `ChapterImageData` to this file's existing `from app.scrapers.types import (...)` import block (find it near the top of `wikigg.py`, alongside wherever `RealmImageData` is already imported).

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/test_chapter_scraper.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/scrapers/types.py backend/app/scrapers/wikigg.py backend/tests/unit/test_chapter_scraper.py
git commit -m "feat: scrape DLC chapter banner images from wiki.gg"
```

---

### Task 3: Backend -- wire Chapter sync into the scrape pipeline + public API

**Files:**
- Modify: `backend/app/services/scraper/assets.py`
- Modify: `backend/app/services/scraper/db_sync.py`
- Modify: `backend/app/services/scraper/pipeline.py`
- Modify: `backend/app/routes/perks.py`
- Test: `backend/tests/unit/test_chapters.py` (extend from Task 1)

**Interfaces:**
- Consumes: `ChapterImageData`, `Chapter` model (Tasks 1-2), `WikiGGScraperDriver.scrape_chapter_images` (Task 2).
- Produces: `GET /api/v1/chapters` -> `{"chapters": [{"name": ..., "banner_url": ..., "banner_local_path": ...}, ...]}`.

- [ ] **Step 1: Read the three precedent wiring points in full**

Read, in this order: `backend/app/services/scraper/assets.py` around its `realms` parameter (`grep -n "realms" backend/app/services/scraper/assets.py` to find both the signature and the download loop, roughly lines 95 and 218-219 as of this plan's writing); `backend/app/services/scraper/db_sync.py`'s `sync_realms_to_db` (around line 350) and every place `realms` appears in `sync_all_to_database`'s signature and body (around lines 429, 436, 452, 462); `backend/app/services/scraper/pipeline.py`'s realm-scraping block (`execute_sync_pipeline`, around lines 76-92 and wherever `sync_all_to_database(...)` is actually invoked further down in that same function -- read to the end of the function).

- [ ] **Step 2: Mirror the wiring for chapters, one file at a time**

In `assets.py`: add a `chapters: list[ChapterImageData] | None = None` parameter to `download_all_assets`, and a download loop mirroring the `if realms:` block exactly (same download-and-rewrite-local-path pattern), operating over `chapters` instead.

In `db_sync.py`: add `sync_chapters_to_db(chapters: list[ChapterImageData]) -> None` immediately after `sync_realms_to_db`, copying its exact upsert-by-name/no-FK approach and docstring rationale, targeting `Chapter` instead of `Realm`. Add `chapters` to `sync_all_to_database`'s signature, default handling (`chapters = chapters or []`), the call to `sync_chapters_to_db(chapters)`, and the returned summary dict's `"chapters_synced": len(chapters)` entry -- mirroring every one of `realms`' four touch points in that function.

In `pipeline.py`: add a chapter-scraping block mirroring the realm-scraping `try/except` block exactly (`logger.info("Scraping chapter banner images from wiki.gg...")`, call `wikigg_driver.scrape_chapter_images()`, catch and log-and-empty-list on failure), include `len(chapters)` in the `total_downloads` sum alongside `len(realms)`, pass `chapters=chapters` into both the `download_all_assets(...)` call and the `sync_all_to_database(...)` call at the end of `execute_sync_pipeline` (find both call sites -- they already pass `realms=realms`, add `chapters=chapters` as a sibling argument to each).

- [ ] **Step 3: Add the public route**

In `backend/app/routes/perks.py`, add directly after `list_characters` (`grep -n "def list_characters" backend/app/routes/perks.py` to find the exact line):

```python
@perks_bp.route("/api/v1/chapters", methods=["GET"])
def list_chapters():
    """Retrieve all chapter/DLC banner images for client-side name matching."""
    from app.core.extensions import db
    from app.models import Chapter
    from sqlalchemy import select

    rows = db.session.scalars(select(Chapter)).all()
    return jsonify({"chapters": [r.to_dict() for r in rows]}), 200
```

(Match this file's existing import style -- if `db`/`select`/`Chapter` are more naturally imported at the top of the file alongside its other imports rather than inline inside the function, follow whatever convention `list_characters` itself already uses in this same file.)

- [ ] **Step 4: Write the failing test**

Append to `backend/tests/unit/test_chapters.py`:

```python
def test_list_chapters_route(client, db_session: Session) -> None:
    from app.models import Chapter
    db_session.add(Chapter(name="Route Test Chapter", banner_url="https://example.com/b.png", banner_local_path="chapters/route_test.png"))
    db_session.commit()

    res = client.get("/api/v1/chapters")
    assert res.status_code == 200
    data = res.get_json()["chapters"]
    assert any(c["name"] == "Route Test Chapter" and c["banner_url"] == "https://example.com/b.png" for c in data)
```

(Add `from flask.testing import FlaskClient` to the top imports if not already present in this file from Task 1, and type the `client` fixture parameter as `FlaskClient` to match this repo's existing test-file conventions.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_chapters.py tests/unit/test_chapter_scraper.py -v`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/scraper/assets.py backend/app/services/scraper/db_sync.py backend/app/services/scraper/pipeline.py backend/app/routes/perks.py backend/tests/unit/test_chapters.py
git commit -m "feat: sync chapter banner images through the scrape pipeline and expose GET /api/v1/chapters"
```

---

### Task 4: Frontend -- reusable `Switch` component

**Files:**
- Create: `frontend/src/components/common/Switch.tsx`
- Test: `frontend/src/__tests__/unit/switch.test.ts`

**Interfaces:**
- Produces: `Switch(props: { checked: boolean; onChange: (checked: boolean) => void; ariaLabel: string; className?: string }): JSX.Element`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/switch.test.ts`:

```typescript
// frontend/src/__tests__/unit/switch.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { Switch } from '@/components/common/Switch';

test('Switch is exported as a function component', () => {
  assert.strictEqual(typeof Switch, 'function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/switch.test.ts`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 3: Implement the component**

Create `frontend/src/components/common/Switch.tsx`. Follow this repo's existing accent-color conventions (`bg-accent-amber` for the "on" state, matching `frontend/src/components/sidebar/SidebarBottomControls.tsx`'s `FOCUS_RING` constant and general focus-ring style):

```typescript
// frontend/src/components/common/Switch.tsx
'use client';
import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, ariaLabel, className = '' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber ${
        checked ? 'bg-accent-amber' : 'bg-bg-elevated border border-border-color'
      } ${className}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

export default Switch;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/switch.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/common/Switch.tsx frontend/src/__tests__/unit/switch.test.ts
git commit -m "feat: add reusable boolean Switch component"
```

---

### Task 5: Frontend -- legend redesign with real character portraits

**Files:**
- Modify: `frontend/src/components/onboarding/CharacterOnboardingWizard.tsx`

**Interfaces:**
- Consumes: `CharacterOwnershipOverlay` (unchanged, existing component), the wizard's already-fetched `characters: OnboardingCharacter[]` state (each item already has `avatar_url`/`avatar_local_path` per the existing `resolveOnboardingAvatar` helper already in this file).

- [ ] **Step 1: Read the current legend block**

Read the current legend `<section>` in `CharacterOnboardingWizard.tsx` (search for `legendTitle` to find it) -- it currently renders bare `CharacterOwnershipOverlay` swatches with `avatarSrc=""` (fixed in a prior fix wave to at least not render a broken `<img>`, but still no real portrait).

- [ ] **Step 2: Find Ace Visconti in the already-loaded character list**

Add a small derived constant near the component's other `useMemo`s:

```typescript
const legendCharacter = useMemo(
  () => characters.find((c) => c.name === 'Ace Visconti') ?? characters[0],
  [characters]
);
```

(Falls back to the first loaded character if Ace Visconti isn't present for some reason -- e.g. a future dataset without him -- so the legend never has zero characters to show a portrait from as long as at least one character loaded.)

- [ ] **Step 3: Rewrite the three legend swatches to use his real portrait**

Replace the legend's three example blocks so each is a small fixed-size card using `resolveOnboardingAvatar(backendBase, legendCharacter, ...)` (reuse this file's own existing avatar-resolution helper -- read how the real character grid below already calls it, and call it identically here) as `avatarSrc`, varying only `isOwned`/`hasPartialPerks`:

- "Owned" swatch: `isOwned={true} hasPartialPerks={false}`
- "Locked" swatch: `isOwned={false} hasPartialPerks={false}`
- "Partially unlocked" swatch: `isOwned={false} hasPartialPerks={true}`

Each swatch stays a small (e.g. `h-16 w-16` or similar, matching the existing legend's current sizing) rounded card containing `<CharacterOwnershipOverlay ... />` with no other new icon or image added -- exactly the same component, same visual language as the real grid below it and as `CharactersHub.tsx` elsewhere in the app.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
git commit -m "feat: use real character portraits in the onboarding legend"
```

---

### Task 6: Frontend -- accordion chapters with banner images and a single Switch

**Files:**
- Modify: `frontend/src/components/onboarding/CharacterOnboardingWizard.tsx`

**Interfaces:**
- Consumes: `Switch` (Task 4), `GET /api/v1/chapters` (Task 3), the existing `MapExplorer.tsx` expand/collapse pattern as a reference (`frontend/src/components/maps/MapExplorer.tsx`, `expandedRealm` state and `isRealmExpanded` helper, lines ~82-138 and ~303-339 as of this plan's writing -- read this in full before implementing).
- Produces: chapter banner lookup fetched once on mount; `expandedChapter: string | null` state; each chapter section renders collapsed (banner + name + Switch only) unless it is the expanded one.

- [ ] **Step 1: Read the precedent expand pattern in full**

Read `frontend/src/components/maps/MapExplorer.tsx`'s realm-card expand/collapse implementation end to end (the `expandedRealm` state, the `isRealmExpanded` helper, the click handler that toggles it, and the JSX that conditionally renders the expanded contents with a rotating chevron indicator) before writing anything -- this is the exact interaction model to replicate for chapters, just applied to `chapterGroups` instead of realms.

- [ ] **Step 2: Fetch the chapter banner lookup**

Add a new state and fetch, alongside the wizard's existing characters/perks fetch (extend the same `Promise.all` this file already uses, or add a sibling `useEffect` -- whichever reads more naturally given how the existing fetch is structured; read that existing `useEffect` first):

```typescript
const [chapterBanners, setChapterBanners] = useState<Record<string, { banner_url: string | null; banner_local_path: string | null }>>({});
```

Populate it from `GET ${backendBase}/api/v1/chapters` (no auth header needed -- this route is public, unlike the user-scoped characters/perks endpoints), keyed by `name`.

- [ ] **Step 3: Replace the two owned/locked buttons with one Switch**

In each chapter `<section>`, replace the existing `"I own this chapter"` / `"I don't own this chapter"` button pair with:

```typescript
<Switch
  checked={group.characters.every((c) => (ownershipDraft[c.id] ?? c.is_owned))}
  onChange={(checked) => toggleChapter(group, checked)}
  ariaLabel={`${t?.ownChapterButton || 'I own this chapter'}: ${group.chapterName}`}
/>
```

(`checked` reflects whether every character in the chapter is currently marked owned in the draft -- if the chapter is in a mixed state from manual per-perk/per-character overrides, this shows unchecked, which is correct: the switch represents "fully own this whole chapter," not a partial state. `toggleChapter` already exists in this file and needs no changes.)

- [ ] **Step 4: Make the chapter header collapsible, with a banner**

Add `const [expandedChapter, setExpandedChapter] = useState<string | null>(null);`. Change each chapter's header row into a clickable element (button or div with `role="button"` + keyboard handling, matching whatever `MapExplorer.tsx`'s realm card actually uses) that toggles `expandedChapter` between `null` and that chapter's name -- clicking the `Switch` itself must NOT also toggle expansion (stop propagation on the Switch's click, mirroring how this file's existing per-character "Perks" popup button already does `e.stopPropagation()` against its parent card's click handler).

If `chapterBanners[group.chapterName]?.banner_url` exists, render it as the header's background/image using `object-fit: contain` (e.g. an `<img>` with `className="h-full w-full object-contain"` inside a fixed-height container with a background fill color behind it, so a banner with a different aspect ratio than the container never stretches -- letterbox instead) with the chapter name overlaid as text. If no banner match exists, render the existing plain-text header as today (this is the deliberate fallback the backend's additive-by-name design already anticipates).

Only render that chapter's character grid (and its "Perks" popups, perk stats, etc. -- everything currently inside the chapter `<section>` below the header) when `expandedChapter === group.chapterName`. All chapters are collapsed (`expandedChapter === null`) on first render.

- [ ] **Step 5: Manual visual check**

After Task 8's backend chapter-scrape has actually run (see Task 8), reload `/en/welcome` and confirm: chapters render as a collapsed, scrollable list of short banner rows (not 49 fully-expanded character grids); clicking a banner expands only that one chapter; the Switch toggles independently of expansion; a banner image, where present, is never stretched.

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
git commit -m "feat: collapse onboarding chapters into an accordion with real banner images"
```

---

### Task 7: Frontend -- prominent Skip control + Welcome intro card

**Files:**
- Modify: `frontend/src/components/onboarding/CharacterOnboardingWizard.tsx`
- Modify: `frontend/src/locales/en/onboarding.ts` (and the 4 other locales' `onboarding.ts`, English-copy placeholders same as before)

**Interfaces:**
- Produces: `view: 'intro' | 'roster'` state on the wizard, defaulting to `'intro'`. Intro view renders a welcome card with a single "Continue" action that sets `view` to `'roster'`. Roster view is everything the wizard already renders (legend, accordion chapters, Continue/Skip), with Skip moved into a visually prominent position.

- [ ] **Step 1: Add the two new dictionary keys**

Add to `frontend/src/locales/en/onboarding.ts` (and mirror into `pl`/`es`/`de`/`ja`'s `onboarding.ts` as English placeholders, same convention as every other key in that file):

```typescript
introTitle: "Welcome to LemonDBD",
introBody: "To tailor the site to your progress in the game, please mark which chapters, characters, and perks you already own.",
introContinueButton: "Get Started",
```

- [ ] **Step 2: Add the intro view**

Add `const [view, setView] = useState<'intro' | 'roster'>('intro');` near the wizard's other state. Before the existing return's main content (but after the `loading` early-return), add:

```typescript
if (view === 'intro') {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
        <h1 className="text-xl font-black">{t?.introTitle || 'Welcome to LemonDBD'}</h1>
        <p className="text-sm text-text-secondary">
          {t?.introBody ||
            'To tailor the site to your progress in the game, please mark which chapters, characters, and perks you already own.'}
        </p>
        <button
          type="button"
          onClick={() => setView('roster')}
          className="w-full rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-3 text-sm font-black uppercase tracking-wider text-text-inverted cursor-pointer"
        >
          {t?.introContinueButton || 'Get Started'}
        </button>
      </div>
    </div>
  );
}
```

Everything the component already renders (legend, chapters, Continue, Skip, both modals) stays exactly where it is in the JSX, now implicitly gated to only render once `view === 'roster'` (since the intro branch above returns early).

- [ ] **Step 3: Make the Skip control prominent**

Read the current Skip button (search for `skipButton` in this file) -- it is currently a small `fixed bottom-4 right-4` pill. Move it out of the page-corner and into the roster view's header area, next to the `<h1>` heading, styled with real visual weight (larger padding, a visible border/background rather than a plain surface color, e.g. `border-2 border-accent-amber/60 bg-accent-amber/10 text-accent-amber px-5 py-2.5 text-sm font-bold`) so it reads as a real, equally-weighted alternative action to "Continue," not an easy-to-miss corner control. Keep its `onClick={() => setIsSkipModalOpen(true)}` unchanged.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/onboarding/CharacterOnboardingWizard.tsx frontend/src/locales/en/onboarding.ts frontend/src/locales/pl/onboarding.ts frontend/src/locales/es/onboarding.ts frontend/src/locales/de/onboarding.ts frontend/src/locales/ja/onboarding.ts
git commit -m "feat: add welcome intro card and make the skip control prominent"
```

---

### Task 8: Full verification -- run the real scraper, rebuild, end-to-end check

**Files:** none (verification only, unless a real bug is found)

- [ ] **Step 1: Run the full backend unit suite**

Run: `cd backend && python -m pytest tests/unit -v`
Expected: all pass, including every new `test_chapters.py`/`test_chapter_scraper.py` test. Pre-existing unrelated failures (if any, e.g. `test_phase4_services.py`) are not this branch's concern -- confirm via `git diff --stat <parent-branch>..HEAD` that this branch never touches those files.

- [ ] **Step 2: Run the full frontend unit suite and typecheck**

Run: `cd frontend && npm run test:unit && npx tsc --noEmit`
Expected: all pass / clean, same pre-existing-failure caveat as Step 1.

- [ ] **Step 3: Rebuild both containers**

Run (from `D:\vhost\LemonDBD`): `docker compose build backend frontend && docker compose up -d`

- [ ] **Step 4: Run the real scraper to populate chapter banners**

Trigger a real sync-pipeline run against the live wiki.gg (check the admin panel's scraper trigger -- `frontend/src/components/ScraperConfigModal.tsx` and whatever admin route it calls, e.g. `POST /api/v1/admin/scraper/run` or similar; find the exact route by reading that component -- or, if no HTTP trigger is convenient, run the equivalent Python entrypoint directly inside the backend container, e.g. `docker compose exec backend python -c "from app.services.scraper_service import ScraperService; ScraperService().run_sync_pipeline(download_assets=True)"`, adjusting to whatever the real constructor/method actually requires once you've read `app/services/scraper_service.py`). This hits the real network -- expect it to take real time and confirm it completes without raising.

- [ ] **Step 5: Confirm chapters were actually populated**

Run: `curl -sk https://localhost/api/v1/chapters | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('chapter rows:', j.chapters.length); console.log('with banner_url:', j.chapters.filter(c=>c.banner_url).length);})"`
Expected: a meaningful fraction of the ~49 known chapter names (per the parent branch's earlier `chapter_name` enumeration) have a non-null `banner_url`. Not every name needs to match (wiki page structure varies) -- but if the count is 0 or very low, treat that as a real bug in Task 2's extraction logic and fix it before proceeding, re-running Steps 4-5.

- [ ] **Step 6: Manual end-to-end walkthrough**

Register a fresh account, verify its email (code from `docker compose logs backend`), confirm: the intro "Welcome to LemonDBD" card is the very first thing shown at `/en/welcome`; clicking its Continue reveals the chapter accordion, all collapsed; the legend shows Ace Visconti's real portrait in three states (owned/locked/partial), not bare icons; a chapter with a real banner shows an unstretched image; clicking a chapter's banner expands it and reveals its characters; the Switch next to a chapter toggles independently of expansion; the Skip button is now visually prominent (not a small corner pill) and still opens the confirmation modal correctly.

- [ ] **Step 7: Report**

Summarize pass/fail for every check above. If anything fails, fix it as a targeted follow-up commit on this branch (not folded into earlier tasks) and re-run this task.
