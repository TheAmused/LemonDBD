## /minigames

### Page & files
- Page: `app/[locale]/minigames/page.tsx` (`MinigamesPage`, metadata title `"LemonDBD - Minigames & DBD Idle"` via `d.minigames.pageTitle`)
- Feature entry: `features/minigames/index.ts`
- Client wrapper: `components/minigames/MinigamesHubClient.tsx` (`MinigamesHubClient`)
- Hub view: `components/minigames/MinigamesHub.tsx` (`MinigamesHub`)
- Hub cards & mode defs: `components/minigames/MinigamesHubCards.tsx` (`FlagshipCard`, `GuesserCard`, `CustomTrialCard`), `components/minigames/hubModes.ts` (`flagshipModes`, `guesserModes`)
- Shared UI: `components/common/AuthRequiredState.tsx`, `components/common/EmptyState.tsx`, `components/common/ConfirmModal.tsx`, `components/common/PreferencesPromptModal.tsx`, `components/common/AtmospherePreferencesList.tsx`, `components/AuthModal.tsx`, `components/common/NsfwBadge.tsx`, `components/common/InfoChip.tsx`, `components/common/Badge.tsx`, `components/common/Surface.tsx`, `components/common/Button.tsx`, `components/common/Tooltip.tsx`

### Layout elements
- **Hidden inputs**:
  - File input (`input[type="file"]`, `accept=".json"`, `className="hidden"`) triggered by `"Import JSON"` button.
- **Hero Header**:
  - Top pill badge: `Gamepad2` icon + `"DBD Idle & Minigames Hub"` (`t.hubBadge`).
  - Heading (`h1`): `"Dead by Daylight Minigames"` (`t.hubTitle`).
  - Subtitle (`p`): `"Test your Fog knowledge with daily trials, endless practice, or custom player-made gauntlets."` (`t.hubSubtitle`).
  - **Daily Streak Banner** (`Surface`):
    - `Flame` icon (animated pulse) + `"Current Streak: {currentStreak} Days"` (`t.streak.current`, `t.streak.days`).
    - Vertical divider.
    - `"Best Streak: {maxStreak}"` (`t.streak.best`).
    - Completed today badge (conditional on `isCompletedToday`): green `Badge` `"Completed Today!"` (`t.alreadyCompletedToday`).
- **Import / Share Error Alert** (conditional on `importError`, `role="alert"`):
  - `CircleAlert` icon + error message text (`importError`, e.g., `"This content was removed by moderators..."` `dict.tierLists.contentRevoked`, `"This content has no valid account mark..."` `dict.tierLists.unsignedContent`, `"Couldn't add your account mark for sharing. Sign in again and retry."` `dict.tierLists.signFailed`, or `"Failed to import trial."`).
  - Dismiss icon button (`X` icon, `aria-label="Close"` `dict.modal.close`).
- **Flagship Modes Grid** (3-column grid of `FlagshipCard`):
  - **Card 1 — Daily Fog Trial** (`tone="red"`):
    - `Calendar` icon tile, red `Badge` `"Daily Fog Trial"` (`t.dailyTrial`), heading (`h2`) `"Daily Fog Trial"`, description `"New synchronized challenge every 24 hours. Keep your daily streak alive!"` (`t.dailySubtitle`), primary CTA link (`/{locale}/minigames/play?type=daily&mode=fog_trial`) with `Play` icon + `"Play Daily Trial"` (`t.playDaily`).
  - **Card 2 — DBD Idle Classic** (`tone="amber"`):
    - `MaskIcon` tile, amber `Badge` `"DBD Idle Classic"` (`t.dbdIdleClassic`), heading (`h2`) `"DBD Idle Classic"`, description `"Full 98 survivor & killer roster attribute comparison. Role, gender, chapter, year, height deduction."` (`t.dbdIdleClassicDesc`), amber CTA link (`/{locale}/minigames/idle`) with `Play` icon + `"Play DBD Idle"` (`t.playIdle`).
  - **Card 3 — Trial Creator** (`tone="red"`):
    - `Plus` icon tile, red `Badge` `"Creator"` (`t.creatorBadge`), heading (`h2`) `"Trial Creator"` (`t.creatorTitle`), description `"Assemble custom multi-round challenges, export to JSON or generate short links for friends."` (`t.creatorSubtitle`), primary CTA link (`/{locale}/minigames/creator`) with `Plus` icon + `"Open Creator"` (`t.createChallenge`).
- **Standalone Guesser Modes Section**:
  - Heading (`h2`): `"Standalone Guesser Modes"` (`t.standaloneTitle`).
  - Subtitle (`p`): `"Targeted single-mode endless challenges to test specific Dead by Daylight skills."` (`t.standaloneSubtitle`).
  - 6-card grid (`GuesserCard`, each with icon tile, `h3` title, description, and CTA link with `Play` icon):
    - **Realm & Map Guesser** (`tone="green"`, `MapPin` icon): `"Realm & Map Guesser"` (`t.modes.realm_guesser`), `"Identify the Realm from cropped landmarks, tiles and map features."` (`t.modeDescriptions.realm_guesser`), link `/{locale}/minigames/play?type=repeatable&mode=realm`, button `"Play Realm Guesser"` (`t.playRealmGuesser`).
    - **Perk Icon Distortion** (`tone="amber"`, `PerkHexIcon`): `"Perk Icon Distortion"` (`t.modes.perk_icon`), `"Identify the perk from a distorted, zoomed or filtered icon."` (`t.modeDescriptions.perk_icon`), link `/{locale}/minigames/play?type=repeatable&mode=perk`, button `"Play Perk Guesser"` (`t.playPerkGuesser`).
    - **Killer Power Guesser** (`tone="red"`, `Zap` icon): `"Killer Power Guesser"` (`t.modes.killer_power`), `"Identify the Killer based on their unique power icon and redacted mechanics."` (`t.modeDescriptions.killer_power`), link `/{locale}/minigames/play?type=repeatable&mode=power`, button `"Play Power Guesser"` (`t.playPowerGuesser`).
    - **Terror Radius Guesser** (`tone="red"`, `Volume2` icon): `"Terror Radius Guesser"` (`t.modes.terror_radius`), `"Identify the Killer by listening to their heartbeats and chase music."` (`t.modeDescriptions.terror_radius`), link `/{locale}/minigames/play?type=repeatable&mode=audio`, button `"Play Audio Guesser"` (`t.playAudioGuesser`).
    - **Pixel Avatar Guesser** (`tone="amber"`, `Eye` icon): `"Pixel Avatar Guesser"` (`t.modes.pixel_avatar`), `"Guess the character from a pixelated avatar that sharpens with each guess."` (`t.modeDescriptions.pixel_avatar`), link `/{locale}/minigames/play?type=repeatable&mode=pixel`, button `"Play Pixel Guesser"` (`t.playPixelGuesser`).
    - **Lore & Quote Guesser** (`tone="green"`, `BookOpen` icon): `"Lore & Quote Guesser"` (`t.modes.quote_lore`), `"Deduce the character or perk from a lore quote or flavor text."` (`t.modeDescriptions.quote_lore`), link `/{locale}/minigames/play?type=repeatable&mode=quote`, button `"Play Lore Guesser"` (`t.playLoreGuesser`).
- **Custom Player Trials Section**:
  - Header row:
    - Heading (`h2`): `"My Custom Trials"` (`t.myCustomTrials`).
    - Subtitle (`p`): `"Saved strictly in your browser local storage."` (`t.localStorageNotice`).
    - Action buttons:
      - Settings icon button (`Settings` icon, `aria-label="Effects, sounds and music"` `dict.smashOrPass.effectsPrefs.button`, tooltip `"Effects, sounds and music"` / `"Change which effects, sounds and music play."`, navigates to `/{locale}/settings`).
      - Import JSON button (`Upload` icon + `"Import JSON"` `t.importJson`; opens `AuthModal` if unauthenticated, otherwise opens file picker).
      - Open Creator link button (`Plus` icon + `"Open Creator"` `t.createChallenge`, `href="/{locale}/minigames/creator"`; intercepts and opens `AuthModal` if unauthenticated).
  - **Custom Trial Cards Grid** (when authenticated and `customTrials.length > 0`, scrollable container):
    - Each `CustomTrialCard`:
      - Title (`h3`, `trial.title`).
      - Rounds count `InfoChip` (`"{count} Round"` / `"{count} Rounds"` `t.roundsCount`).
      - NSFW row (when `trial.is_nsfw`): `NsfwBadge` (`MatureIcon` + `"NSFW"` `t.nsfw.badge`) + conditional `"Show NSFW content"` button (`dict.tierLists.nsfw.reveal`, when `!showNsfw`).
      - Description (`p`, `trial.description`, blurred with `blur-xs` when NSFW and `!showNsfw`).
      - Card footer:
        - Play link button (`Play` icon + `"Play"` `t.playTrial`, `href="/{locale}/minigames/play?id={trial.id}"`).
        - Share icon button (`Share2` icon or green `Check` icon when copied, `aria-label="Share"`, tooltip `"Share"` `t.shareTrial`).
        - Export JSON icon button (`Download` icon, `aria-label="Export JSON"`, tooltip `"Export JSON"` `t.exportJson`).
        - Delete icon button (`Trash2` icon, danger variant, `aria-label="Delete"`, tooltip `"Delete"` `t.deleteTrial`).

### Modes / states
- **Unauthenticated custom trials state**: Renders `AuthRequiredState` (`variant="compact"`) with `LockIcon`, heading `"Log in to manage custom trials"` (`t.loginToManage`), subtitle `"Log in to create, import, and play community trials."` (`t.loginToManageDesc`), and `"Log in"` button (`dict.streaks.logIn`) which opens `AuthModal`.
- **Authenticated empty custom trials state**: Renders `EmptyState` (`variant="compact"`) with title `"No custom trials yet. Create your first one or import a JSON challenge."` (`t.noCustomTrials`).
- **Completed daily streak state**: Displays green `Badge` `"Completed Today!"` (`t.alreadyCompletedToday`) inside the Daily Streak Banner when `wonDailyOn(streakData, todayStr)` is true.
- **NSFW custom trial card state**: Blurs description and shows `"Show NSFW content"` reveal button until global NSFW preference is enabled.

### Modals & drawers (file)
- **Delete Custom Trial ConfirmModal** (`components/common/ConfirmModal.tsx`):
  - Trigger: Clicking Delete (`Trash2`) button on a `CustomTrialCard`.
  - Contents: Header title `"Delete"` (`t.deleteTrial`), close `X` button (`"Close"`), body message `"Are you sure you want to delete this custom trial?"` (`t.confirmDelete`), confirm button `"Delete"` (`t.deleteTrial`).
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: Clicking `"Import JSON"` or `"Open Creator"` while unauthenticated, or clicking `"Log in"` inside `AuthRequiredState`.
  - Contents: Sign In / Create Account / Reset Password / Verify Email / 2FA dialog (`"Sign In"`, `"Create Account"`, `"Reset Password"`, `"Verify Email"`, login/email/username/password inputs, ALTCHA security check widget, Google sign-in button, demo account buttons in dev, legal consent checkbox & `LegalDocModal`).
- **PreferencesPromptModal** (`components/common/PreferencesPromptModal.tsx` + `components/common/AtmospherePreferencesList.tsx`):
  - Trigger: Automatically opens on mount when `!isConfigured && !promptDismissed`.
  - Contents: Title `"Experience & Atmosphere"` (`dict.smashOrPass.effectsPrefs.promptTitle`), `AtmospherePreferencesList` switches (`"Sound Effects"`, `"Music"`, `"Interactive Animations"`, `"NSFW / 18+ Content"` with `"18+"` badge, and `"Campfire Particles"` segmented buttons `"Full"` / `"Eco"` / `"Off"`), footer buttons `"Defaults"` (`continueDefaults`) and `"Settings"` (`goToSettings`).

---

## /minigames/creator

### Page & files
- Page: `app/[locale]/minigames/creator/page.tsx` (`MinigameCreatorPage`, metadata title `"LemonDBD - Trial Challenge Creator"` via `d.minigames.creatorPageTitle`)
- Client wrapper: `components/minigames/creator/MinigameCreatorClient.tsx` (`MinigameCreatorClient`)
- Creator view: `components/minigames/creator/MinigameCreator.tsx` (`MinigameCreator`)
- Round editor & autocomplete: `components/minigames/creator/RoundEditorCard.tsx` (`RoundEditorCard`), `components/minigames/CharacterAutocomplete.tsx` (`CharacterAutocomplete`)
- Shared UI: `components/common/LoadingState.tsx`, `components/common/Alert.tsx` (`ErrorNotice`), `components/common/AuthRequiredState.tsx`, `components/common/NsfwSwitch.tsx`, `components/common/Field.tsx`, `components/common/Button.tsx`, `components/common/Surface.tsx`, `components/common/Thumb.tsx`, `components/common/Badge.tsx`, `components/common/Tooltip.tsx`

