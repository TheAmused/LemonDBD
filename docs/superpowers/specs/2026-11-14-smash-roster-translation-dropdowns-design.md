# Design Spec: Unified Translation Language Dropdowns in Smash Roster Creator

**Date:** 2026-11-14  
**Author:** LemonDBD Team  
**Status:** Approved by User  

---

## 1. Goal & Context

In the Smash or Pass Roster Creator, official and custom rosters support 5 languages: English (canonical base) and 4 translatable locales (`de`, `es`, `ja`, `pl`).

Previously, both the basic roster metadata section and the candidate editor had duplicate inputs:
- Main inputs at the top edited English base fields.
- A secondary amber "TRANSLATIONS" box below had 4 pill buttons (`de`, `es`, `ja`, `pl`) that rendered 10 duplicate inputs/textareas for the translated fields.

This created massive vertical sprawl, visual clutter, and unnecessary duplication.

### The Solution
Replace duplicate translation sub-panels with unified language dropdowns (`CustomDropdown`):
1. **Candidate Level (`EntityEditor.tsx`)**: An independent language dropdown in the candidate header. Switching language switches the main input fields directly. When a translation field is empty, the English base value is rendered as its placeholder. The duplicate "TRANSLATIONS" block is removed.
2. **Roster Basics Level (`RosterBasicsSection.tsx`)**: An independent language dropdown above the roster name and description. Switching language edits the name/description for that language in-place. The separate `RosterTranslationsPanel` is removed.

---

## 2. Detailed Design

### 2.1 Available Locales & Labels
Both dropdowns offer 5 language options:
- `en`: English (Base / Default)
- `pl`: Polski (PL)
- `de`: Deutsch (DE)
- `es`: Español (ES)
- `ja`: 日本語 (JA)

Labels in dropdowns are localized according to the current UI dictionary or display clear language names with flags/codes.

### 2.2 Candidate Editor (`EntityEditor.tsx`)

#### Header Placement
The candidate header contains:
- Candidate badge (e.g. `#43`)
- Candidate title (`Editing Candidate: <Name>`)
- A language dropdown on the right: `CustomDropdown<string>`
  - Value: `activeLanguage` (defaults to `'en'`)
  - Options: `en`, `pl`, `de`, `es`, `ja`
  - Accessible aria-label from dictionary: `c.editLanguageLabel`

#### Field Data Binding
- **Translatable fields**:
  - `name`:
    - If `activeLanguage === 'en'`: reads/writes `entity.name`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.name`, placeholder is `entity.name`.
  - `archetype`:
    - If `activeLanguage === 'en'`: reads/writes `entity.archetype`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.archetype`, placeholder is `entity.archetype`.
  - `tagline`:
    - If `activeLanguage === 'en'`: reads/writes `entity.tagline`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.tagline`, placeholder is `entity.tagline`.
  - `quote`:
    - If `activeLanguage === 'en'`: reads/writes `entity.quote`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.quote`, placeholder is `entity.quote`.
  - `bio`:
    - If `activeLanguage === 'en'`: reads/writes `entity.bio`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.bio`, placeholder is `entity.bio`.
  - `meme`:
    - If `activeLanguage === 'en'`: reads/writes `entity.meme`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.meme`, placeholder is `entity.meme`.
  - `turn_on`:
    - If `activeLanguage === 'en'`: reads/writes `entity.turn_on`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.turn_on`, placeholder is `entity.turn_on`.
  - `dealbreaker`:
    - If `activeLanguage === 'en'`: reads/writes `entity.dealbreaker`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.dealbreaker`, placeholder is `entity.dealbreaker`.
  - `dating_vibe`:
    - If `activeLanguage === 'en'`: reads/writes `entity.dating_vibe`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.dating_vibe`, placeholder is `entity.dating_vibe`.
  - `red_flags`:
    - If `activeLanguage === 'en'`: reads/writes `entity.red_flags`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.red_flags`, placeholder is `entity.red_flags`.
  - `green_flags`:
    - If `activeLanguage === 'en'`: reads/writes `entity.green_flags`.
    - If `activeLanguage !== 'en'`: reads/writes `translations[activeLanguage]?.green_flags`, placeholder is `entity.green_flags`.

- **Shared / Global fields**:
  - `media_url`, `media_display` (Focal Point), `role`, `gender`, `watermark_left`, `watermark_right`, `real_name`:
    - Always visible and bound to `entity.*`.
    - When `activeLanguage !== 'en'`, a subtle pill or indicator indicates these fields are shared across all translations.

#### Cleanup
- Delete the bottom `showTranslations` block in `EntityEditor.tsx` (the amber container with `Tabs` and 10 duplicate fields).

### 2.3 Roster Basics Section (`RosterBasicsSection.tsx`)

#### Header Placement
In `RosterBasicsSection.tsx`:
- Directly above `Roster name` and `Description`, render a header row containing:
  - Section subtitle / helper text
  - `CustomDropdown<string>` for the Roster Basics editing language (`en`, `pl`, `de`, `es`, `ja`).

#### Field Data Binding
- `name`:
  - If `activeLanguage === 'en'`: `name` input binds to `draft.name`.
  - If `activeLanguage !== 'en'`: binds to `rosterTranslations[activeLanguage]?.name || ''`, placeholder is `draft.name`.
- `description`:
  - If `activeLanguage === 'en'`: `description` input binds to `draft.description`.
  - If `activeLanguage !== 'en'`: binds to `rosterTranslations[activeLanguage]?.description || ''`, placeholder is `draft.description`.

#### Cleanup
- Remove the separate `RosterTranslationsPanel` rendered at the bottom of the basics section in `SmashRosterCreator.tsx`.

---

## 3. Localization
Add translation dictionary keys in all 5 locales (`en`, `pl`, `de`, `es`, `ja`):
- `languageLabel`: "Editing language" / "Język edycji"
- `baseLanguage`: "English (Base)" / "Angielski (Główny)"
- `sharedFieldNotice`: "Shared across all languages" / "Wspólne dla wszystkich języków"

---

## 4. Verification & Constraints
- Maximum 600 lines per file constraint must be strictly respected.
- Zero TypeScript `any` or `@ts-ignore`.
- Full pass on `npm run test:guards`, `npx tsc --noEmit`, `npm run lint`, and unit tests.
