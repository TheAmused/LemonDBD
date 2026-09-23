# Design Specification: Smash or Pass Multilingual & Extended Rosters Overhaul

- **Date**: 2026-09-23
- **Status**: Approved
- **Scope**:
  1. Multilingual translation overhaul for `canon.json` across German (`de`), Spanish (`es`), and Japanese (`ja`).
  2. Complete quality and lore overhaul for `legendary_cosplay.json` (`legendary_characters`, 51 characters).
  3. Complete quality, naming, and lore overhaul for `hooked_on_you.json` (`hooked_on_you`, 8 characters).
  4. Backend integrity test suite expansion for all rosters.
  5. Playwright end-to-end verification across rosters and locales.

---

## 1. Problem Statement

1. **Canon Multilingual Deficiencies (`canon.json`)**:
   - While English and Polish were completely rewritten with authentic DBD lore and 4–6 unique flags per character, the German (`de`), Spanish (`es`), and Japanese (`ja`) translation blobs contain legacy template text and repeated duplicate flags (e.g. `['Determinación inquebrantable', 'Lealtad en momentos críticos', 'Lealtad en momentos críticos', ...]`).
2. **Extended Rosters Quality Disparity**:
   - `legendary_cosplay.json` (`legendary_characters`, 51 characters) and `hooked_on_you.json` (`hooked_on_you`, 8 characters) lack the quality of `canon.json`:
     - They have `null` for `watermark_left` and `watermark_right`, leading to blank or broken typography.
     - They only provide 2–3 flags instead of the standard 4–6 pool needed for dynamic 2–3 sampling and full stats dossiers.
     - `hooked_on_you.json` characters have parenthesis suffixes in their names (e.g., `"The Trapper (Island)"`).
     - Non-English translations in these rosters are either generic or repetitive.

---

## 2. Technical Architecture & Data Standards

### 2.1 Entity Model & Data Contract
Every character across `canon.json`, `legendary_cosplay.json`, and `hooked_on_you.json` must strictly fulfill:
1. `name`: Clean character display name (zero parentheses).
2. `watermark_left`: 1–2 words (e.g., `"WILLIAM"`, `"CHRIS"`, `"THE TRAPPER"`). No parentheses.
3. `watermark_right`: 1–2 words (e.g., `"BIRKIN"`, `"REDFIELD"`, `"ISLAND"`). No parentheses.
4. `green_flags`: 4–6 unique, authentic lore/gameplay phrases in English.
5. `red_flags`: 4–6 unique, authentic lore/gameplay phrases in English.
6. `translations`: Fully populated dictionaries for `pl`, `de`, `es`, `ja`:
   - `name`, `archetype`, `tagline`, `bio`, `quote`, `meme`, `turn_on`, `dealbreaker`, `dating_vibe`.
   - `green_flags`: 4–6 unique translated phrases (strictly matching the English flag count; zero duplicate strings).
   - `red_flags`: 4–6 unique translated phrases (strictly matching the English flag count; zero duplicate strings).

---

## 3. Roster Overhauls

### 3.1 Canon Translations (`canon.json` - 98 Characters)
Update all 98 characters in `canon.json` with high-fidelity translations for `de`, `es`, and `ja`:
- **German (`de`)**: Authentic Dead by Daylight German localization (e.g., "Prüfungen des Wesens", "Generatoren", "Haken", "Fluch-Totems").
- **Spanish (`es`)**: Authentic DBD Spanish localization (e.g., "Pruebas del Ente", "Generadores", "Tótem de maleficio").
- **Japanese (`ja`)**: Authentic DBD Japanese localization using official terminology (e.g., エンティティの儀式, 発電機, トーテム, 呪術).

### 3.2 Legendary Characters Overhaul (`legendary_cosplay.json` - 51 Characters)
All 51 characters updated with authentic franchise and DBD collab lore:
- **Silent Hill**:
  - `James Sunderland`: `JAMES` / `SUNDERLAND` (Bio: Haunted widower searching for Mary in the Fog; Flags: Loyal to the end / Ignores red flags if they look like Mary).
  - `Cybil Bennett`: `CYBIL` / `BENNETT` (Brahms police officer; Protective law enforcement / Tends to get possessed by parasitical bugs).
  - `Lisa Garland`: `LISA` / `GARLAND` (Alchemilla nurse; Compassionate caregiver / Bleeds from forehead when stressed).
  - `Alessa Gillespie`: `ALESSA` / `GILLESPIE` (Psychic harbinger; Godlike psychic warding / Causes town-wide sirens).