### Layout elements
- **Header**:
  - Heading (`h1`): `"Trial Challenge Creator"` (`c.title`).
  - Subtitle (`p`): `"Design custom Dead by Daylight challenges with interchangeable rounds."` (`c.subtitle`).
- **Validation / Status Banners**:
  - Error banner (conditional on `errorMsg`): `CircleAlert` icon + error text (`"Challenge title is required."` `c.titleRequired`, `"You must add at least 1 round to save a challenge."` `c.atLeastOneRoundRequired`, `"Please select a target answer for round #{number}."` `c.targetRequired`, `"Couldn't add your account mark for sharing. Sign in again and retry."` `dict.tierLists.signFailed`, `"Admin authentication required."`, or API error).
  - Success banner (conditional on `successMsg`): `Check` icon + success text (`"Challenge saved to My Trials in your browser!"` or `"Challenge successfully published as official!"` `t.adminPublishSuccess`).
- **Challenge Title & Description Card** (`Surface`):
  - Challenge Title field: label `"Challenge Title *"` (`c.challengeTitleLabel`), text `Input` with placeholder `"e.g., Ultimate Killer Lore Gauntlet"` (`c.challengeTitlePlaceholder`).
  - Description field: label `"Description (Optional)"` (`c.descriptionLabel`), `Textarea` (2 rows) with placeholder `"Explain what this challenge tests or any special rules..."` (`c.descriptionPlaceholder`).
  - NSFW toggle (`NsfwSwitch` / `LabeledSwitch`): label `"Contains NSFW content"` (`t.nsfw.label`, hint `"Mark this trial as containing mature or sensitive material."` `t.nsfw.hint`).
- **Challenge Rounds Section**:
  - Section header: Heading (`h2`) `"Challenge Rounds"` (`c.roundsHeading`) + counter `"{count} Round"` / `"{count} Rounds"` (`t.roundsCount`).
  - **Round Editor Cards List** (`RoundEditorCard` per round, defaults to 2 rounds on load):
    - Card header:
      - Round number chip `#{index + 1}` + title `"Round #{number}"` (`c.roundNumber`).
      - Move Up icon button (`ChevronUp`, `aria-label="Move Up"`, tooltip `"Move Up"` `c.moveUp`, disabled on first round).
      - Move Down icon button (`ChevronDown`, `aria-label="Move Down"`, tooltip `"Move Down"` `c.moveDown`, disabled on last round).
      - Remove Round icon button (`Trash2`, danger variant, `aria-label="Remove"`, tooltip `"Remove"` `c.removeRound`).
    - Mode & Max Attempts row:
      - Mode select (`Select`): label `"Select Mode"` (`c.selectMode`), 13 options:
        - `"Classic Character Idle"` (`classic_character`)
        - `"Classic Killer Idle"` (`classic_killer`)
        - `"Classic Perk Idle"` (`classic_perk`)
        - `"Realm & Map Guesser"` (`realm_guesser`)
        - `"Pixel Avatar Guesser"` (`pixel_avatar`)
        - `"Perk Icon Distortion"` (`perk_icon`)
        - `"Killer Power Guesser"` (`killer_power`)
        - `"Voice Line Guesser"` (`voice_line`)
        - `"Hook Scream & Grunt"` (`hook_scream`)
        - `"Terror Radius Guesser"` (`terror_radius`)
        - `"Lore & Quote Guesser"` (`quote_lore`)
        - `"Emoji Riddle Guesser"` (`emoji_riddle`)
        - `"Add-on Guesser"` (`addon_guesser`)
      - Max Attempts input (`Input[type="number"]`, `min=1`, `max=20`, default `6`): label `"Max Attempts"` (`c.maxAttemptsLabel`).
    - Target Answer Selection:
      - Label: `"Target Answer"` (`c.targetItem`).
      - **When target is not selected**: `CharacterAutocomplete` combobox:
        - `Search` icon + text `Input` (`role="combobox"`, placeholder `"Search answer item..."` `c.searchTargetPlaceholder`).
        - Toggle dropdown button (`ChevronDown` icon, `aria-label="Show or hide suggestions"` `dict.minigames.toggleSuggestions`).
        - Suggestions dropdown (`role="listbox"`, up to 12/15 items): each option (`role="option"`) shows `Thumb` (image or `PerkHexIcon` fallback), item name, item subtitle (`"Realm"`, `"{role} Perk • {character_name}"`, `"Killer • {chapter_name}"`, `"Survivor • {chapter_name}"`), and role `Badge` (`"Killer"`, `"Survivor"`, `"Realm"`, etc.).
      - **When target is selected**: `Surface` preview box with `Thumb` image (`PerkHexIcon` fallback), target name, target type label (`character` / `killer` / `survivor` / `perk` / `realm`), and `"Change"` button (`c.change`) to clear selection.
    - **Mode-Specific Custom Inputs** (conditional on `round.mode`):
      - When `round.mode === 'quote_lore'`:
        - Custom Quote textarea: label `"Custom Quote / Lore Text"` (`c.customQuoteLabel`), `Textarea` with placeholder `"Enter quote text..."` (`c.customQuotePlaceholder`).
        - Custom Speaker input: label `"Speaker (Optional)"` (`c.customSpeakerLabel`), `Input` with placeholder `"e.g., The Unknown, Claudette..."` (`c.customSpeakerPlaceholder`).
      - When `round.mode === 'emoji_riddle'`:
        - Riddle Emojis input: label `"Riddle Emojis"` (`c.customEmojisLabel`), `Input` with placeholder `"e.g., 🔔👻🌲"` (`c.customEmojisPlaceholder`).
      - When `round.mode === 'killer_power'`:
        - Custom Power Name input: label `"Custom Power Name (Optional override)"` (`c.customPowerName`), `Input` with placeholder `"e.g., Bear Trap, Evil Within..."` (`c.customPowerPlaceholder`).
  - Add Round button (dashed full-width `Button`): `Plus` icon + `"Add Round"` (`c.addRound`).
- **Action Buttons Row**:
  - Save to My Trials button (`Save` icon + `"Save to My Trials"` `c.saveToMyTrials`).
  - Save & Play button (`Play` icon + `"Save & Play"` `c.saveAndPlay`, navigates to `/{locale}/minigames/play?id={saved.id}`).
  - Export JSON button (`Download` icon + `"Export JSON"` `t.exportJson`).
  - Share button (`Share2` icon + `"Share"` `t.shareTrial`; changes to `Check` icon + `"Link copied to clipboard!"` `t.linkCopied` for 4s after copying).
- **Admin Official Publishing Section** (admin-gated, conditional on `isAdmin`):
  - `Surface` card with amber border:
    - Header: `ShieldCheck` icon + `"Publish as Official Daily Trial"` (`c.publishOfficialModalTitle`).
    - Notice text (`p`): `"Only administrators can post official challenges to PostgreSQL that synchronize for all players."` (`c.adminNotice`).
    - Date input: label `"Official Challenge Date (YYYY-MM-DD)"` (`c.publishDateLabel`), `Input[type="date"]` (`officialDate`).
    - Publish button (` variant="amber"`): `PerkHexIcon` + `"Publish Challenge"` (`c.confirmPublish`) or `"Publishing..."` (`c.publishing` while `isPublishingOfficial`).

### Modes / states
- **Catalog loading state**: `LoadingState` with `DbdSpinner` (`size="lg"`) and `"Loading..."` (`dict.app.loading`).
- **Auth loading state**: Blank placeholder `<div className="min-h-100" />` while `authLoading` is true.
- **Catalog load error state**: `ErrorNotice` (`role="alert"`) with title `"Notice"` (`dict.app.notice`) and error message (`"Failed to load catalog."`).
- **Unauthenticated state**: Renders `AuthRequiredState` with `LockIcon`, heading `"Log in required"` (`t.authRequiredTitle`), subtitle `"You must be logged in to create or play custom trials."` (`t.authRequiredDesc`), and `"Log in"` button (`dict.streaks.logIn`).
- **Admin vs Non-admin state**: Non-admins do not see the `"Publish as Official Daily Trial"` section.
- **Per-round mode variants**: Switching `round.mode` resets `target_id`, updates target pool (`realm`, `perk`, `killer`, `character`), and conditionally reveals extra fields for `quote_lore`, `emoji_riddle`, or `killer_power`.

### Modals & drawers (file)
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: Clicking `"Log in"` button in `AuthRequiredState` when unauthenticated.

---

## /minigames/idle

### Page & files
- Page: `app/[locale]/minigames/idle/page.tsx` (`DbdIdlePage`, metadata title `"LemonDBD - DBD Idle: Classic Fog Guesser"` via `d.minigames.idlePageTitle`)
- Client wrapper: `components/minigames/DbdIdleClient.tsx` (`DbdIdleClient`)
- Runner & controls: `components/minigames/ChallengeRunner.tsx` (`ChallengeRunner` with `source="daily"`), `components/minigames/CharacterAutocomplete.tsx` (`CharacterAutocomplete`), `components/minigames/VictoryModal.tsx` (`VictoryModal`)
- Mode guessers: `components/minigames/guessers/ClassicCharacterGuesser.tsx`, `components/minigames/guessers/ClassicPerkGuesser.tsx`, `components/minigames/guessers/RealmGuesser.tsx`, `components/minigames/guessers/PixelAvatarGuesser.tsx`, `components/minigames/guessers/PerkIconGuesser.tsx`, `components/minigames/guessers/KillerPowerGuesser.tsx`, `components/minigames/guessers/AudioGuesser.tsx`, `components/minigames/guessers/QuoteLoreGuesser.tsx`, `components/minigames/guessers/EmojiRiddleGuesser.tsx`, `components/minigames/guessers/AddonGuesser.tsx`, `components/minigames/guessers/SolvedOverlay.tsx`
- Shared UI: `components/common/LoadingState.tsx`, `components/common/Alert.tsx` (`ErrorNotice`), `components/common/TileButton.tsx`, `components/common/Button.tsx`, `components/common/Thumb.tsx`, `components/common/InfoChip.tsx`, `components/common/Surface.tsx`, `components/common/Tooltip.tsx`

### Layout elements
- **Trial Header**:
  - Heading (`h1`): `challenge.title`.
  - Description (`p`, conditional on `challenge.description`): `challenge.description`.
- **Multi-Round Progress Pills Bar**:
  - Horizontal list of `TileButton` pills (one per round in `challenge.rounds`):
    - Status indicator: `CheckCircle2` icon (green, when won), `XCircle` icon (red, when lost), or `"R{idx + 1}"` text (when in progress / unvisited).
    - Mode label: localized mode name from `t.modes[r.mode]`.
    - Clicking a completed or active round pill switches `currentRoundIndex` to that round.
- **Active Round Card Banner**:
  - Round indicator label: `"Round {current} of {total}"` (`t.roundIndicator`).
  - Mode heading (`h2`): localized mode name (`t.modes[currentRound.mode]`).
  - Mode description (`p`): localized mode description (`t.modeDescriptions[currentRound.mode]`).
- **Attempts Remaining Counter**:
  - `RotateCcw` icon + `"{count} attempt left"` / `"{count} attempts left"` (`t.attemptsRemaining`) or `"Unlimited attempts"` (`t.unlimitedAttempts`).
