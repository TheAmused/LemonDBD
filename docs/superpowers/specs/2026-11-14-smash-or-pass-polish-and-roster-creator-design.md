# Design Spec: Smash or Pass & Custom Roster Creator Polish

- **Date:** 2026-11-14
- **Status:** Proposed (Approved in Concept)
- **Scope:** Smash or Pass Hub UI/Audio, Romance Persona Modal, and Custom Roster Creator Improvements

---

## 1. Smash or Pass Hub & Card Polish

### 1.1 Audio Rapid-Streak Tuning (`SmashSoundEffects.ts`)
- **Problem:** Clicking Smash fast plays a lighter 3-note chime without the warm sub-bass, because `RAPID_GAP_S` was set to 0.9s.
- **Solution:** Reduce `RAPID_GAP_S` from `0.9s` to `0.45s` and `SKIP_GAP_S` from `0.35s` to `0.20s`. This keeps the full romantic chord audible for normal playing rhythms while still preventing muddy audio overlap during extreme button mashing.

### 1.2 Reset Voting Confirmation Modal (`HubModals.tsx`)
- **Problem:** Reset confirmation modal has a redundant "Cancel" button in the footer and no top-right close icon (`closeButton="none"`).
- **Solution:** Remove the "Cancel" button from the modal footer, keeping the danger reset button. Enable the top-right close "X" by removing `closeButton="none"` (allowing standard `closeButton="inside"`).

### 1.3 Card Flip Button Tooltip (`CharacterCard.tsx`, Locales)
- **Problem:** Tooltip states "Obróć, by zobaczyć profil i statystyki" / "Flip for Character Lore & Stats", but the back only contains lore/flags/profile, not gameplay stats.
- **Solution:** Update dictionary key `rawSmashDict.flipToDatingProfile` across all 5 locales (`en`, `pl`, `de`, `es`, `ja`) to concise phrasing:
  - `pl`: "Obróć kartę"
  - `en`: "Flip card"
  - `de`: "Karte umdrehen"
  - `es`: "Voltear carta"
  - `ja`: "カードを裏返す"

### 1.4 Card Smash & Pass Button Tooltips (`CharacterCard.tsx`, `CardBackFace.tsx`)
- **Problem:** Hovering over the large action buttons shows floating tooltips "Smash" and "Pass", which are visually intrusive on interactive cards.
- **Solution:** Remove `{...tip(...)}` attributes from Smash and Pass buttons on both the front face (`CharacterCard.tsx`) and back face (`CardBackFace.tsx`). Retain `aria-label` attributes for accessibility and screen readers.

### 1.5 Locked Roster "Draft" Badge Removal (`RosterCarouselCard.tsx`)
- **Problem:** Locked / inactive rosters in the selection carousel display an amber "Draft" badge.
- **Solution:** Remove the `{r.is_active === false && <Badge ...>{dict.tierLists.draft}</Badge>}` block and the draft suffix from `rosterLabel` in `RosterCarouselCard.tsx`.

### 1.6 Romance Persona: "First Smash" to "Total Smashes" (`PersonaBreakdown.tsx`)
- **Problem:** "First smash" is arbitrary based on deck shuffling and provides no persona value, while the total smash count is hidden in tiny text below.
- **Solution:**
  - In `PersonaBreakdown.tsx`, replace the third column of the top stats grid ("First smash") with "Total Smashes" (`Total Smashes` / `Oddane smashe`).
  - Render with a heart or smash icon, bold metric value (`persona.totalSmashes ?? 0`), and caption label.
  - The top metrics row now cleanly balances: **Total Evaluated**, **Total Smashes**, **Smash Rate (%)**.

### 1.7 Role Breakdown Layout (Survivors vs Killers) (`PersonaBreakdown.tsx`)
- **Problem:** The distribution text `Survivors (5) (62%)` and `Killers (3) (38%)` is cramped onto a single line.
- **Solution:** Reorganize into a clean 2-column stat card layout:
  - Column 1 (Left): Survivors label with count and percentage clearly separated (e.g., `5 smashes · 62%`).
  - Column 2 (Right): Killers label with count and percentage (e.g., `3 smashes · 38%`).
  - Clean spacing directly above the dual-tone progress bar.

---

## 2. Custom Roster Creator: General & Taxonomy