- **Resident Evil**:
  - `Chris Redfield`: `CHRIS` / `REDFIELD` (BSAA captain; Boulders stand no chance / Loses his entire squad on mission dates).
  - `Claire Redfield`: `CLAIRE` / `REDFIELD` (TerraSave activist; Incorruptible sibling loyalty / Adopts orphaned virus victims on date night).
  - `Sheva Alomar`: `SHEVA` / `ALOMAR` (BSAA operative; Flawless partner synergy / Demands 50/50 ammo inventory distribution).
  - `Carlos Oliveira`: `CARLOS` / `OLIVEIRA` (U.B.C.S. mercenary; Unflappable charm / Lives in a "cruel, Carlos-less world").
  - `William Birkin`: `WILLIAM` / `BIRKIN` (G-Virus scientist; Brilliant viral research / Spouts extra eyes and arms when angry).
  - `HUNK`: `AGENT` / `HUNK` (The Grim Reaper; Never misses extraction point / Will leave you behind to secure the sample).
- **Child's Play**:
  - `Tiffany Valentine`: `TIFFANY` / `VALENTINE` (The Bride of Chucky; Lethal ride-or-die devotion / Keeps voodoo amulets and severed heads in closet).
- **Stranger Things**:
  - `Jonathan Byers`: `JONATHAN` / `BYERS` (Hawkins photographer; Gentle and fiercely protective / Creepy bush photography habit).
- **Crypt TV & Mythological Creatures**:
  - `The Look-See`: `THE` / `LOOK-SEE` (If you cannot release, he will take a piece).
  - `The Malthinker`: `THE` / `MALTHINKER` (Corrupted schoolmaster).
  - `The Birch`: `THE` / `BIRCH` (Vengeful woodland guardian).
  - `The Ferryman`: `CHARON` / `FERRYMAN` (Obol collector of the River Styx).
  - `The Minotaur`: `THE` / `MINOTAUR` (Labyrinth beast of Crete).
  - `Baba Yaga`: `BABA` / `YAGA` (Slavic witch dwelling in chicken-leg hut).
  - `Krampus`: `THE` / `KRAMPUS` (Alpine punisher of naughty survivors).
- **Collabs & Operators**:
  - `Kenny Ackerman`: `KENNY` / `ACKERMAN` (Anti-personnel ODM gear master).
  - `Tubarão`: `OPERATOR` / `TUBARÃO` (Zoto Canister specialist).
  - *And all remaining characters in the 51-count roster*.

### 3.3 Hooked on You Overhaul (`hooked_on_you.json` - 8 Characters)
Overhaul the 8 characters of Murderer's Island:
- **Names cleaned**:
  - `The Trapper` (was `The Trapper (Island)`), watermarks: `THE TRAPPER` / `ISLAND`
  - `The Huntress` (was `The Huntress (Island)`), watermarks: `THE HUNTRESS` / `ISLAND`
  - `The Spirit` (was `The Spirit (Island)`), watermarks: `THE SPIRIT` / `ISLAND`
  - `The Wraith` (was `The Wraith (Island)`), watermarks: `THE WRAITH` / `ISLAND`
  - `Claudette Morel` (was `Claudette Morel (Island)`), watermarks: `CLAUDETTE` / `MOREL`
  - `Dwight Fairfield` (was `Dwight Fairfield (Island)`), watermarks: `DWIGHT` / `FAIRFIELD`
  - `The Ocean`, watermarks: `THE` / `OCEAN`
  - `The Narrator`, watermarks: `THE` / `NARRATOR`
- **4–6 Flags per character**: Authentic to the visual novel dating sim routes.
- **Multilingual**: Full `pl`, `de`, `es`, `ja` translations.

---

## 4. Verification & Testing Plan

1. **Automated Backend Integrity Tests** (`backend/tests/unit/test_smash_roster_seeder.py`):
   - `test_canon_translations_complete_de_es_ja`: asserts all 98 characters have valid `de`, `es`, `ja` translations with 4–6 non-empty, non-duplicate flags.
   - `test_legendary_roster_integrity`: asserts all 51 characters have non-null `watermark_left`/`watermark_right`, zero parentheses, and 4–6 flags across `en`, `pl`, `de`, `es`, `ja`.
   - `test_hooked_on_you_roster_integrity`: asserts all 8 characters have clean names without parentheses, non-null watermarks, and 4–6 flags across all languages.
2. **Playwright End-to-End Verification**:
   - Verify switching between `canon`, `legendary_characters`, and `hooked_on_you`.
   - Verify that watermarks render cleanly across rosters.
   - Verify 2–3 dynamic flag sampling on card back and full $\ge 4$ pool in dossier stats modal.
   - Verify language rendering in English, Polish, German, Spanish, and Japanese.
