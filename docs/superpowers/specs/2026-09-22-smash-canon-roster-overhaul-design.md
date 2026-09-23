# Smash or Pass: Canon Roster & Watermark Architecture Design

**Date**: 2026-09-22  
**Topic**: Smash or Pass Canon Roster (`canon.json`) Overhaul, Backend Direct Localization, Explicit Dual-Identity Watermarks, and Dynamic Flag Sampling  
**Target Files**:
- `backend/app/seeds/data/smash_or_pass/rosters/canon.json`
- `backend/app/models/smash_or_pass.py`
- `backend/app/schemas/smash_or_pass.py`
- `backend/app/seeds/smash_roster_seeder.py`
- `backend/app/api/v1/endpoints/smash_or_pass.py`
- `backend/app/services/db/export_import.py`, `serializers.py`, `raw_schema.py`
- `backend/tests/unit/test_smash_api.py`, `test_smash_models.py`, `test_smash_or_pass_data_integrity.py`, `test_smash_seeder_service.py`, `test_smash_or_pass_nsfw_gating.py`, `test_smash_or_pass_vote_state_edges.py`, `test_db_export_import.py`, `test_live_challenge_and_entities.py`
- `frontend/src/types/smashOrPass.ts`
- `frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx`
- `frontend/src/components/smash-or-pass/CharacterCard.tsx`
- `frontend/src/components/smash-or-pass/CharacterStatsModal.tsx`
- `frontend/src/components/smash-or-pass/RosterSelectModal.tsx`
- `frontend/src/components/smash-or-pass/SmashOrPassHub.tsx`
- `frontend/src/__tests__/unit/smashOrPass.test.ts`

---

## 1. Problem Statement & Motivation

1. **Watermark Typography Glitches**:
   - `FloatingLoreScattered.tsx` naively split `character.name` by whitespace (`nameParts[0]` vs `nameParts.slice(1).join(' ')`).
   - For Killers like `"The Onryō (Sadako)"` or `"The Krasue"`, the left watermark displayed `"THE"`, and the right watermark displayed `"ONRYŌ (SADAKO)"` or `"KRASUE"`. Parentheses, Japanese macrons, and awkward three-letter articles cluttered the background.
   - For single-name Survivors (e.g., `"Eleven"`, `"Michonne"`, `"Shane"`, `"Aurora"`), the right-hand watermark was completely empty.
   - Multi-word names like `"Leon S. Kennedy"` or `"The Skull Merchant"` suffered from arbitrary word splitting and overflow.