### 2.1 Fix Draft Recovery Race Condition (`useRosterDraft.ts`, `useRosterSubmit.ts`)
- **Problem:** When submitting/saving a roster, `localStorage.removeItem(DRAFT_KEY)` ran, but the draft state remained in React memory while navigation (`router.push`) was pending. The debounced autosave effect (400ms) executed before unmount and re-saved the old draft into `localStorage`, causing a "Draft recovered" banner on the next new roster.
- **Solution:**
  - Introduce an `isSubmittingRef` / `isSubmitted` state in `useRosterDraft`.
  - When submission succeeds, set the flag to immediately disable any further autosave calls.
  - Explicitly clear local draft state and remove `DRAFT_KEY`.

### 2.2 Complete Removal of "Category" Field
- **Problem:** "Category" input in the creator was saved to the document but never rendered anywhere in the player UI or rosters.
- **Solution:**
  - Remove `category` field from `RosterBasicsSection.tsx`.
  - Remove `category` from `Draft`, `freshDraft`, `StoredDraft`, and `useRosterSubmit`.
  - Retain backwards-compatibility in parser/codec (`roster.category || 'Custom'`) for old stored data without exposing it in the UI.

### 2.3 Image Framing / Focus Point (`EntityEditor.tsx`, `CardAvatarImage.tsx`)
- **Problem:** Uploaded/pasted images default to center cropping. Regular users cannot crop or upload modified images to the server.
- **Solution:**
  - Leverage existing `MediaDisplay` interface (`media_display: { position: string }`).
  - Add a 9-point visual focal point selector (Top/Center/Bottom x Left/Center/Right) in `EntityEditor.tsx` for each candidate portrait.
  - Generates standard CSS `object-position` strings (e.g. `'center top'`, `'50% 20%'`, `'center center'`).
  - Zero server storage required; natively supported by `mediaDisplayStyle()` in `CardAvatarImage.tsx`.

### 2.4 Theme Color Hint Simplification (`RosterBasicsSection.tsx`, Locales)
- **Problem:** Text "Two colours make a gradient. Cards of this roster get it as their edge." is redundant.
- **Solution:** Remove the first sentence across locales. Update hint to: "Karty w tym rosterze otrzymają ten kolor jako obramowanie." / "Cards of this roster get this color as their edge."

### 2.5 Roster Taxonomy: Genders Section Styling (`RosterTaxonomyBlock.tsx`)
- **Problem:** Gender section had green styling (`text-accent-green`, `variant="success"`), inconsistent with the roster creator palette.
- **Solution:** Update Genders section in `RosterTaxonomyBlock.tsx` to use red accent (`text-accent-red`, `variant="primary"`), unifying it with Roles.

### 2.6 Strict Role & Gender Assignment on Candidates (`EntityEditor.tsx`)
- **Problem:** Freeform text inputs allowed arbitrary values to be entered for role and gender, making the taxonomy block useless.
- **Solution:**
  - Restrict candidate Role and Gender inputs to the roles and genders defined in the roster taxonomy.
  - Replace raw text input with a `CustomDropdown` (or segmented selection chips if <= 4 items) containing the roster's active taxonomy.
  - If a user needs a new role or gender, they define it in the Taxonomy block first.

### 2.7 Simple Mode Toggle Locking (`RosterBasicsSection.tsx`)
- **Problem:** Users could toggle between Simple and Full mode midway through editing, creating mismatched candidates.
- **Solution:** Disable the Simple Mode switch when `draft.entities` contains more than 1 candidate or when candidates have entered data. Add a tooltip explaining that mode can only be chosen when starting a fresh roster.

### 2.8 Mandatory Role & Gender on Candidates (`EntityEditor.tsx`, `useRosterSubmit.ts`)
- **Problem:** Role and gender are critical for archetype rules and gameplay filters, but weren't marked required.
- **Solution:**
  - Add `<RequiredMark />` next to Role and Gender labels.
  - Include role and gender presence in the candidate completeness validation.

---

## 3. Custom Roster Creator: Candidates & Archetypes

### 3.1 Tagline Field Renaming (`EntityEditor.tsx`, Locales)
- **Problem:** Word "Tagline" does not clearly communicate that it is the character's subtitle / motto.
- **Solution:**
  - Change label from "Tagline" to "Podtytuł / Hasło postaci" (Subtitle / Motto).
  - Add placeholder: "np. Niezłomny weteran walki o przetrwanie".