- **Interactive Input & Round Action Controls** (embedded inside active guesser's `inputSlot`):
  - **When round is in progress (`!isRoundOver`)**:
    - `CharacterAutocomplete` combobox: `Search` icon, text `Input` (placeholder `"Search character, perk, or realm..."` `t.guessPlaceholder`), dropdown toggle button (`ChevronDown`, `aria-label="Show or hide suggestions"`), and suggestions listbox (`Thumb`, name, subtitle, role `Badge`).
    - Guess error alert (conditional on `guessError`, `role="alert"`): `"That guess could not be checked. Check your connection and try again."` (`t.guessFailed`).
    - Give Up button (`variant="linkMuted"`): `"Give Up & Reveal"` (`t.skipOrReveal`).
  - **When round is over (`isRoundOver`)**:
    - Result banner:
      - Won state (green): `"Trial Escaped!"` (`t.victoryTitle`).
      - Lost state (red): `"Consumed by The Entity"` (`t.defeatTitle`) + `"The correct answer was: {answer}"` (`t.revealAnswerNotice`).
    - Progression button:
      - If not on final round (`currentRoundIndex < rounds.length - 1`): primary button `"Next Round"` (`t.nextRound`) + `ArrowRight` icon.
      - If on final round: success button `Flag` icon + `"Complete Trial"` (`t.finishTrial`).
- **Active Guesser View** (rendered by `ChallengeRunner` based on `currentRound.mode`; see `/minigames/play` Modes / states for all 10 guesser UI layouts, tables, clues, and audio controls).

### Modes / states
- **Loading state**: `LoadingState` with `DbdSpinner` (`size="lg"`) and `"Loading..."` (`dict.app.loading`).
- **Error state**: `ErrorNotice` (`role="alert"`) with title `"Notice"` (`dict.app.notice`) and error text (`"Failed to load classic idle challenge."`).
- **Round states**: `in_progress` (autocomplete + Give Up active), `won` (green `"Trial Escaped!"` banner +SolvedOverlay), `lost` (red `"Consumed by The Entity"` banner + revealed answer).
- **Trial finished state (`isFinished`)**: Automatically opens `VictoryModal` (with confetti burst on complete victory).

### Modals & drawers (file)
- **VictoryModal** (`components/minigames/VictoryModal.tsx`):
  - Trigger: Opens automatically when the last round finishes (`isFinished === true`) or when clicking `"Complete Trial"` on the final round.
  - Contents:
    - Non-dismissible `Modal` (`closeButton="none"`, `closeOnEscape={false}`, `closeOnBackdropClick={false}`).
    - Title: `"Trial Escaped!"` (`t.victoryTitle`, when all rounds won; also triggers `canvas-confetti`) or `"Consumed by The Entity"` (`t.defeatTitle`).
    - Round performance breakdown (`Surface`): one row per round showing `#{idx + 1}`, localized mode name, green/red square attempt chips, and `"{count} try"` / `"{count} tries"` (`t.triesCount`).
    - Footer actions:
      - Share Results button (`Share2` icon + `"Share Results"` `t.copyResults`; switches to `Check` icon + `"Trial results copied to clipboard!"` `t.copiedToClipboard` for 3s).
      - Play Again button (conditional on `onPlayAgain`: `RotateCcw` icon + `"Play Again"` `t.playAgain`).
      - Back to Minigames Hub link button (`Home` icon + `"Back to Minigames Hub"` `t.backToMinigames`, `href="/{locale}/minigames"`).

---

## /minigames/play

### Page & files
- Page: `app/[locale]/minigames/play/page.tsx` (`PlayTrialPage`, metadata title `"LemonDBD - Minigames & DBD Idle"` via `d.minigames.pageTitle`)
- Client wrapper: `components/minigames/PlayTrialClient.tsx` (`PlayTrialClient`, `PlayTrialContent`)
- Runner & controls: `components/minigames/ChallengeRunner.tsx` (`ChallengeRunner`), `components/minigames/CharacterAutocomplete.tsx` (`CharacterAutocomplete`), `components/minigames/VictoryModal.tsx` (`VictoryModal`)
- Mode guessers:
  - `components/minigames/guessers/ClassicCharacterGuesser.tsx` (`ClassicCharacterGuesser`)
  - `components/minigames/guessers/ClassicPerkGuesser.tsx` (`ClassicPerkGuesser`)
  - `components/minigames/guessers/RealmGuesser.tsx` (`RealmGuesser`)
  - `components/minigames/guessers/PixelAvatarGuesser.tsx` (`PixelAvatarGuesser`)
  - `components/minigames/guessers/PerkIconGuesser.tsx` (`PerkIconGuesser`)
  - `components/minigames/guessers/KillerPowerGuesser.tsx` (`KillerPowerGuesser`)
  - `components/minigames/guessers/AudioGuesser.tsx` (`AudioGuesser`)
  - `components/minigames/guessers/QuoteLoreGuesser.tsx` (`QuoteLoreGuesser`)
  - `components/minigames/guessers/EmojiRiddleGuesser.tsx` (`EmojiRiddleGuesser`)
  - `components/minigames/guessers/AddonGuesser.tsx` (`AddonGuesser`)
  - `components/minigames/guessers/SolvedOverlay.tsx` (`SolvedOverlay`)
- Shared UI: `components/common/LoadingState.tsx`, `components/common/DbdSpinner.tsx`, `components/common/Alert.tsx` (`ErrorNotice`), `components/common/AuthRequiredState.tsx`, `components/common/NsfwContentGate.tsx`, `components/common/ReportContentModal.tsx`

### Layout elements
- **Custom Trial Toolbar** (conditional on `isCustomTrial`, i.e., `?id=` query param or `#challenge=` URL hash fragment):
  - Report content button (top-right): `Flag` icon + `"Report content"` (`dict.tierLists.reportButtonAria`).
- **ChallengeRunner Core Elements** (same header, multi-round progress pills bar, active round banner, attempts remaining counter, autocomplete input, `"Give Up & Reveal"`, `"Next Round"`, and `"Complete Trial"` controls as `/minigames/idle`).
- **Guesser Mode Sub-Views** (rendered inside `ChallengeRunner` depending on `currentRound.mode`):
  1. **`ClassicCharacterGuesser`** (`classic_character`, `classic_killer`, `classic`, default):
     - Renders autocomplete input above a 7-column comparison table (hidden when `guesses.length === 0`):
     - Table headers: `"Character"` (`t.attributes.character`), `"Role"` (`t.attributes.role`), `"Gender"` (`t.attributes.gender`), `"Chapter"` (`t.attributes.chapter`), `"Year"` (`t.attributes.release_year`), `"Licensed"` (`t.attributes.is_licensed`), `"Height"` (`t.attributes.height`).
     - Table rows: Character `Thumb` + name cell, followed by color-coded `AttributeCell`s (green = correct with `Check` icon, amber = partial, red = incorrect; numeric cells show `ArrowUp` or `ArrowDown` bounce icons for higher/lower hints; Licensed shows `"Yes"` / `"No"`).
  2. **`ClassicPerkGuesser`** (`classic_perk`):
     - Renders autocomplete input above a 5-column comparison table (hidden when `guesses.length === 0`):
     - Table headers: `"Perks"` (`dict.filters.perks`), `"Role"` (`t.attributes.role`), `"Characters"` (`dict.sidebar.characters`), `"Perk Types"` (`t.attributes.perk_types`), `"Licensed"` (`t.attributes.is_licensed`).
     - Table rows: Perk `Thumb` + name cell, followed by color-coded `PerkAttrCell`s for Role, Character (`"General"` fallback), localized Perk Types (`dict.perkTypes.labels`), and Teachable (`"Yes"` / `"No"`).
  3. **`RealmGuesser`** (`realm_guesser`, `realm`):
     - Cropped realm image frame (`Image`, `alt="Realm clue"` or realm name) with dynamic zoom (`240%` down to `100%`, `-30%` per wrong guess).
     - Top-left zoom pill: `Eye` icon + `"{zoomLevel}%"`.
     - `SolvedOverlay` when solved: green banner with `Check` icon + realm name.
     - Prior guesses list: cards with `MapPin` icon, guessed realm name, and `Check` (green) or `X` (red) icon.
  4. **`PixelAvatarGuesser`** (`pixel_avatar`, `pixel`):
     - Blurred character portrait frame (`Image`, `blur(18px)` down to `0px`, `-4.5px` per wrong guess, `ShieldAlert` fallback icon if no image).
     - Top-left blur pill: `PerkHexIcon` + blur value (`{blurAmount.toFixed(1)}`).
     - `SolvedOverlay` when solved: `Check` icon + character name.
     - Prior guesses list: `#1`..`#N`, character name, `Check` or `X` icon.
  5. **`PerkIconGuesser`** (`perk_icon`, `perk_distortion`, `perk`):
     - Distorted perk icon frame (`Image` with progressive zoom `250%`→`100%`, rotation `180deg`→`0deg`, grayscale `100%`→`0%`; `ShieldAlert` fallback).
     - Top-left zoom pill: `Eye` icon + `"{Math.round(zoom * 100)}%"`.
     - `SolvedOverlay` when solved: `Check` icon + perk name.
     - Prior guesses list: `#1`..`#N`, perk name, `Check` or `X` icon.
  6. **`KillerPowerGuesser`** (`killer_power`, `power`):
     - Power clue `Surface` card: red `Flame` icon tile, `"Killer Power Guesser"` label (`t.modes.killer_power`), power description text (`powerDescription`).
     - Progressive hint `InfoChip`s unlocked on wrong attempts:
       - Attempt >= 1: `"Speed: {movement_speed}"` (`t.attributes.speed`).
       - Attempt >= 2: `"Terror Radius: {terror_radius}"` (`t.attributes.terror_radius`).
       - Attempt >= 3: `"Height: {height}"` (`t.attributes.height`).
     - Solved badge: green chip with `Check` icon + `"{targetKiller.name} — {targetKiller.power_name}"`.
     - Prior guesses list: `#1`..`#N`, killer name, `Check` or `X` icon.
  7. **`AudioGuesser`** (`voice_line`, `hook_scream`, `terror_radius`, `audio`):
     - Hidden `<audio>` element with WebVTT caption track (`"[A Killer's terror radius: heartbeat and chase music]"` `t.audioCaption`) and Web Audio heartbeat synth fallback.
     - Audio player `Surface` card:
       - Top badge: spinning `Disc3` icon + `"Dead by Daylight Killer Chase & Terror Theme"` (`dict.minigames.audio.themeBadge`).
       - 14-bar animated waveform visualizer.
       - Timeline progress bar with `currentTime` and `duration` (`0:00` format, when audio metadata loaded).
       - Play / Pause button: `Play` icon + `"Listen to Killer Theme"` (`dict.minigames.audio.listenTheme`) or `Pause` icon + `"Pause Music"` (`dict.minigames.audio.pauseMusic`).
       - Mute / Unmute icon button: `Volume2` or `VolumeX` icon, `aria-label` & tooltip `"Mute"` (`dict.minigames.audio.mute`) / `"Unmute"` (`dict.minigames.audio.unmute`).
       - Progressive clue `InfoChip`s: Attempt >= 1 `"Speed: ..."`, Attempt >= 2 `"Terror Radius: ..."`, Attempt >= 3 `"Height: ..."`.
       - Solved badge: avatar image + `Check` icon + character name.
     - Prior guesses list: `#1`..`#N`, character name, `Check` or `X` icon.
  8. **`QuoteLoreGuesser`** (`quote_lore`, `quote`):
     - Quote `Surface` card: top badge (`Quote` or `BookOpen` icon + `"Lore & Quote Guesser"` `dict.minigames.modes.quote_lore`), italic `blockquote` with quote text.
     - Progressive clue `InfoChip`s:
       - Attempt >= 1: `"Entity Role: {roleHint}"`.
       - Attempt >= 2: `"Chapter: {chapterHint} ({releaseYear})"`.
       - Attempt >= 3: `"Name starts with: {letter}..."` (`dict.minigames.nameStartsWith`).
     - Solved badge: avatar/icon image + `Check` icon + `"Correct: {targetName}"` (`dict.minigames.attributeValues.correct`).
     - Prior guesses list: `#1`..`#N`, name + `({role})`, `Check` or `X` icon.
  9. **`EmojiRiddleGuesser`** (`emoji_riddle`):
     - Emoji `Surface` card: `"Emoji Riddle Guesser"` label (`t.modes.emoji_riddle`), large emoji string (`text-5xl sm:text-6xl`).
     - Progressive hint pill (Attempt >= 2): `"Perk"` (`t.attributes.perk`) or `"Character"` (`t.attributes.character`).
     - Solved badge: green chip with `Check` icon + `"Correct"` (`t.attributeValues.correct`).
     - Prior guesses list: `#1`..`#N`, name, `Check` or `X` icon.
  10. **`AddonGuesser`** (`addon_guesser`):
      - Add-on `Surface` card: amber `Package` icon tile, `"Killer Add-on Modifier"` label (`t.addonModifier`), add-on description box (`description`).
      - Progressive hint pill (Attempt >= 2): `"Hint: High Rarity Add-on"` (`t.highRarityHint`).
      - Solved badge: green chip with `Check` icon + `"Solved!"` (`t.solved`).
      - Prior guesses list: `#1`..`#N`, killer name, `Check` or `X` icon.

### Modes / states
- **Suspense fallback**: Full-screen `DbdSpinner` (`size="lg"`).
- **Data/Auth loading state**: `LoadingState` with `DbdSpinner` and `"Loading..."` (`dict.app.loading`).
- **Query / Fragment source modes**:
  - `?type=daily&mode=...` (or default): loads daily challenge (`source="daily"`).
  - `?type=repeatable&mode=...` (or `?mode=...`): loads repeatable single-round challenge (`source="repeatable"`).
  - `?id=<customId>`: loads saved custom trial from browser storage (`source="custom"`).
  - `#challenge=<encoded>`: decodes shared custom trial from URL hash (`source="custom"`), verifies revocation & signature via `checkDocument('minigame', ...)`.
- **Auth-gated state (custom or shared trials only)**: When `isCustomTrial && !isAuthenticated`, renders `AuthRequiredState` with heading `"Log in required"` (`dict.minigames.authRequiredTitle`), subtitle `"You must be logged in to create or play custom trials."` (`dict.minigames.authRequiredDesc`), and `"Log in"` button.
- **Error / Revoked / Unsigned states**: Renders `ErrorNotice` (`role="alert"`) with title `"Notice"` (`dict.app.notice`) and message (`"Custom trial not found in this browser."`, `"This content was removed by moderators for violating the community guidelines, so it can no longer be imported or played."` `dict.tierLists.contentRevoked`, `"This content has no valid account mark, so it can't be imported or played. Ask its author to share it again from their account."` `dict.tierLists.unsignedContent`, or `"Failed to load challenge."`).
- **NSFW gated state**: When `challenge.is_nsfw === true` and `nsfwGate.gated`, renders `NsfwContentGate` (`data-testid="nsfw-content-gate"`) with `MatureIcon`, heading `"Contains NSFW Content"` (`dict.minigames.nsfw.title`), description `"This trial is flagged as containing mature/NSFW content. Confirm you want to play it."` (`dict.minigames.nsfw.description`), and confirm button `"Click to Play"` (`dict.minigames.nsfw.confirm`).

### Modals & drawers (file)
- **ReportContentModal** (`components/common/ReportContentModal.tsx`):
  - Trigger: Clicking `"Report content"` (`Flag` button) on a custom/shared trial.
  - Contents: Title `"Report content"` (`dict.tierLists.reportTitle`), content title subtitle (`challenge.title`), unsigned notice if `!manifest` (`"This copy has no valid account mark..."` `dict.tierLists.reportNoManifest`), Reason dropdown (`CustomDropdown` with `"Hate speech or symbols"`, `"Harassment or bullying"`, `"Explicit or NSFW content"`, `"Illegal or dangerous content"`, `"Other violation"`), Additional details textarea (`"Additional details (optional)"`, placeholder `"Explain what makes this content inappropriate..."`), and `"Submit report"` (`dict.tierLists.reportSubmit`) / `"Submitting..."` button. Also has states for paused reporting (`"Reporting is paused at the moment..."`), already banned (`"This content was already banned and has been removed."`), success (`"Report submitted. Thank you for helping keep LemonDBD safe."`), and error (`"Failed to submit report. Please try again."`).
- **VictoryModal** (`components/minigames/VictoryModal.tsx`):
  - Trigger: Finishing the final round of the trial (`isFinished === true`).
  - Contents: Same as `/minigames/idle` (`"Trial Escaped!"` / `"Consumed by The Entity"`, round breakdown, `"Share Results"`, `"Back to Minigames Hub"`).
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: Clicking `"Log in"` on `AuthRequiredState` for custom/shared trials.

---

## /smash-or-pass

### Page & files
- Page: `app/[locale]/smash-or-pass/page.tsx` (`SmashOrPassPage`, metadata title `"LemonDBD - Smash or Pass | Dead by Daylight Romance"` via `d.app.smashOrPassPageTitle`)
- Feature entry: `features/smash-or-pass/index.ts`
- Client wrapper & skeletons: `components/smash-or-pass/SmashOrPassClient.tsx` (`SmashOrPassClient`), `components/smash-or-pass/SmashOrPassSkeleton.tsx` (`SmashHubSkeleton`, `SmashLeaderboardSkeleton`)
- Hub orchestrator: `components/smash-or-pass/SmashOrPassHub.tsx` (`SmashOrPassHub`)
- Hub subcomponents:
  - `components/smash-or-pass/hub/HubHeader.tsx` (`HubHeader`)
  - `components/smash-or-pass/hub/HubFilterDrawer.tsx` (`HubFilterDrawer`)
  - `components/smash-or-pass/hub/CardArena.tsx` (`CardArena`)
  - `components/smash-or-pass/hub/CardStack.tsx` (`CardStack`)
  - `components/smash-or-pass/hub/DeckFinished.tsx` (`DeckFinished`)
  - `components/smash-or-pass/hub/NsfwGate.tsx` (`NsfwGate`)
  - `components/smash-or-pass/hub/CalmVoteMark.tsx` (`CalmVoteMark`)
  - `components/smash-or-pass/hub/HowToPlayModal.tsx` (`HowToPlayModal`)
  - `components/smash-or-pass/hub/HubSettingsModal.tsx` (`HubSettingsModal`)
  - `components/smash-or-pass/hub/HubModals.tsx` (`HubModals`)
  - `components/smash-or-pass/hub/RosterModals.tsx` (`RosterModals`)
  - `components/smash-or-pass/hub/lazyParts.ts`
- Cards & visual layers:
  - `components/smash-or-pass/CharacterCard.tsx` (`CharacterCard`)
  - `components/smash-or-pass/card/CardAvatarImage.tsx` (`CardAvatarImage`)
  - `components/smash-or-pass/card/CardBackFace.tsx` (`CardBackFace`)
  - `components/smash-or-pass/CardDisintegrationOverlay.tsx` (`CardDisintegrationOverlay`)
  - `components/smash-or-pass/FloatingLoreScattered.tsx` (`FloatingLoreScattered`)
  - `components/smash-or-pass/InteractiveDragBackground.tsx` (`InteractiveDragBackground`)
  - `components/smash-or-pass/SmashAnimations.tsx` (`SmashAnimations`)
  - `components/smash-or-pass/TactileKeycaps.tsx` (`TactileKeycaps`)
- Feature modals & parts:
  - `components/smash-or-pass/RosterSelectModal.tsx` (`RosterSelectModal`), `components/smash-or-pass/roster-select/RosterCarouselCard.tsx` (`RosterCarouselCard`), `components/smash-or-pass/roster-select/RosterPickerFooter.tsx` (`RosterHeaderActions`, `RosterPickerFooter`)
  - `components/smash-or-pass/SmashRosterImportModal.tsx` (`SmashRosterImportModal`), `components/common/ImportModal.tsx` (`ImportModal`)
  - `components/smash-or-pass/SmashRosterExportModal.tsx` (`SmashRosterExportModal`), `components/common/ExportModal.tsx` (`ExportModal`)
  - `components/smash-or-pass/SmashLeaderboardModal.tsx` (`SmashLeaderboardModal`), `components/smash-or-pass/SmashLeaderboardParts.tsx` (`CandidateRow`)
  - `components/smash-or-pass/CharacterStatsModal.tsx` (`CharacterStatsModal`)
  - `components/smash-or-pass/RomancePersonaModal.tsx` (`RomancePersonaModal`), `components/smash-or-pass/persona/PersonaBreakdown.tsx` (`PersonaBreakdown`), `components/smash-or-pass/persona/PersonaShareView.tsx` (`PersonaShareView`), `components/smash-or-pass/persona/socialLinks.tsx` (`buildSocialLinks`)
- Shared UI: `components/common/PreferencesPromptModal.tsx`, `components/common/AtmospherePreferencesList.tsx`, `components/common/ReportContentModal.tsx`, `components/common/AuthRequiredState.tsx`, `components/common/Alert.tsx`, `components/common/Toast.tsx`, `components/AuthModal.tsx`

### Layout elements
- **Background & Vote Feedback Layers**:
  - `InteractiveDragBackground`: Full-screen `<canvas>` rendering campfire embers (when `backgroundAnimation !== 'off'`) and drag/vote reactive glow.
  - `SmashAnimations` (when `effectsEnabled` is true): Full-screen `<canvas>` particle burst + vignette overlay flashing `HeartIcon` + `"Smash"` (`controls.smash`), `Flame` + `"Super Smash"` (`controls.superSmash`), or `PassIcon` + `"Pass"` (`controls.pass`).
  - `CalmVoteMark` (when `effectsEnabled` is false): Centered non-flashing `HeartIcon` (smash) or `PassIcon` (pass) that gently fades in and out.
  - `FloatingLoreScattered`: Ambient flanking elements around the active card:
    - Left & right giant uppercase watermarks (`FitText` for `leftWatermark` and `rightWatermark`).
    - Left flanking wing (wide screens `@hub-lg/hub:flex`):
      - Dating Archetype / Vibe card (`"Dating Vibe"` / `"Archetype"` label + `profile.dating_vibe || charTitle` + `charTagline`).
      - Turn-on card (`"Turn-on:"` label + `profile.turn_on`).
    - Right flanking wing (wide screens `@hub-lg/hub:flex`):
      - Signature Quote card (`"Quote"` label + italic `charQuote`).
      - Dealbreaker card (`"Dealbreaker:"` label + `profile.dealbreaker`).
- **Command Dock Header (`HubHeader`, `header[data-hub-header]`)**:
  - **Roster Selector Pill** (center on desktop, top row on mobile, flanked by two pulsing `HeartIcon`s):
    - `Button` (`variant="soft"`) with roster cover thumbnail (`MotionImg`), active roster name (`rosterName`), candidate count red `Badge` (`rosterBadgeCount`), and `ChevronDown` icon. Clicking opens `RosterSelectModal`.
  - **Live Session Figures**:
    - Remaining count: `CardStackIcon` + `{remainingInDeck}` + `"left"` (`hud.left`).
    - Session Smashes: `HeartIcon` + `{sessionSmashes}`.
    - Session Passes: `PassIcon` + `{sessionPasses}`.
    - Session Smash Rate: `{sessionSmashRate}%` (`percentSign`).
  - **Dock Action Icon Buttons** (each wrapped in `Tooltip`):
    - Filter button (`SlidersHorizontal` icon, `aria-label="Filter Candidates"`, tooltip `"Filter Candidates"` / `"Filter by survivor/killer role and character gender."` `tooltips.filter`, `tooltips.filterDesc`). Toggles `HubFilterDrawer`.
    - Effects & Preferences button (`Settings` icon, `aria-label="Effects, sounds and music"`, tooltip `"Effects, sounds and music"` / `"Change which effects, sounds and music play."` `effectsPrefs.button`, `effectsPrefs.buttonDesc`). Opens `HubSettingsModal`.
    - Romance Archetype button (`User` icon, `aria-label="Trial Romance Archetype"`, tooltip `"Trial Romance Archetype"` / `"Discover your dating persona from your vote trends."` `modals.personaTitle`, `tooltips.archetypeDesc`). Opens `RomancePersonaModal`.
    - Hall of Fame Leaderboard button (official rosters only, `!isLocalRosterSlug`): `BarChart2` icon, `aria-label="Hall of Fame Leaderboard"`, tooltip `"Hall of Fame Leaderboard"` / `"Global community smash rankings and tier lists."` (`modals.leaderboardTitle`, `tooltips.leaderboardDesc`). Opens `SmashLeaderboardModal`.
    - Shuffle button (wide `@hub-md/hub:flex`): `Shuffle` icon, `aria-label="Shuffle Remaining"`, tooltip `"Shuffle Remaining"` / `"Randomize the remaining candidates in your deck."` (`tooltips.shuffle`, `tooltips.shuffleDesc`).
    - Reset Votes button (wide `@hub-md/hub:flex`): `RotateCcw` icon, `aria-label="Reset Voting Data"`, tooltip `"Reset Voting Data"` / `"Clear your votes and restore all candidate cards."` (`tooltips.resetAllVotes`, `tooltips.resetDesc`). Opens Reset Confirmation Modal.
    - How to Play button (wide `@hub-md/hub:flex`): `HelpCircle` icon, `aria-label="How to Play & Keybindings"`, tooltip `"How to Play & Keybindings"` / `"View controls, keycaps, and trial dating rules."` (`tooltips.howToPlay`, `tooltips.howToPlayDesc`). Opens `HowToPlayModal`.
    - **Narrow Hub "More actions" Popover Menu** (`@hub-md/hub:hidden`):
      - Trigger button (`Ellipsis` icon, `aria-label="More actions"` `tooltips.moreActions`).
      - `Popover` menu (`role="menu"`) with 3 `MenuItem`s: `Shuffle` `"Shuffle Remaining"`, `RotateCcw` `"Reset Voting Data"`, `HelpCircle` `"How to Play & Keybindings"`.
  - **Expandable Filter Drawer (`HubFilterDrawer`)** (renders inside `HubHeader` below the dock when `isFilterDrawerOpen`):
    - Role `SegmentedControl` (`ariaLabel="All Roles"`): `"All Roles"` (`filters.allRoles`), `"Survivors"` (`filters.survivors`), `"Killers"` (`filters.killers`), or custom roster roles.
    - Gender `SegmentedControl` (`ariaLabel="All Genders"`): `"All Genders"` (`filters.allGenders`), `"Female"` (`filters.femaleOnly`), `"Male"` (`filters.maleOnly`), `"Monsters & Eldritch"` (`filters.monsters`), or custom roster genders.
- **Reset Failed Alert** (conditional on `resetFailed`):
  - `Alert` with `"Your votes could not be reset. Check your connection and try again."` (`dict.smashOrPass.resetFailed`) and dismiss button (`"Close"`).
- **Card Arena (`CardArena` -> `CardStack` -> `CharacterCard`)**:
  - 3-card depth stack (`thirdCharacter` depth 2, `nextCharacter` depth 1, `currentCharacter` active top card `data-smash-card="top"`).
  - **Active Top `CharacterCard`**:
    - Swipe/drag indicators on drag: top-left red `HeartIcon` badge on right drag (`dragOffset.x > 15`), top-right `PassIcon` badge on left drag (`dragOffset.x < -15`).
    - `CardDisintegrationOverlay` `<canvas>` during card exit when `effects` enabled.
    - **Front Face**:
      - Portrait image (`CardAvatarImage` with progressive thumbnail-to-full loading and `.webp`/`.png` fallback).
      - Top-left Flip button (`CardFlipIcon`, `aria-label="Flip card"`, tooltip `"Flip card"` `flipToDatingProfile`).
      - Top-right Zoom button (when `hasPortrait` is true: `ZoomIn` icon, `aria-label="Zoom Full Portrait"`, tooltip `"Zoom Full Portrait"` `zoomFullPortrait`).
      - Bottom-left Pass button (`PassIcon`, `aria-label="Pass"` `pass`).
      - Bottom-right Smash button (`HeartIcon`, `aria-label="Smash"` `smash`).
    - **Back Face (`CardBackFace`)**:
      - Top bar: Flip Back button (`CardFlipIcon`, `aria-label="Flip Back to Artwork"`, tooltip `"Flip Back to Artwork"` `flipBack`), character name (`h3`), role `Badge` (`"Survivors"` / `"Killers"` or custom role).
      - Scrollable lore body (`data-card-lore`):
        - Dating Vibe box (`"Dating Vibe"` or `customLabels.dating_vibe` + `profile.dating_vibe`).
        - Narrow-screen fallback (`@hub-lg/hub:hidden`): Turn-on box (`"Turn-on:"` + `profile.turn_on`) and Dealbreaker box (`"Dealbreaker:"` + `profile.dealbreaker`).
        - Green & Red Flags box: `"Green Flags"` (`greenFlags` bullet list) and `"Red Flags"` (`redFlags` bullet list).
        - Bio box (when `rosterMode !== 'simple'` and `charBio`): `"Lore & Personality"` (`loreAndPersonality`) + `charBio`.
        - Trial Rumor / Meme box (when `rosterMode !== 'simple'` and `charMeme`): `"Trial Rumor & Meme"` (`trialRumor` or `customLabels.meme`) + `charMeme`.
        - Narrow-screen quote/tagline fallback (`@hub-lg/hub:hidden`): italic `charTagline` and `"Quote"` (`loreLabels.signatureQuote` or `customLabels.quote`) + `charQuote`.
      - Bottom actions: Pass icon button (`PassIcon`, `aria-label="Pass"`) and Smash icon button (`HeartIcon`, `aria-label="Smash"`).
- **Roster Switch Overlay Toast/Animation** (in `RosterModals`, conditional on `rosterSwitchEffect`):
  - Full-screen 1.2s animated overlay with bouncing `HeartIcon` and uppercase roster display name.
- **Delete Error Toast** (in `RosterModals`, conditional on `deleteError`):
  - Top-right red `Toast` with error message and dismiss button (`"Dismiss"` `creator.closeToast`).

### Modes / states
- **Suspense / Initial Skeleton state**: `SmashHubSkeleton` (`output[aria-busy="true"]`) with blood-accent `DbdSpinner` and label `"Loading Smash or Pass arena..."` (`dict.smashOrPass.loadingArena`).
- **Deck Loading state**: Animated pulsing card frame inside `CardArena` with `HeartIcon`, `"Loading {activeRoster.name} from Database..."` (`loadingRosterPrefix`, `loadingRosterSuffix`), and red shimmer bar.
- **NSFW Roster Gate state**: When `activeRoster.is_nsfw && !nsfwAcknowledged`, `CardArena` renders `NsfwGate` (`data-testid="nsfw-content-gate"`) with `MatureIcon`, heading `"Contains NSFW Content"` (`nsfw.title`), description `"This roster is flagged as containing mature/NSFW content. Confirm you want to view it."` (`nsfw.description`), and primary button `"Click to View"` (`nsfw.confirm`, `data-testid="nsfw-content-gate-confirm"`).
- **Unauthenticated Custom Roster state**: When `isLocalRosterSlug(selectedRosterSlug) && !isAuthenticated`, renders `AuthRequiredState` with heading `"Log in required"` (`authRequiredTitle`), subtitle `"You must be logged in to create or play custom rosters."` (`authRequiredDesc`), and `"Log in"` button.
- **Deck Finished / Empty state (`DeckFinished`)**: When `currentCharacter` is null (all candidates voted or no filter matches):
  - `EmptyState` (`variant="solid"`) with title `"No Candidates Found"` (`empty.title`) and subtitle `"Try adjusting your filters or resetting the search."` (`empty.subtitle`).
  - 2-column session stats summary: `"Smash"` (`smash`) count `{sessionSmashes}` and `"Pass"` (`pass`) count `{sessionPasses}`.
  - Action buttons: primary button `"View Romance Archetype"` (`hud.archetype`, opens `RomancePersonaModal`) and secondary button `RotateCcw` + `"Play Again"` (`empty.resetAction`, opens Reset Confirmation Modal).
- **Effects On vs Calm Mode (`!effectsEnabled`)**: Disables CSS animations (`[&_*]:animate-none!`), disables card tilt/fling/disintegration particles, and replaces `SmashAnimations` with `CalmVoteMark`.
- **Simple vs Full Roster Mode (`activeRoster.roster_mode`)**: In `'simple'` mode, `CardBackFace` hides Bio and Trial Rumor/Meme sections.
- **Shared Archetype URL Query Mode (`?shared_archetype=...`)**: Automatically decodes payload on mount and opens `RomancePersonaModal` in shared result mode (`"Shared Romance Archetype"`).

### Modals & drawers (file)
- **HubFilterDrawer** (`components/smash-or-pass/hub/HubFilterDrawer.tsx`):
  - Trigger: Clicking Filter button (`SlidersHorizontal`) in `HubHeader` (closes on `Escape` or re-click).
  - Contents: Role `SegmentedControl` and Gender `SegmentedControl`.
- **Portrait Zoom Lightbox Modal** (`components/smash-or-pass/CharacterCard.tsx`):
  - Trigger: Clicking Zoom (`ZoomIn`) button on the top-right of `CharacterCard` front face.
  - Contents: `Modal` (`variant="lightbox"`, `size="2xl"`) with floating pill close button (`ZoomCloseButton`, `X` icon, `aria-label="Close"`), full-size `CardAvatarImage`, and bottom gradient caption with `character.name` (`h3`) and italic `charTagline`.
- **HowToPlayModal** (`components/smash-or-pass/hub/HowToPlayModal.tsx` + `components/smash-or-pass/TactileKeycaps.tsx`):
  - Trigger: Clicking Help (`HelpCircle`) button in `HubHeader` (or `"How to Play & Keybindings"` in narrow More menu, or pressing `?` / `/` hotkey).
  - Contents:
    - Title: `"How to Play Smash or Pass"` (`howToPlayModal.title`).
    - Section 1 — `"Swipe or Drag Cards"` (`howToPlayModal.swipeTitle`): `SwipeDemo` showing `PassIcon` `"← Pass"` (`passBadge`), animated swaying card, and `HeartIcon` `"Smash →"` (`smashBadge`).
    - Section 2 — `"On-Card Action Icons"` (`howToPlayModal.iconsTitle`): `CardFlipIcon` `"Flip Card"` (`flipCardBadge`) and `ZoomIn` `"Zoom Art"` (`zoomArtBadge`).
    - Section 3 — `"Tactile Keyboard Keycaps"` (`howToPlayModal.keycapsTitle`, hidden on coarse pointers): `TactileKeycaps` with 4 interactive keycap `TileButton`s:
      - `←` / `A` (`"Pass (← / A)"`)
      - `↑` / `W` (`"Info (↑ / W)"`)
      - `→` / `D` (`"Smash (→ / D)"`)
      - `R` / `RESET` (`"Reset (R / RESET)"`)
      - Subtitle hint: `"Use arrow keys or drag to vote"` (`controls.hint`).
- **HubSettingsModal** (`components/smash-or-pass/hub/HubSettingsModal.tsx` + `components/common/AtmospherePreferencesList.tsx`):
  - Trigger: Clicking Settings (`Settings`) button in `HubHeader`.
  - Contents: Title `"Effects, sounds and music"` (`effectsPrefs.button`, `testId="smash-settings-modal"`), `AtmospherePreferencesList` (switches for `"Sound Effects"`, `"Music"`, `"Interactive Animations"`, `"NSFW / 18+ Content"`, and `"Campfire Particles"` `"Full"` / `"Eco"` / `"Off"` buttons).
- **PreferencesPromptModal** (`components/common/PreferencesPromptModal.tsx`):
  - Trigger: Opens automatically on entry when `(!smashAck || !isConfigured) && !promptDismissed` (`mode="smash"`).
  - Contents:
    - Title: `"Trial Safety & Atmosphere"` (`effectsPrefs.smashPromptTitle`, `testId="preferences-prompt-modal"`).
    - Amber Photosensitivity Warning banner: `WarningIcon` + `"Photosensitivity Warning"` (`effectsPrefs.epilepsyWarningTitle`) + `"Features rapid animations, flashes, and sudden sounds that may trigger seizures or discomfort. You can disable effects in Settings."` (`effectsPrefs.epilepsyWarningBody`).
    - `AtmospherePreferencesList`.
    - Footer buttons: `"Settings"` (`effectsPrefs.goToSettings`, navigates to `/{locale}/settings`) and `"Enter Trial"` (`effectsPrefs.enterTrial`).
- **RosterSelectModal** (`components/smash-or-pass/RosterSelectModal.tsx` + `roster-select/RosterCarouselCard.tsx` + `roster-select/RosterPickerFooter.tsx`):
  - Trigger: Clicking the Roster Selector pill in `HubHeader`.
  - Contents:
    - Top-left `SegmentedControl`: `"Official ({officialRosters.length})"` (`picker.officialTab`) and `"Custom ({customRosters.length})"` (`picker.customTab`).
    - Floating close `X` button (`"Close"`).
    - Heading (`h2`): `"SELECT ROSTER"` (`selectRoster`).
    - `RosterHeaderActions` icon buttons row (each with tooltip):
      - Create Roster (`Plus` icon, `"Create Roster"` `picker.createRoster`; navigates to `/{locale}/smash-or-pass/create`, auth-gated via `useSignInThen`).
      - Import Roster (`UploadIcon`, `"Import"` `picker.importRoster`; opens `SmashRosterImportModal`, auth-gated via `useSignInThen`).
      - When centered roster is local (`is_local`): Edit (`Pencil`, `"Edit"` `picker.editRoster`), Export (`Download`, `"Export"` `picker.exportRoster`), Report (`Flag`, `"Report content"` `dict.tierLists.reportButtonAria`), Delete (`Trash2`, `"Delete"` `picker.deleteRoster`).
      - When centered roster is official and user is Admin (`!is_local && isAdmin`): Edit (`Pencil`, `"Edit"`, navigates to `/{locale}/smash-or-pass/create?official={slug}`) and Delete (`Trash2`, `"Delete"`).
    - **3D Carousel Arena**:
      - Previous / Next floating round buttons (when `N > 1`): `ChevronIcon` (`aria-label="Previous Page"` / `"Next Page"`).
      - **Custom Tab Unauthenticated state**: `AuthRequiredState` (`variant="compact"`) with `"Log in to use custom rosters"` (`loginToManage`) and `"Log in to create, import, and play custom Smash or Pass rosters."` (`loginToManageDesc`).
      - **Empty state (`N === 0`)**: `EmptyState` (`CardStackIcon`, title `"No Custom Rosters Found"` / `"No Rosters Found"`, subtitle `"You haven't created any custom rosters yet in this browser."` / `"No rosters match this filter."`).
      - **Carousel Cards (`RosterCarouselCard`)**:
        - Cover image (blurred when `is_nsfw && !globalNsfw`, with centered `"Show NSFW"` `nsfw.reveal` button on center card).
        - Top-left candidate count pill (`CardStackIcon` + `{count}`).
        - Top-right badges: `"NSFW"` (`MatureIcon` + `nsfw.badge`, `data-testid="roster-nsfw-badge"`) and `"ACTIVE"` (`CheckIcon` + `active`).
        - Center overlay icon: pulsing `HeartIcon` (enabled roster) or `LockIcon` (disabled/coming soon roster).
        - Bottom overlay: local ownership badge (`"Yours"` `picker.yours`, `@{author_login}`, or `"Imported"` `picker.imported`, `data-testid="roster-local-badge"`), roster name (`h3`), and description (`p`).
    - Footer (`RosterPickerFooter`):
      - Hint text: `"Grab and spin. Whatever card is in the center will be chosen."` (`dwellHint`).
      - Primary button: `Check` icon + `"Confirm"` (`picker.confirm`), or disabled button `LockIcon` + `"Coming Soon"` (`comingSoon`) when `is_active === false`.
- **Delete Roster Confirmation Modal** (`components/smash-or-pass/hub/RosterModals.tsx`):
  - Trigger: Clicking Delete (`Trash2`) in `RosterSelectModal`.
  - Contents: `Modal` (`variant="confirm"`, title `"Delete this roster?"` `picker.deleteConfirmTitle`), body `"This permanently removes "{name}" from this browser. This cannot be undone."` (`picker.deleteConfirmDesc`), danger button `"Yes, Delete"` (`picker.deleteConfirmAction`).
- **SmashRosterImportModal** (`components/smash-or-pass/SmashRosterImportModal.tsx` + `components/common/ImportModal.tsx`):
  - Trigger: Clicking Import (`UploadIcon`) in `RosterSelectModal`.
  - Contents:
    - Title: `"Import a Roster"` (`importModal.title`).
    - Shared link banner (when `sharePayload` present): `"A shared roster link was detected and loaded below."` (`importModal.sharedLinkDetected`).
    - Label `"Paste roster JSON"` (`importModal.pasteLabel`) + `"Upload file"` button (`Upload` icon + `importModal.uploadFile` + hidden `.json` file input).
    - JSON `Textarea` (`#smash-roster-import-json`, placeholder `"Paste a roster JSON document here..."` `importModal.pastePlaceholder`).
    - Status / validation area:
      - Error `Notice`s (`fileError`, parse errors `invalidJson` / `notAnObject` / `wrongFormat` / `unsupportedVersion` / `tooLarge` / `noEntities` / `invalidShareLink`, `contentRevoked`, `unsignedContent`, storage `saveFailedQuota` / `saveFailedUnavailable`).
      - `ImportPreview`: `"Importing "{name}" with {count} entity/entities"` (`importModal.preview`).
      - Warning `Notice`s (`droppedEntities`, `droppedImages`, `truncated`).
    - Footer button: `Upload` icon + `"Import"` (`importModal.importAction`, disabled until valid, signed, and non-revoked).
- **SmashRosterExportModal** (`components/smash-or-pass/SmashRosterExportModal.tsx` + `components/common/ExportModal.tsx`):
  - Trigger: Clicking Export (`Download`) in `RosterSelectModal`.
  - Contents:
    - Title: `"Export Roster"` (`exportModal.title`).
    - Sign error `Alert` (if signing fails): `"Couldn't add your account mark for sharing. Sign in again and retry."` (`dict.tierLists.signFailed`).
    - Shareable link section: label `"Shareable link"` (`exportModal.shareLinkLabel`), read-only `Input` (`#smash-roster-share-link`, shows `"Preparing link..."` while signing), primary button `Link2` / `Check` + `"Copy Link"` / `"Copied!"` / `"Couldn't copy"`, and amber warning if link > 8,000 chars (`"This link is {count} characters long..."` `exportModal.linkTooLong`).
    - Roster JSON section: label `"Roster JSON"` (`exportModal.jsonLabel`), read-only `Textarea` (`#smash-roster-json`), `"Download File"` button (`Download` icon + `exportModal.downloadFile`), and `"Copy JSON"` button (`Copy` / `Check` icon + `exportModal.copyJson`).
- **ReportContentModal** (`components/common/ReportContentModal.tsx`, in `RosterModals.tsx`):
  - Trigger: Clicking Report (`Flag`) on a custom roster in `RosterSelectModal`.
  - Contents: Same `ReportContentModal` (`contentType="smash_roster"`).
- **SmashLeaderboardModal** (`components/smash-or-pass/SmashLeaderboardModal.tsx` + `SmashLeaderboardParts.tsx`):
  - Trigger: Clicking Hall of Fame (`BarChart2`) button in `HubHeader`.
  - Contents:
    - Title: `"Hall of Fame Leaderboard"` (`modals.leaderboardTitle`) + edition subtitle (`editionName`).
    - Filter & Search Toolbar:
      - Search `Input` (`Search` icon, placeholder `"Search candidates or leaderboard..."` `search`, clear `X` button `"Clear search"`).
      - Gender `CustomDropdown` (`User` icon): `"All Genders"`, `"Female"`, `"Male"`, `"Monsters & Eldritch"`.
      - Sort `CustomDropdown` (`ArrowDownUp` icon): `"Smash Rate (%)"` (`sortSmashRate`), `"Total Votes"` (`sortTotalVotes`), `"Most Smashes"` (`sortMostSmashes`).
      - View Mode toggle icon button (`Layers` icon, toggles between `'flat'` and `'grouped'`, tooltip `"Group by Tier"` / `"Ranked List"`).
    - **Empty community votes state**: `HeartIcon` tile, heading `"No Community Votes Yet"` (`noCommunityVotesTitle`), description `"Be the first Entity Champion to rate candidates! Cast votes to populate the Hall of Fame rankings."` (`noCommunityVotesDesc`).
    - **No filter matches state**: `"No candidates found matching your filter criteria."` (`noCandidatesFound`).
    - **Ranked List (`viewMode === 'flat'`)**: Infinite-scrolling list of `CandidateRow`s (35 per page).
    - **Grouped by Tier (`viewMode === 'grouped'`)**: 4 tier sections with header banner (icon, tier name, percentage range, `{count} candidates`) + list of `CandidateRow`s:
      - `"God Tier"` (`>= 80%`, `RankFirstIcon`, amber)
      - `"Fatal Attraction"` (`60% - 79%`, `Flame`, red)
      - `"Friendzone"` (`40% - 59%`, `FriendzoneIcon`, neutral)
      - `"Eldritch Void"` (`< 40%`, `EldritchVoidIcon`, muted)
    - **Each `CandidateRow`**:
      - Rank badge (`RankFirstIcon` gold medal for #1, `RankPlacedIcon` silver/bronze for #2/#3, or `#{index + 1}`).
      - Avatar thumbnail with red `HeartIcon` badge if user smashed (`tooltip="You smashed this candidate"` `youSmashedThis`).
      - Candidate name, role `Badge` (`"Survivor"` / `"Killer"`), tier icon chip (or `"?"` unrated chip), italic archetype/tagline subtitle.
      - Right stats: Smash/Pass percentage bar (`{smashRate}%` vs `{100 - smashRate}%`), `{totalVotes} votes`, and numeric `HeartIcon` `{smashCount}` / `PassIcon` `{passCount}`.
      - Clicking a row opens `CharacterStatsModal` for that candidate.
- **CharacterStatsModal** (`components/smash-or-pass/CharacterStatsModal.tsx`):
  - Trigger: Clicking a `CandidateRow` in `SmashLeaderboardModal`, pressing `W` / `ArrowUp` hotkey on an active card, or clicking the `↑ / W` keycap in `HowToPlayModal`.
  - Contents:
    - Header: Candidate `name` title + role `Badge`.
    - Portrait thumbnail (`MotionImg`).
    - Consensus Tier card: Tier icon, `"Community Consensus"` (`communityConsensus`), tier name (`"God Tier"`, `"Fatal Attraction"`, `"Friendzone"`, `"Eldritch Void"`), `"Community Smash Rate"` (`statsDetail.communitySmashRate`), `HeartIcon` + `{smashRate}%`.
    - Vote Breakdown `Surface`: `HeartIcon` `{smashCount} Smashes ({smashPct}%)` vs `PassIcon` `{passCount} Passes ({passPct}%)`, dual-color bar, `"Total Votes: {totalVotes}"`, and conditional `"Global Rank: #{stats.rank}"`.
    - Lore Quote `Surface` (conditional on `quote`): `Quote` icon + `"Quote"` + italic quote text.
    - Bio section (conditional on `bio`): `"Bio"` label + bio text box.
    - Turn-on & Dealbreaker grid (conditional): `"Turn-on:"` box and `"Dealbreaker:"` box.
- **RomancePersonaModal** (`components/smash-or-pass/RomancePersonaModal.tsx` + `persona/PersonaBreakdown.tsx` + `persona/PersonaShareView.tsx`):
  - Trigger: Clicking Romance Archetype (`User`) button in `HubHeader`, clicking `"View Romance Archetype"` in `DeckFinished`, or visiting URL with `?shared_archetype=...`.
  - Contents (3 internal views):
    1. **Empty / Untapped Soul View (`!hasVotes`)**:
       - Title `"Trial Romance Archetype"` (`modals.personaTitle`).
       - `Compass` icon, heading `"The Untapped Soul"` (`personaArchetypes.untappedSoul.title`), subtitle `"Your trial desires remain veiled in the Fog."`, description `"Evaluate candidates to unlock your psychological profile, dating analysis, and affinity balance."`, and primary button `"Start Rating Candidates"` (`startVoting`) + `ArrowRight` icon.
    2. **Persona Breakdown View (`PersonaBreakdown`, default when `hasVotes`)**:
       - Title `"Trial Romance Archetype"` (`modals.personaTitle`) or `"Shared Romance Archetype"` (`modals.sharedPersonaTitle` when `isSharedView`).
       - Archetype header section: optional `"Friend's Shared Result"` (`sharedBadge`), `"Trial Romance Archetype"`, archetype `persona.title` (`"The Fog Romantic"`, `"Eldritch Devotee"`, `"Red Stain Addict"`, `"Campfire Soulmate"`, `"Entity's Paramour"`, `"Cold-Hearted Pragmatist"`, or custom archetype title) and `persona.subtitle`.
       - Dating Psychology section: `"Dating Psychology Breakdown"` (`datingPsychology`) + `persona.description`.
       - 3-column metrics row: `"Total Evaluated:"` (`{totalVotes} candidates`), `"Total Smashes"` (`HeartIcon` + `{displayTotalSmashes}`), `"Smash Rate"` (`{smashRate}%`).
       - Faction Affinity Balance section: `"Faction Affinity Balance"` (`roleAffinity`), `"Survivors"` card (`{smashedSurvivors} ({survivorAffinity}%)`), `"Killers"` card (`{smashedKillers} ({killerAffinity}%)`), and green/red split progress bar.
       - Bottom actions:
         - When `isSharedView`: primary button `"Play & Discover Yours!"` (`playToDiscover`).
         - When own persona: primary button `Share2` + `"Share Archetype"` (`shareArchetype`, invokes Web Share API or switches to `PersonaShareView`) and Reset icon button (`RotateCcw`, `aria-label="Reset Voting Data"`, opens Reset Confirmation Modal).
    3. **Persona Share View (`PersonaShareView`, when `isSharingView === true`)**:
       - Modal header: Left back button (`ArrowLeft` icon, `aria-label="Back"`, tooltip `"Back to breakdown"` `sharing.backToBreakdownTitle`) + title `"Share Archetype"` (`shareArchetype`).
       - Identity Preview Card: gradient badge card with `"Trial Romance Archetype"`, `persona.title`, `persona.subtitle`, `HeartIcon` `{smashRate}%` pill, `"Survivors {survivorAffinity}%"` and `"Killers {killerAffinity}%"`.
       - Social Media Direct Share Grid (`"Share Directly"` `sharing.shareDirectly`): 5 buttons/links with SVG brand icons: `"X / Twitter"`, `"Reddit"`, `"WhatsApp"`, `"Telegram"` (copies text & shows notice `"Telegram opened! Message text copied to clipboard."`), `"Discord"` (copies text & shows notice `"Copied quote & link for Discord!"`).
       - Direct Link Copy section: `"Direct Link to Archetype"` (`sharing.directLink`), read-only `Input` with `shareUrl`, and primary button `Copy` / `Check` + `"Copy Link"` / `"Copied!"`.
- **Reset All Votes Confirmation Modal** (`components/smash-or-pass/hub/HubModals.tsx`):
  - Trigger: Clicking Reset (`RotateCcw`) in `HubHeader`, `DeckFinished`, `RomancePersonaModal`, `HowToPlayModal` keycap, or pressing `R` hotkey.
  - Contents: `Modal` (`variant="confirm"`, title `"Reset All Votes?"` `modals.resetConfirmTitle`), body `"This will clear your voting history and restore all candidates to your deck."` (`modals.resetConfirmDesc`), danger button `"Yes, Reset All"` (`modals.confirm`).
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: Attempting to create, edit, or import a custom roster while signed out, or clicking `"Log in"` on `AuthRequiredState`.

---

## /smash-or-pass/create

### Page & files
- Page: `app/[locale]/smash-or-pass/create/page.tsx` (`SmashRosterCreatePage`, metadata title `"LemonDBD - Smash or Pass | Dead by Daylight Romance"` via `d.app.smashOrPassPageTitle`)
- Client wrapper: `components/smash-or-pass/creator/SmashRosterCreateClient.tsx` (`SmashRosterCreateClient`, `SmashRosterCreateContent`)
- Creator orchestrator & hooks:
  - `components/smash-or-pass/creator/SmashRosterCreator.tsx` (`SmashRosterCreator`)
  - `components/smash-or-pass/creator/SmashRosterCreatorParts.tsx` (`Section`, `Feedback`, `freshDraft`, `readDraft`)
  - `components/smash-or-pass/creator/useRosterDraft.ts` (`useRosterDraft`)
  - `components/smash-or-pass/creator/useRosterSubmit.ts` (`useRosterSubmit`)
- Creator sections & editors:
  - `components/smash-or-pass/creator/RosterBasicsSection.tsx` (`RosterBasicsSection`)
  - `components/smash-or-pass/creator/GradientEditor.tsx` (`GradientEditor`)
  - `components/smash-or-pass/creator/RosterTaxonomyBlock.tsx` (`RosterTaxonomyBlock`)
  - `components/smash-or-pass/creator/EntityEditor.tsx` (`CandidateFormInputs`)
  - `components/smash-or-pass/creator/EntityEditorParts.tsx` (`CandidateTiles`, `CandidatePortraitFocalPicker`, `TextField`, `AutoExpandingTextField`, `TextAreaField`)
  - `components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx` (`RomanceArchetypeBuilder`)
  - `components/smash-or-pass/creator/CoverImageCropModal.tsx` (`CoverImageCropModal`)
  - `components/smash-or-pass/creator/RequiredMark.tsx` (`RequiredMark`)
- Shared UI: `components/common/AccordionSection.tsx`, `components/common/ImageUploadDropzone.tsx`, `components/common/CustomDropdown.tsx`, `components/common/Switch.tsx` (`LabeledSwitch`), `components/common/Checkbox.tsx`, `components/common/ToggleChip.tsx`, `components/common/Toast.tsx`, `components/common/EmptyState.tsx`, `components/common/AuthRequiredState.tsx`, `components/common/Modal.tsx`, `components/common/Button.tsx`, `components/common/Field.tsx`

### Layout elements
- **Screen-Reader Heading (`h1.sr-only`)**:
  - `"Create a Roster"` (`c.title`) or `"Edit Roster"` (`c.editTitle` when `editId` is set).
- **Toasts**:
  - Draft Restored `Toast` (conditional on `restored`): `History` icon + `"Your unfinished draft was restored."` (`c.draftRestored`), `"Start over"` button (`c.startOver`), and dismiss `X` button (`"Dismiss"` `c.closeToast`).
  - Delete Error `Toast` (conditional on `deleteError`, `tone="red"`): error text + dismiss `X` button (`"Dismiss"`).
- **BLOCK 1: The Basics (`RosterBasicsSection` inside collapsible `AccordionSection` titled `"The basics"` `c.stepBasics`, default open)**:
  - **Admin Translation Toolbar** (conditional on `showTranslations`, i.e., `isUserAdmin && official`):
    - Heading `"Roster Details"` (`c.rosterDetailsLabel`) or `"Roster Details ({LOCALE})"`.
    - `"Editing language:"` (`c.editingLanguageLabel`) + `CustomDropdown` with 5 locales: `"English (Default)"` (`en`), `"Polski (PL)"` (`pl`), `"Deutsch (DE)"` (`de`), `"Español (ES)"` (`es`), `"日本語 (JA)"` (`ja`).
    - When a non-English locale is selected, non-translatable fields append `"({Shared across all languages})"` (`c.sharedFieldNotice`).
  - **Roster Name field**: label `"Roster name *"` (`c.nameLabel`), `Input` (max 60 chars, placeholder `"e.g. Chapter 34 Cast"` `c.namePlaceholder`).
  - **Description field**: label `"Description"` (`c.descriptionLabel`), auto-resizing `Textarea` (max 300 chars, placeholder `"What is this roster about?"` `c.descriptionPlaceholder`).
  - **Cover Image Dropzone (`ImageUploadDropzone`)**:
    - Label `"Cover image URL"` (`c.coverImageLabel`).
    - **When empty**: `ImagePlus` icon, `"Choose images"` upload button (`dict.tierLists.creator.chooseFiles`, shown when `isUserAdmin` is true), URL `Input` (`type="url"`, placeholder `"https://..."` `c.coverImagePlaceholder`), and commit `Check` icon button (`aria-label="Save"`).
    - **When image is set**: 31:50 portrait preview (`Img`), remove button (`Trash2` icon, `aria-label="Remove image"`), and for admins (`isUserAdmin`): hover overlay (`Crop` icon + `"Click to Crop / Reframe (cover)"` `c.cropClickPrompt`) + top-right `Crop` icon button (`aria-label="Crop / Reframe cover image"` `c.cropCoverTitle`) opening `CoverImageCropModal`.
    - Validation / upload error message under dropzone (`"That cover image link is invalid."` `c.invalidImage`, `"Skipped files: 1..."`, or blob URL error).
  - **Theme Color Editor (`GradientEditor`)**:
    - Label `"Theme color"` (`c.themeColorLabel`).
    - Gradient preview bar with draggable/clickable left (`From`) and right (`To`) circular color handles and preview title (`draft.name` or `"e.g. Chapter 34 Cast"`).
    - Hex readout buttons (`"From"` + `#hex`, `"To"` + `#hex`) and swap colors button (`⇄`, `aria-label="Swap colours"` `ab.gradientSwap`).
    - Interactive `HexColorPicker` + `HexColorInput` (`react-colorful`).
    - Hint text: `"Cards of this roster get this color as their edge."` (`c.themeColorHint`).
  - **Toggles Row**:
    - **Simple Version `LabeledSwitch`**: `"Simple Version"` (`c.simpleVersion`), tooltip `"Simple: Fast cards + optional turn-on & dealbreaker"` (`c.simpleVersionDesc`) or `"Mode can only be chosen before adding candidates."` (`c.modeLockedHint`, disabled once candidates have content or > 1 candidate).
    - **NSFW `LabeledSwitch`**: `"Contains NSFW content"` (`c.nsfwLabel`), tooltip `"Mark this roster as containing mature or sensitive material."`.
    - **Official Roster `LabeledSwitch`** (admin-gated, `isUserAdmin && !officialSlug`): `"Publish as Official Roster (Public on Hub)"` (`c.officialPublicHub`), tooltip `"Publish directly to the public Hub directory for all visitors."`.
    - **Published / Active `LabeledSwitch`** (admin-gated, `isUserAdmin && (official || Boolean(officialSlug))`): `"Published (visible to public)"` (`dict.tierLists.creator.publishedLabel`), tooltip `"Toggle whether this official roster is live and playable by visitors."` (`c.isActiveOfficialDesc`).
- **BLOCK 2: Roles & Genders (`RosterTaxonomyBlock` inside collapsible `AccordionSection` titled `"Roles & Genders"` `c.rolesGendersTitle`, default closed)**:
  - **1. Roles Column**:
    - Heading: `MaskIcon` + `"Roster Roles"` (`tx.rolesTitle`).
    - Input + button: `Input` (max 32 chars, placeholder `"Add role (e.g. Hero, Villain, Killer)..."` `tx.addRolePlaceholder`) + primary `"Add"` button (`Plus` icon + `tx.add`).
    - Quick Suggestion Chips (for unadded presets): `"+ Survivor"`, `"+ Killer"`, `"+ Hero"`, `"+ Villain"`, `"+ Neutral"`.
    - Active Roles `Badge` list (defaults to `"Survivor"`, `"Killer"`): each `Badge` has role name + remove `X` icon button (`aria-label="Remove"` `tx.removeRoleAria`).
  - **2. Genders Column**:
    - Heading: `User` icon + `"Roster Genders"` (`tx.gendersTitle`).
    - Input + button: `Input` (max 32 chars, placeholder `"Add gender (e.g. Female, Male)..."` `tx.addGenderPlaceholder`) + primary `"Add"` button (`Plus` icon + `tx.add`).
    - Quick Suggestion Chips (for unadded presets): `"+ Female"`, `"+ Male"`, `"+ Monsters & Eldritch"`.
    - Active Genders `Badge` list (defaults to `"Female"`, `"Male"`, `"Monsters & Eldritch"`): each `Badge` has gender label + remove `X` icon button (`aria-label="Remove"` `tx.removeGenderAria`).
- **BLOCK 3: Candidates (`CandidateFormInputs` + `CandidateTiles` inside collapsible `AccordionSection` titled `"Candidates"` `c.stepEntities` with count `Badge`, default open)**:
  - **Part 1: Active Candidate Form (`CandidateFormInputs`)**:
    - Candidate header bar:
      - Index `Badge` (`#01`, `#02`, ...) + heading `"Editing Candidate: {entity.name || 'Unnamed Candidate'}"` (`c.editingCandidate`, `c.unnamedCandidate`).
      - Admin language selector (when `showTranslations` is true): `"Editing language:"` + `CustomDropdown` (`en`, `pl`, `de`, `es`, `ja`).
      - Remove Candidate icon button (`Trash2`, danger variant, `aria-label="Remove {name}"` `c.removeCandidateAria`, tooltip `"Remove candidate"` `c.removeCandidate`).
    - **Portrait & Primary Identifiers Row**:
      - **`CandidatePortraitFocalPicker`**:
        - 3:4 portrait preview box (shows `Img` or placeholder `ImageIcon` + `"Preview"` `c.preview` + `#{displayIndex}`, supports image paste and file drag-and-drop).
        - **When portrait URL/image is set**:
          - Label `"Focal point"` (`c.focalPointLabel`, tooltip `"Sets which part of the portrait remains in frame when cropped by cards."` `c.focalPointHint`).
          - 3x3 focal point grid (`Top Left`, `Top Center`, `Top Right`, `Center Left`, `Center`, `Center Right`, `Bottom Left`, `Bottom Center`, `Bottom Right`).
          - Zoom controls bar: Zoom Out button (`ZoomOut`, `aria-label="Zoom out"`), percentage readout (`100%`–`200%`), range slider (`input[type="range"]`, `1` to `2`), Zoom In button (`ZoomIn`, `aria-label="Zoom in"`), and conditional Reset button (`RotateCcw`, `aria-label="Reset"` when `scale > 1.0`).
          - Hint: `"Square portraits fill 100% of height. Zoom in to enable vertical framing."` (`c.focalPointZoomHint`).
      - **Primary Identifier Fields**:
        - Name input: label `"Name *"` (`c.entityNameLabel`), `Input` (max 60 chars, placeholder `"e.g. Leon S. Kennedy"` `c.entityNamePlaceholder`).
        - Portrait Image URL field: label `"Portrait image URL"` (`c.entityMediaLabel`), URL `Input` (placeholder `"https://..."` `c.coverImagePlaceholder`, supports image paste) + `"Upload File"` button (`Upload` icon + `dict.smashOrPass.cropModal.uploadFile` + hidden file input accepting png/jpeg/webp/gif). Shows alert if upload skipped or blob URL pasted.
        - Role dropdown: label `"Role *"` (`c.entityRoleLabel`), `CustomDropdown` populated from `availableRoles`.
        - Gender dropdown: label `"Gender *"` (`c.entityGenderLabel`), `CustomDropdown` populated from `availableGenders`.
    - **Candidate Profile Fields — Simple Mode (`isSimpleMode === true`)**:
      - `"Watermark (left)"` (`c.entityWatermarkLeftLabel`, placeholder `"e.g. Raccoon City Police"` `c.watermarkLeftPlaceholder`, max 32).
      - `"Watermark (right)"` (`c.entityWatermarkRightLabel`, placeholder `"e.g. R.P.D. Special Ops"` `c.watermarkRightPlaceholder`, max 32).
      - `"Dating vibe"` (`c.entityDatingVibeLabel`, auto-expanding textarea, max 200).
      - `"Signature quote"` (`c.entityQuoteLabel`, placeholder `"e.g. \"Where is everyone going? Bingo?\""` `c.quotePlaceholder`, max 280).
      - `"Turn on"` (`c.entityTurnOnLabel`, placeholder `"What makes them irresistible?"` `c.turnOnPlaceholder`, max 200).
      - `"Dealbreaker"` (`c.entityDealbreakerLabel`, placeholder `"What ruins the spark immediately?"` `c.dealbreakerPlaceholder`, max 200).
    - **Candidate Profile Fields — Full Mode (`isSimpleMode === false`)**:
      - `"Real name"` (`c.entityRealNameLabel`, max 60).
      - `"Archetype"` (`c.entityArchetypeLabel`, max 60).
      - `"Subtitle / Motto"` (`c.entityTaglineLabel`, placeholder `"e.g. Relentless hunter of the Fog"` `c.entityTaglinePlaceholder`, max 120).
      - `"Signature quote"` (`c.entityQuoteLabel`, placeholder `"e.g. \"Where is everyone going? Bingo?\""` `c.quotePlaceholder`, max 280).
      - `"Bio"` (`c.entityBioLabel`, textarea, max 4,000).
      - `"Trial rumor / meme"` (`c.entityMemeLabel`, textarea, max 200).
      - `"Turn on"` (`c.entityTurnOnLabel`, placeholder `"What makes them irresistible?"`, max 200).
      - `"Dealbreaker"` (`c.entityDealbreakerLabel`, placeholder `"What ruins the spark immediately?"`, max 200).
      - `"Dating vibe"` (`c.entityDatingVibeLabel`, full-width auto-expanding textarea, max 200).
      - `"Red flags (one per line)"` (`c.entityRedFlagsLabel`, textarea, max 1,000).
      - `"Green flags (one per line)"` (`c.entityGreenFlagsLabel`, textarea, max 1,000).
      - `"Watermark (left)"` (`c.entityWatermarkLeftLabel`, placeholder `"e.g. Raccoon City Police"`, max 32).
      - `"Watermark (right)"` (`c.entityWatermarkRightLabel`, placeholder `"e.g. R.P.D. Special Ops"`, max 32).
  - **Part 2: Candidate Tiles Grid (`CandidateTiles`)**:
    - Heading (`h4`): `"Roster Candidates ({entities.length}/100)"` (`c.allCandidatesHeading`).
    - Scrollable tile grid (chunked by 40 with IntersectionObserver):
      - Each candidate tile: square button with `#01`..`#NN` badge, portrait `Img` (or 2-letter initials fallback), hover `Pencil` overlay, top-right delete `X` icon button (`aria-label="Remove {name}"`), and inline editable caption `<input>` (`placeholder="Unnamed Candidate"`, `aria-label="Rename {name}"` `c.renameCandidateAria`).
      - Trailing `+ Add` dashed tile button (`data-testid="add-candidate-tile"`, `Plus` icon + `"Add"` `c.add`; disabled with tooltip when current candidate is missing name, role, or gender).
    - Incomplete candidate hint (`#add-candidate-disabled-hint`, conditional on `!isCurrentCandidateComplete`): `"Fill in name, role, and gender for the current candidate before adding another."` (`c.addCandidateDisabledHint`).
- **BLOCK 4: Custom Romance Archetypes (`RomanceArchetypeBuilder` inside collapsible `AccordionSection` titled `"Custom Romance Archetypes"` `c.customArchetypesTitle` with count `Badge`, default closed)**:
  - **Empty state** (when `archetypes.length === 0`): `EmptyState` (`variant="compact"`) `"No custom romance archetypes defined. The roster will use standard default Fog archetypes."` (`ab.noArchetypes`).
  - **Archetype Accordion Cards** (when `archetypes.length > 0`):
    - Collapsed/Header bar: Archetype title (or `"Archetype Title #N"`), conditional amber `"Fallback"` `Badge` (`ab.fallbackBadge`), subtitle preview, delete `Trash2` icon button, and `ChevronDown` icon.
    - **Expanded Archetype Editor**:
      - `"Archetype Title *"` (`ab.titleLabel`, `Input` max 60, placeholder `"e.g. The Eldritch Devotee"` `ab.titlePlaceholder`).
      - `"Subtitle / Tagline"` (`ab.subtitleLabel`, `Input` max 40, placeholder `"e.g. Drawn to dangerous, unearthly power"` `ab.subtitlePlaceholder`).
      - `"Dating profile description"` (`ab.descriptionLabel`, `Textarea` max 500, placeholder `"Detailed narrative summary displayed when a player unlocks this archetype..."` `ab.descriptionPlaceholder`).
      - **Badge appearance (`ab.visualBadgeLabel`)**:
        - 6 preset `ToggleChip`s (`"Crimson Ember"`, `"Golden Radiance"`, `"Emerald Spirit"`, `"Amethyst Void"`, `"Deep Cyan"`, `"Obsidian Fog"`) + `"Custom"` (`ab.gradientCustom`) `ToggleChip`.
        - Preset preview bar or interactive `GradientEditor` (when `"Custom"` is active).
        - Fallback `Checkbox`: `"Mark as fallback (otherwise defaults to "The Fog Romantic")"` (`ab.markAsFallback`).
      - **Evaluation Rules (`ab.rulesTitle`)**:
        - Header + `"+ Add Condition"` button (`Plus` icon + `ab.addCondition`).
        - Hints: `"Affinity is the share of your smashes (%); count is the number of smashes."` (`ab.rulesHintAffinity`) and `"When several archetypes match, the one with the most conditions wins, then the one higher in the list."` (`ab.rulesHintPriority`).
        - Rule rows:
          - Target `CustomDropdown`: `"Smash Rate (%)"` (`smash_rate`), `"Total Votes Count"` (`total_votes`), `"Role Affinity (%)"` (`role_affinity`), `"Gender Affinity (%)"` (`gender_affinity`), `"Smashed Role Count"` (`role_count`), `"Smashed Gender Count"` (`gender_count`).
          - Role value `CustomDropdown` (when target is `role_affinity` or `role_count`).
          - Gender value `CustomDropdown` (when target is `gender_affinity` or `gender_count`).
          - Operator `CustomDropdown`: `">= (at least)"` (`ab.opGte`), `"<= (at most)"` (`ab.opLte`), `"== (exact)"` (`ab.opEq`).
          - Numeric threshold `Input` (`maxLength=3`, `0`–`100` for percentages or up to 5 digits for counts).
          - Remove rule icon button (`Trash2`, `aria-label="Remove rule"` `ab.removeRule`).
      - Collapse/Save archetype button: `Check` icon + `"Save"` (`ab.done`, disabled until title is filled and at least 1 rule or fallback is set).
  - Add Archetype button: `Plus` icon + `"Add Archetype"` (`ab.addArchetype`, disabled if any existing archetype is incomplete).
- **Feedback Alerts (`Feedback`, `role="alert"`)**:
  - Displays `CircleAlert` icon + validation/submission errors:
    - `"Give this roster a name."` (`c.validationNameRequired`)
    - `"Add at least one candidate."` (`c.validationEntityRequired`)
    - `"That cover image link is invalid."` (`c.invalidImage`)
    - `"All candidates must have a name, role, and gender before saving."` (`c.incompleteCandidatesError`)
    - `"Not saved: browser storage is full. Remove some images or rosters."` (`importModal.saveFailedQuota`)
    - `"Not saved: this browser blocks local storage, so changes only last until you leave the page."` (`importModal.saveFailedUnavailable`)
    - `"Something went wrong saving this roster. Please try again."` (`c.saveError`) or backend publish error.
- **Bottom Action Bar**:
  - Primary Submit button (`data-roster-create=""`): label changes dynamically by mode:
    - `"Create"` (`c.create` — new local roster)
    - `"Save"` (`c.saveShort` — editing local roster `?edit=` or editing official roster `?official=`)
    - `"Publish"` (`c.publish` — new admin official roster)
    - `"Saving..."` (`c.saving` — while `publishingNow`)
  - Delete Official Roster button (admin-gated, conditional on `officialSlug && isUserAdmin`): danger button `Trash2` icon + `"Delete"` (`t.picker.deleteRoster`), opens Delete Official Roster Confirmation Modal.

### Modes / states
- **Auth / Official Roster loading state**: Blank `<div className="min-h-100" />` while `authLoading || officialLoading`.
- **Unauthenticated state**: Renders `AuthRequiredState` with heading `"Log in required"` (`t.authRequiredTitle`), subtitle `"You must be logged in to create or play custom rosters."` (`t.authRequiredDesc`), and `"Log in"` button.
- **Not Found / Stale Edit Link state**: When `editId` is not found in hydrated local store, or `officialSlug` fails to load, renders `EmptyState` (`SearchX` icon, title `"No Candidates Found"` `t.empty.title`, subtitle `"Try adjusting your filters or resetting the search."` `t.empty.subtitle`).
- **Empty Candidates state (`draft.entities.length === 0`)**: Renders `EmptyState` (`variant="compact"`) inside Block 3 with title `"No candidates yet. Add your first one above."` (`c.noEntitiesYet`) and action button `Plus` + `"Add Candidate"` (`c.addEntity`).
- **Create vs Edit Custom (`?edit=<id>`) vs Edit Official (`?official=<slug>`)**:
  - Create mode restores/autosaves scratch draft in `localStorage` (`lemondbd_smash_roster_draft`) and shows the Draft Restored `Toast` when a non-empty draft is restored.
  - `?edit=<id>` seeds from `useSmashRosterStore` custom roster and saves back to localStorage.
  - `?official=<slug>` (admin-only) fetches `/api/v1/smash-or-pass/admin/rosters/{slug}`, forces `official = true` and `roster_mode = 'full'`, enables multi-locale translation editing (`showTranslations`), and shows the `"Delete"` button next to `"Save"`.
- **Simple vs Full Roster Mode (`draft.roster_mode`)**: Switches Candidate Form between 6 compact fields (`simple`) and 13 full dossier fields (`full`). Locked once candidates have data.

### Modals & drawers (file)
- **CoverImageCropModal** (`components/smash-or-pass/creator/CoverImageCropModal.tsx`):
  - Trigger: Clicking the cover image preview or its `Crop` icon button in `RosterBasicsSection` (admin-only).
  - Contents:
    - Title: `"Crop & Frame Cover Image"` (`cropModal.title`).
    - Subtitle: `"Drag to reposition, use mouse wheel or zoom slider to scale up any specific part (up to 500%)."` (`cropModal.subtitle`).
    - 31:50 interactive crop viewport (`aspectRatio="roster"`) with rule-of-thirds grid overlay and bottom-left hint pill `"Drag to pan • Wheel to zoom ({zoom}%) • Roster cover (31:50)"` (`cropModal.dragHintRoster`).
    - Fallback empty/error state inside viewport: `ImageIcon`, `"Unable to display image from external URL"` / `"No image URL specified"`, `"Upload an image file directly from your device for guaranteed instant preview & cropping."`, and `"Upload Local File"` button (`Upload` icon).
    - Controls bar (`Surface`): Zoom Out icon button (`ZoomOut`, `"Zoom out"`), `{zoom}%` indicator, range slider (`1` to `5`), Zoom In icon button (`ZoomIn`, `"Zoom in"`), `"Reset"` button (`RotateCcw` + `cropModal.reset`, tooltip `"Reset Zoom and Position"`), and admin `"Upload File"` button (`Upload` icon + hidden file input).
    - Conditional CORS warning alert (`corsError`): `TriangleAlert` icon, `"Third-party image host blocked canvas export"` (`cropModal.corsTitle`), admin/user description, `"Upload File"` button (admin), and `"Use Uncropped URL"` button (`cropModal.useUncropped`).
    - Footer buttons: `"Cancel"` (`cropModal.cancel`) and primary `Check` + `"Apply Crop"` (`cropModal.applyCrop`).
- **Delete Official Roster Confirmation Modal** (`components/smash-or-pass/creator/SmashRosterCreator.tsx`):
  - Trigger: Clicking `"Delete"` (`t.picker.deleteRoster`) in the bottom action bar when editing an official roster (`officialSlug && isUserAdmin`).
  - Contents: `Modal` (`variant="confirm"`, title `"Delete this roster?"` `t.picker.deleteConfirmTitle`), body `"This permanently removes "{name}" from this browser. This cannot be undone."` (`t.picker.deleteConfirmDesc`), footer buttons `"Cancel"` (`dict.tierLists.cancel`) and danger `"Yes, Delete"` (`t.picker.deleteConfirmAction`).
- **AuthModal** (`components/AuthModal.tsx`):
  - Trigger: Clicking `"Log in"` on `AuthRequiredState` when visiting `/smash-or-pass/create` while unauthenticated.