2. **Generic Placeholders & Repetitive Strings in `canon.json`**:
   - Almost all 98 characters shared templated text:
     - `meme`: `"Meme: {Name} in the trials - always bringing chaos and unhinged energy to the campfire."`
     - `red_flags`: `"Unpredictable in the fog"`, `"Focuses on own objectives"`
     - `green_flags`: `"Unwavering determination"`, `"Loyalty in tight spots"`
     - `turn_on`: `"Courage under pressure"`, `dealbreaker`: `"Treachery and cowardice"`
   - Missing authentic Dead by Daylight trial mechanics, perks, addons, community memes (e.g., Meghead pallet wasting, Wesker's 7 minutes, Myers staring, Sadako TV crawls, Bubba basement camping, Nicolas Cage Plot Twist).

3. **Inconsistent & Meaningless Character Naming**:
   - Inconsistent Killer naming: Some used pop-culture names (`Pyramid Head`, `Albert Wesker`, `Springtrap`), while others used official titles (`The Huntress`, `The Spirit`), and others had parentheticals (`The Onryō (Sadako)`, `The Shape (Michael Myers)`).
   - Generic/meaningless placeholders: `The First` (Henry Creel / 001), `The Slasher` (Jason Voorhees), `The Ghoul` (Ken Kaneki), `The Judgment` (Divine Inquisitor), `The Troupe` (Aestri Yazar & Baermar Uraz).

4. **Indirect i18n Key Indirection**:
   - Rosters used `name_i18n_key` (`"smashOrPass.rosters.canon.name"`) and `description_i18n_key` (`"smashOrPass.rosters.canon.desc"`), requiring the frontend to search static dictionary files for database-stored entities.
   - The user requested deleting `name_i18n_key` and `description_i18n_key` entirely and serving direct, localized `name` and `description` from the backend.

5. **Fixed vs. Dynamic Flag Display**:
   - Characters had only 2 fixed red flags and 2–3 fixed green flags. The user requested a larger pool (4–6 flags) with the client dynamically and randomly sampling 2–3 phrases per card session for high replayability.

---

## 2. Architecture & Data Model Changes

### 2.1 Backend Models (`backend/app/models/smash_or_pass.py`)

#### `Roster` Model
- **Remove**:
  - `name_i18n_key: Mapped[str]`
  - `description_i18n_key: Mapped[str]`
- **Add**:
  - `name: Mapped[str] = mapped_column(String(128), nullable=False)`
  - `description: Mapped[str] = mapped_column(Text, default="", nullable=False)`
  - `translations: Mapped[dict[str, Any] | None] = _json_column(default=dict, nullable=True)`
- **Methods**:
  - `localized(lang: str | None = None) -> dict[str, Any]`: Returns `name` and `description` resolved for `lang` (falling back to English).
  - Update `to_dict(lang: str | None = None)` to return `{ "id", "slug", "name", "description", "cover_image_url", "theme_color", "category", "is_nsfw", "is_active", "created_at" }`.

#### `Entity` Model
- **Add**:
  - `real_name: Mapped[str | None] = mapped_column(String(128), nullable=True)`
  - `watermark_left: Mapped[str | None] = mapped_column(String(64), nullable=True)`
  - `watermark_right: Mapped[str | None] = mapped_column(String(64), nullable=True)`
- **Update**:
  - `to_dict()` and `metadata_dict()` to include `real_name`, `watermark_left`, and `watermark_right`.

### 2.2 Backend Schemas (`backend/app/schemas/smash_or_pass.py`)
- Update `RosterBase`, `RosterCreate`, `RosterUpdate`, `RosterOut`:
  - Replace `name_i18n_key: str` and `description_i18n_key: str` with:
    ```python
    name: str
    description: str = ""
    translations: dict[str, Any] | None = None
    ```
- Update `EntityBase`, `EntityOut`:
  - Add `real_name: str | None = None`
  - Add `watermark_left: str | None = None`
  - Add `watermark_right: str | None = None`

### 2.3 Roster Seeder & Export/Import Service
- `backend/app/seeds/smash_roster_seeder.py`:
  - Load `name`, `description`, and `translations` from roster JSONs.
  - Insert / update `Roster` with `name`, `description`, `translations`.
  - Pass `real_name`, `watermark_left`, `watermark_right` when seeding `Entity`.
- `backend/app/services/db/export_import.py`, `serializers.py`, `raw_schema.py`:
  - Update SQL table definitions and serializers to match new `Roster` and `Entity` columns.

### 2.4 All Roster JSON Seed Files
- `backend/app/seeds/data/smash_or_pass/rosters/canon.json`:
  ```json
  "name": "Dead by Daylight: Fog Canon",
  "description": "Original trial survivors and killers from the canon realm.",
  "translations": {
    "pl": {
      "name": "Dead by Daylight: Kanon Mgły",
      "description": "Oficjalne 98 postaci z mgły próby."
    }
  }
  ```
- Remove `name_i18n_key` and `description_i18n_key` across `canon.json` and other roster seed files (`legendary_cosplay.json`, `hooked_on_you.json`, `cyberpunk_2077.json`, `gothic_eldritch.json`, `anime_manga.json`).

### 2.5 Backend Test Updates
Update all tests referencing `name_i18n_key`:
- `test_smash_api.py`
- `test_smash_models.py`
- `test_smash_or_pass_data_integrity.py`
- `test_smash_seeder_service.py`
- `test_smash_or_pass_nsfw_gating.py`
- `test_smash_or_pass_vote_state_edges.py`
- `test_db_export_import.py`
- `test_live_challenge_and_entities.py`

---

## 3. Frontend Architecture Changes

### 3.1 Types (`frontend/src/types/smashOrPass.ts`)
- `RosterItem`:
  - Remove `name_i18n_key`, `description_i18n_key`.
  - Add `name: string;` and `description: string;`.
- `EntityItem`:
  - Add `real_name?: string;`
  - Add `watermark_left?: string;`
  - Add `watermark_right?: string;`

### 3.2 Dual-Identity Watermark Rendering (`FloatingLoreScattered.tsx`)
- Instead of naive space-splitting:
  ```tsx
  const leftWatermark = character.watermark_left || (isSurvivor ? (character.name || '').split(' ')[0] : character.name);
  const rightWatermark = character.watermark_right || (isSurvivor ? (character.name || '').split(' ').slice(1).join(' ') : character.real_name || '');
  ```
- Use length-responsive CSS classes (e.g. `leftWatermark.length > 12 ? 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl' : 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl'`) to prevent clipping or line wraps.

### 3.3 Dynamic Flag Sampling (`CharacterCard.tsx` & `CharacterStatsModal.tsx`)
- In `CharacterCard.tsx`:
  - Use `useMemo` keyed on `character.slug` (or `character.id`) to randomly select:
    - 2–3 items from `profile.green_flags` (if pool > 3, select 2 or 3; if pool <= 3, show all).
    - 2–3 items from `profile.red_flags` (if pool > 3, select 2 or 3; if pool <= 3, show all).
  - Guarantees stability while viewing/flipping the current card, while yielding fresh combinations on each encounter.
- In `CharacterStatsModal.tsx`:
  - Renders ALL flags from `profile.green_flags` and `profile.red_flags`, providing a comprehensive dossier experience.

### 3.4 Direct Roster Rendering (`RosterSelectModal.tsx` & `SmashOrPassHub.tsx`)
- `RosterSelectModal.tsx`:
  - Replace `getRosterDisplayName(r)` with direct `r.name || r.slug`.
  - Replace description lookups with `r.description`.
- `SmashOrPassHub.tsx`:
  - Clean `activeRoster` default to remove `name_i18n_key` and `description_i18n_key`.

---

## 4. Canon Roster (`canon.json`) 98-Character Content Specification

### 4.1 Schema for Each Entity
```json
{
  "slug": "the_onryo",
  "name": "The Onryō",
  "real_name": "Sadako Yamamura",
  "watermark_left": "THE ONRYŌ",
  "watermark_right": "SADAKO",
  "role": "Killer",
  "gender": "female",
  "media_url": "/static/avatars/killers/the_onryō.webp",
  "media_type": "image",
  "archetype": "The Vengeful Well Spectre",
  "bio": "Crawls directly out of your flat-screen TV to judge your taste in movies. Demands daily videotape rewinding and quiet respect.",
  "tagline": "Seven days to fall in love, or seven days until condemned death.",
  "quote": "\"Death is not the end of suffering. It is merely a broadcast.\"",
  "meme": "Condemned Ring tapes are her love language; crawls into television sets when conversations get awkward.",
  "turn_on": "CRT vintage monitors and damp wishing wells",
  "dealbreaker": "Smart TVs with no VCR input",
  "dating_vibe": "Supernatural, spine-chilling J-horror intimacy",
  "red_flags": [
    "Crawls through your television screen without knocking",
    "Gives you a VHS tape and whispers that you have 7 days left",
    "Stares unblinking through drenched black hair during dinner",
    "Forces you to return cursed video tapes across the realm"
  ],
  "green_flags": [
    "Teleports instantly so she is never late for dates",
    "Zero interest in small talk or noisy public venues",
    "Intense, undivided eye contact (literally piercing)",
    "Always brings nostalgic retro cassette vibes"
  ],
  "chapter": "Sadako Rising",
  "danger_level": "Lethal",
  "chaos_score": 85,
  "translations": {
    "pl": {
      "archetype": "Mściwa Zjawa ze Studni",
      "bio": "Wychodzi wprost z twojego telewizora, by skrytykować twój gust filmowy. Wymaga przewijania kaset VHS i absolutnej ciszy.",
      "tagline": "Siedem dni na miłość, albo siedem dni do wyroku śmierci.",
      "quote": "„Śmierć nie jest końcem cierpienia. To tylko kolejna transmisja.”",
      "meme": "Kasety ze skazaniem to jej język miłości; wchodzi w telewizor, gdy randka robi się niezręczna.",
      "turn_on": "Stare monitory kineskopowe i wilgotne studnie",
      "dealbreaker": "Telewizory Smart TV bez wejścia na magnetowid",
      "dating_vibe": "Mroczny, mrożący krew w żyłach japoński horror",
      "red_flags": [
        "Wychodzi z telewizora bez pukania o trzeciej w nocy",
        "Daje ci kasetę VHS i szepcze, że zostało ci 7 dni życia",
        "Wpatruje się w ciebie przez mokre, czarne włosy",
        "Zmusza cię do biegania z przeklętymi taśmami po mapie"
      ],
      "green_flags": [
        "Teleportuje się przez telewizory, więc nigdy się nie spóźnia",
        "Zero zainteresowania płytkimi pogawędkami o pogodzie",
        "Niesamowicie intensywny kontakt wzrokowy",
        "Wnosi do związku niepowtarzalny klimat retro VHS"
      ]
    }
  }
}
```

### 4.2 Standardized Killer Names & Real Names
- `the_trapper` $\rightarrow$ `The Trapper` | `Evan MacMillan` | Left: `"THE TRAPPER"`, Right: `"MACMILLAN"`
- `the_wraith` $\rightarrow$ `The Wraith` | `Philip Ojomo` | Left: `"THE WRAITH"`, Right: `"PHILIP"`
- `the_hillbilly` $\rightarrow$ `The Hillbilly` | `Max Thompson Jr.` | Left: `"THE HILLBILLY"`, Right: `"THOMPSON JR."`
- `the_nurse` $\rightarrow$ `The Nurse` | `Sally Smithson` | Left: `"THE NURSE"`, Right: `"SALLY"`
- `the_shape` $\rightarrow$ `The Shape` | `Michael Myers` | Left: `"THE SHAPE"`, Right: `"MICHAEL MYERS"`
- `the_hag` $\rightarrow$ `The Hag` | `Lisa Sherwood` | Left: `"THE HAG"`, Right: `"LISA"`
- `the_doctor` $\rightarrow$ `The Doctor` | `Herman Carter` | Left: `"THE DOCTOR"`, Right: `"HERMAN CARTER"`
- `the_huntress` $\rightarrow$ `The Huntress` | `Anna` | Left: `"THE HUNTRESS"`, Right: `"ANNA"`
- `the_cannibal` $\rightarrow$ `The Cannibal` | `Leatherface (Bubba Sawyer)` | Left: `"THE CANNIBAL"`, Right: `"LEATHERFACE"`
- `the_nightmare` $\rightarrow$ `The Nightmare` | `Freddy Krueger` | Left: `"THE NIGHTMARE"`, Right: `"FREDDY KRUEGER"`
- `the_pig` $\rightarrow$ `The Pig` | `Amanda Young` | Left: `"THE PIG"`, Right: `"AMANDA YOUNG"`
- `the_clown` $\rightarrow$ `The Clown` | `Kenneth Chase (Jeffrey Hawk)` | Left: `"THE CLOWN"`, Right: `"KENNETH CHASE"`
- `the_spirit` $\rightarrow$ `The Spirit` | `Rin Yamaoka` | Left: `"THE SPIRIT"`, Right: `"RIN YAMAOKA"`
- `the_legion` $\rightarrow$ `The Legion` | `Frank, Julie, Susie & Joey` | Left: `"THE LEGION"`, Right: `"FRANK & JULIE"`
- `the_plague` $\rightarrow$ `The Plague` | `Adiris` | Left: `"THE PLAGUE"`, Right: `"ADIRIS"`
- `the_ghost_face` $\rightarrow$ `The Ghost Face` | `Danny Johnson (Jed Olsen)` | Left: `"THE GHOST FACE"`, Right: `"DANNY JOHNSON"`
- `the_demogorgon` $\rightarrow$ `The Demogorgon` | `Demogorgon` | Left: `"THE DEMOGORGON"`, Right: `"UPSIDE DOWN"`
- `the_oni` $\rightarrow$ `The Oni` | `Kazan Yamaoka` | Left: `"THE ONI"`, Right: `"KAZAN YAMAOKA"`
- `the_deathslinger` $\rightarrow$ `The Deathslinger` | `Caleb Quinn` | Left: `"THE DEATHSLINGER"`, Right: `"CALEB QUINN"`
- `the_executioner` $\rightarrow$ `The Executioner` | `Pyramid Head` | Left: `"THE EXECUTIONER"`, Right: `"PYRAMID HEAD"`
- `the_blight` $\rightarrow$ `The Blight` | `Talbot Grimes` | Left: `"THE BLIGHT"`, Right: `"TALBOT GRIMES"`
- `the_twins` $\rightarrow$ `The Twins` | `Charlotte & Victor Deshayes` | Left: `"THE TWINS"`, Right: `"CHARLOTTE & VICTOR"`
- `the_trickster` $\rightarrow$ `The Trickster` | `Ji-Woon Hak` | Left: `"THE TRICKSTER"`, Right: `"JI-WOON HAK"`
- `the_nemesis` $\rightarrow$ `The Nemesis` | `Nemesis T-Type` | Left: `"THE NEMESIS"`, Right: `"NEMESIS"`
- `the_cenobite` $\rightarrow$ `The Cenobite` | `Pinhead (Elliot Spencer)` | Left: `"THE CENOBITE"`, Right: `"PINHEAD"`
- `the_artist` $\rightarrow$ `The Artist` | `Carmina Mora` | Left: `"THE ARTIST"`, Right: `"CARMINA MORA"`
- `the_onryō` $\rightarrow$ `The Onryō` | `Sadako Yamamura` | Left: `"THE ONRYŌ"`, Right: `"SADAKO"`
- `the_dredge` $\rightarrow$ `The Dredge` | `Manifestation of Darkness` | Left: `"THE DREDGE"`, Right: `"THE DREDGE"`
- `the_mastermind` $\rightarrow$ `The Mastermind` | `Albert Wesker` | Left: `"THE MASTERMIND"`, Right: `"ALBERT WESKER"`
- `the_knight` $\rightarrow$ `The Knight` | `Tarhos Kovács` | Left: `"THE KNIGHT"`, Right: `"TARHOS KOVÁCS"`
- `the_skull_merchant` $\rightarrow$ `The Skull Merchant` | `Adriana Imai` | Left: `"THE SKULL"`, Right: `"MERCHANT"`
- `the_singularity` $\rightarrow$ `The Singularity` | `HUX-A7-13` | Left: `"THE SINGULARITY"`, Right: `"HUX-A7-13"`
- `the_xenomorph` $\rightarrow$ `The Xenomorph` | `Xenomorph XX121` | Left: `"THE XENOMORPH"`, Right: `"PERFECT ORGANISM"`
- `the_good_guy` $\rightarrow$ `The Good Guy` | `Chucky (Charles Lee Ray)` | Left: `"THE GOOD GUY"`, Right: `"CHUCKY"`
- `the_unknown` $\rightarrow$ `The Unknown` | `The Unknown` | Left: `"THE UNKNOWN"`, Right: `"THE UNKNOWN"`
- `the_lich` $\rightarrow$ `The Lich` | `Vecna` | Left: `"THE LICH"`, Right: `"VECNA"`
- `the_dark_lord` $\rightarrow$ `The Dark Lord` | `Dracula` | Left: `"THE DARK LORD"`, Right: `"DRACULA"`
- `the_houndmaster` $\rightarrow$ `The Houndmaster` | `Portia Maye & Sniffer` | Left: `"THE HOUNDMASTER"`, Right: `"PORTIA MAYE"`
- `the_animatronic` $\rightarrow$ `The Animatronic` | `William Afton (Springtrap)` | Left: `"THE ANIMATRONIC"`, Right: `"SPRINGTRAP"`
- `the_krasue` $\rightarrow$ `The Krasue` | `Burong Sukapat` | Left: `"THE KRASUE"`, Right: `"BURONG"`
- `the_slasher` $\rightarrow$ `The Slasher` | `Jason Voorhees` | Left: `"THE SLASHER"`, Right: `"JASON VOORHEES"`
- `the_first` $\rightarrow$ `The First` | `Henry Creel (001)` | Left: `"THE FIRST"`, Right: `"HENRY CREEL"`
- `the_ghoul` $\rightarrow$ `The Ghoul` | `Ken Kaneki` | Left: `"THE GHOUL"`, Right: `"KEN KANEKI"`
- `the_judgment` $\rightarrow$ `The Judgment` | `The Divine Arbiter` | Left: `"THE JUDGMENT"`, Right: `"DIVINE ARBITER"`

### 4.3 Standardized Survivors
- All 54 survivors formatted with proper `watermark_left` and `watermark_right`:
  - `Leon S. Kennedy` $\rightarrow$ Left: `"LEON S."`, Right: `"KENNEDY"`
  - `Bill Overbeck` $\rightarrow$ Left: `"BILL"`, Right: `"OVERBECK"`
  - `Detective Tapp` $\rightarrow$ Left: `"DETECTIVE"`, Right: `"TAPP"`
  - `Meg Thomas` $\rightarrow$ Left: `"MEG"`, Right: `"THOMAS"`
  - `Dwight Fairfield` $\rightarrow$ Left: `"DWIGHT"`, Right: `"FAIRFIELD"`
  - `Yun-Jin Lee` $\rightarrow$ Left: `"YUN-JIN"`, Right: `"LEE"`
  - `Eleven` $\rightarrow$ Left: `"SURVIVOR"`, Right: `"ELEVEN"`
  - `Michonne Grimes` $\rightarrow$ Left: `"MICHONNE"`, Right: `"GRIMES"`
  - `Rick Grimes` $\rightarrow$ Left: `"RICK"`, Right: `"GRIMES"`
  - `The Troupe` $\rightarrow$ `Aestri Yazar` | Left: `"AESTRI"`, Right: `"YAZAR"`
  - And similarly across all remaining survivors.

---

## 5. Verification & Testing Plan

1. **Backend Tests**:
   - Run full unit tests: `pytest backend/tests/unit` to verify:
     - `test_smash_api.py`: Roster response returns `name`, `description`.
     - `test_smash_models.py`: Model serialization and relations without `name_i18n_key`.
     - `test_smash_or_pass_data_integrity.py`: All 98 entities have valid `watermark_left`, `watermark_right`, `real_name`, $\ge 4$ `red_flags`, $\ge 4$ `green_flags`.
     - `test_smash_seeder_service.py`: Seeding runs cleanly without errors.
2. **Frontend Tests**:
   - Run `npm run test:unit` in `frontend/`.
   - Verify `types/smashOrPass.ts` compatibility and locale rendering.
3. **End-to-End & Playwright Verification**:
   - Verify on both Desktop (1280x800) and Mobile (390x844):
     - Watermark background typography displays `"THE ONRYŌ"` on left and `"SADAKO"` on right with no parenthesis or clipping.
     - Watermark background displays `"LEON S."` on left and `"KENNEDY"` on right.
     - Character card back displays 2–3 randomized red flags and 2–3 green flags cleanly.
     - Flipping card back and forth maintains stable flag selection for current character.
     - Opening Character Dossier/Stats modal shows the complete pool of 4–6 flags.
     - Roster selection modal shows direct backend names cleanly.