### 3.2 Dating Vibe Rendering Fix (`CardBackFace.tsx`, `FloatingLoreScattered.tsx`)
- **Problem:** `dating_vibe` was captured in the creator, but card back and floating lore displayed `{charTitle}` under the dating archetype label instead of `profile.dating_vibe`.
- **Solution:**
  - Fix `CardBackFace.tsx` and `FloatingLoreScattered.tsx` to render `profile.dating_vibe` when present. If absent, fallback gracefully to `charTitle`.

### 3.3 Archetypes Section Title Simplification (`RomanceArchetypeBuilder.tsx`, Locales)
- **Problem:** Section title "Custom Romance Archetypes & Personality Rules" is unnecessarily long.
- **Solution:** Shorten to "Własne archetypy romantyczne" / "Custom Romance Archetypes".

### 3.4 Remove Archetype Info Banner (`RomanceArchetypeBuilder.tsx`)
- **Problem:** Redundant `<Surface>` banner with info icon repeats the section definition.
- **Solution:** Remove the `<Surface>` info banner.

### 3.5 Delete Button Styling Consistency (`RomanceArchetypeBuilder.tsx`)
- **Problem:** Delete buttons on archetypes and rules used `variant="ghost"`, unlike the danger trash button on candidates.
- **Solution:** Change delete buttons on archetypes and rules to `variant="danger"` size="sm"/"xs".

### 3.6 Archetype Description Label (`RomanceArchetypeBuilder.tsx`, Locales)
- **Problem:** Label "Persona Description & Dating Analysis" suggested two separate fields when there is only one `description` field.
- **Solution:** Update label to "Opis profilu randkowego" (*Dating Profile Description*).

### 3.7 Badge Subtitle Cleanup (`RomanceArchetypeBuilder.tsx`)
- **Problem:** Subtitle "Badge Gradient / Color" duplicated the "Badge" header.
- **Solution:** Rename section header to "Wygląd odznaki" (*Badge appearance*) and remove the sub-label.

### 3.8 Fallback Checkbox Clarification & Text Selection (`RomanceArchetypeBuilder.tsx`, `Checkbox.tsx`)
- **Problem:**
  - Fallback checkbox had a separate paragraph below explaining "The Fog Romantic".
  - Text could not be selected due to `select-none` on `Checkbox.tsx`.
- **Solution:**
  - Update checkbox text to: "Oznacz jako domyślny (gdy żaden warunek nie pasuje – domyślnie: Romantyk z Mgły)" / "Mark as fallback (otherwise defaults to 'The Fog Romantic')".
  - Remove the separate paragraph below the checkbox.
  - Allow text selection on `Checkbox` label contents.

### 3.9 Evaluation Rules Title (`RomanceArchetypeBuilder.tsx`, Locales)
- **Problem:** "Evaluation Rules & Triggers" is redundant.
- **Solution:** Change to "Reguły oceny" / "Evaluation Rules".

### 3.10 Evaluation Rules Hint Formatting (`RomanceArchetypeBuilder.tsx`, Locales)
- **Problem:** Hint had "All conditions must hold" and crammed affinity, count, and tie-breaking explanations together.
- **Solution:** Remove "All conditions must hold" and split into formatted bullet points:
  - **Powinowactwo (%):** procentowy udział w Twoich smashach.
  - **Liczba:** bezwzględna ilość oddanych smashów.
  - **Priorytet:** decyduje największa liczba spełnionych reguł, a przy remisie kolejność na liście.

### 3.11 CustomDropdown for Rule Role & Gender Targets (`RomanceArchetypeBuilder.tsx`)
- **Problem:** Role and gender target values used raw HTML `<Input list=...>` with datalists instead of the design system dropdown.
- **Solution:** Replace inputs with `CustomDropdown<string>` populated from `availableRoles` and `availableGenders`.

### 3.12 Save / Collapse Archetype Button (`RomanceArchetypeBuilder.tsx`)
- **Problem:** No button to finish/collapse an archetype; users were forced to click "Add archetype" just to close the current one.
- **Solution:** Add a "Gotowe / Zwiń" button (variant="secondary" or "primary", check icon) at the bottom of the expanded archetype editor that collapses the card (`setExpandedId(null)`).

### 3.13 Candidate Spam Prevention & Validation (`SmashRosterCreator.tsx`, `useRosterDraft.ts`)
- **Problem:** Users could click "Add candidate" repeatedly creating dozens of blank candidates, which were silently stripped on save without feedback.
- **Solution:**
  - Disable the "Dodaj kandydata" button if the current candidate has unfilled required fields (name, role, gender).
  - Add validation before submit: if any candidates have missing required fields, display a clear warning alert highlighting which candidates need completion.
