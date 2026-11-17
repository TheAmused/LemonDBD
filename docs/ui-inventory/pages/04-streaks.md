# Streaks & Challenges UI Inventory

## /streaks

### Page & files
- Page: `app/[locale]/streaks/page.tsx`
- Layout: `app/[locale]/streaks/layout.tsx`
- Route loading: `app/[locale]/streaks/loading.tsx`
- Feature barrel: `features/streaks/index.ts`
- Components:
  - `components/streaks/StreaksLayoutShell.tsx`
  - `components/streaks/RoleTabs.tsx`
  - `components/common/AuthRequiredState.tsx`
  - `components/AuthModal.tsx`
  - `components/layout/RouteLoading.tsx`, `components/common/DbdSpinner.tsx`

### Layout elements
- **Role Navigation Tabs** (`RoleTabs.tsx`, shown when path depth after `/streaks` <= 1, `aria-label="Streak Role Tabs"` / `streaks.streakRoleTabs`):
  - Link tab: `"Survivor"` (`characterDetail.roleSurvivor`) -> `/{locale}/streaks/survivor` (green active pill)
  - Link tab: `"Killer"` (`characterDetail.roleKiller`) -> `/{locale}/streaks/killer` (red active pill)
  - Link tab: `"Survivor/Killer"` (`{roleSurvivor}/{roleKiller}`) -> `/{locale}/streaks/challenge` (amber active pill)

### Modes / states
- **Server Redirect Mode** (`app/[locale]/streaks/page.tsx`): Reads cookie `lemondbd_streak_role` (`STREAK_ROLE_COOKIE`) via `resolveStreakRole` (defaults to `'survivor'`) and immediately redirects to `/{locale}/streaks/{role}`.
- **Route Loading State** (`app/[locale]/streaks/loading.tsx`): `RouteLoading` + `DbdSpinner` (blood accent) with label `"Synchronizing Trial Streaks..."` (`streaks.loadingTrialStreaks`) and sublabel `"Validating gauntlet records and victory metrics"` (`streaks.loadingTrialStreaksSub`).
- **Auth Loading State** (`StreaksLayoutShell.tsx`): Centered muted text `"Loading streak…"` (`streaks.loadingStreak`).
- **Unauthenticated State (Auth-Gated)** (`StreaksLayoutShell.tsx` -> `AuthRequiredState.tsx`):
  - Dashed card with red `IconTile` + `LockIcon`
  - Heading (`h2`): `"Log in to track your challenges"` (`streaks.loginToTrack`)
  - Subtitle: `"Challenges use the killers and perks you own, so we need to know who you are first."` (`streaks.loginToTrackDesc`)
  - Primary button: `"Log in"` (`streaks.logIn`) -> opens `AuthModal`
- **Unverified Email State (Email-Verification-Gated)** (`StreaksLayoutShell.tsx`, when `isAuthenticated && mustConfirmEmail(user, verificationRequired)`):
  - Dashed card with amber `IconTile` + `MailWarning` icon
  - Heading (`h2`): `"Verify your email to track challenges"` (`streaks.verifyEmailToTrack`)
  - Primary button: `"Verify email"` (`streaks.verifyEmail`) -> opens `AuthModal` in `'verify'` intent
- **Authenticated & Verified State**: Wraps `{children}` in `DisplayNamesProvider`.

### Modals & drawers (file)
- **Auth Modal** (`components/AuthModal.tsx`):
  - Trigger: Clicking `"Log in"` button in `AuthRequiredState` or `"Verify email"` button in `StreaksLayoutShell.tsx`.

---

## /streaks/[role]

### Page & files
- Page: `app/[locale]/streaks/[role]/page.tsx` (validates `role` in `['killer', 'survivor', 'challenge']`, else `notFound()`)
- Layout: `app/[locale]/streaks/layout.tsx` (`components/streaks/StreaksLayoutShell.tsx`)
- Components:
  - `components/streaks/RoleTabs.tsx`
  - `components/streaks/StreakPanelGrid.tsx`
  - `components/streaks/StreakPanel.tsx`
  - `components/streaks/panels.ts`
  - `components/DisabledReasonModal.tsx`
  - `components/streaks/ChallengeModeModal.tsx`
  - `components/streaks/ChallengeIntroModalShell.tsx`
  - `components/streaks/RulesModalShell.tsx`
  - `components/streaks/RulesModalSections.tsx`
  - `components/streaks/gauntlet/GauntletModeModal.tsx`, `components/streaks/gauntlet/GauntletRulesModal.tsx`
  - `components/streaks/chaos/ChaosModeModal.tsx`, `components/streaks/chaos/ChaosRulesModal.tsx`
  - `components/streaks/history/HistoryModeModal.tsx`, `components/streaks/history/HistoryRulesModal.tsx`
  - `components/streaks/id-please/IdPleaseModeModal.tsx`, `components/streaks/id-please/IdPleaseRulesModal.tsx`
  - `components/streaks/page-streak/PageStreakModeModal.tsx`, `components/streaks/page-streak/PageStreakRulesModal.tsx`

### Layout elements
- **Role Navigation Tabs** (`RoleTabs.tsx`): `"Survivor"`, `"Killer"`, `"Survivor/Killer"` link pills.
- **Challenge Card Grid** (`StreakPanelGrid.tsx`, 1/2/3 cols responsive grid of `StreakPanel.tsx` cards):
  - **Card Anatomy** (`StreakPanel.tsx`):
    - Heading (`h3`): Challenge title
    - Creator subtitle: `"By {name}"` (`streaks.createdBy`)
    - Watermark artwork (`Img`, bottom-right)
    - Top-right status badge (mutually exclusive):
      - Disabled badge (amber `Badge` with `TriangleAlert` icon): `"Disabled"` (`streaks.disabled`)
      - Coming soon badge (neutral `Badge`): `"Coming soon."` (`streaks.comingSoon`)
      - Full-roster completed badge (red `Badge`, `aria-label="Completed with the entire roster"` / `streaks.completedFullRoster`): `TrophyIcon` + frozen character count (`completedFullCount`)
      - Standard completed badge (amber `Badge`, `aria-label="Completed"` / `streaks.completed`): `TrophyIcon` + frozen character count (`completedCount`, omitted on `id-please`)
  - **Cards when `role === 'killer'`** (`getKillerStreakPanels`):
    1. `"The Gauntlet"` (`streaks.gauntletStreakTitle`) — `"By Zerbs"`, image `/images/streaks/gauntlet-streak.webp`. Click navigates to saved mode or opens `GauntletModeModal`.
    2. `"Page streak"` (`streaks.pageStreakPanelTitle`) — `"By LemonDBD"`, image `/images/streaks/page-streak.webp`. Click navigates to `/streaks/killer/page-streak` if intro seen, else opens `PageStreakModeModal`.
    3. `"History streak"` (`streaks.historyStreakPanelTitle`) — `"By LemonDBD"`, image `/images/streaks/history-streak.webp`. Click navigates to saved mode or opens `HistoryModeModal`.
    4. `"Chaos streak"` (`streaks.chaosStreakPanelTitle`) — `"By Otzdarva"`, image `/images/streaks/chaos-streak.webp`. Click navigates to saved difficulty or opens `ChaosModeModal`.
    5. `"ID, Please"` (`streaks.idPleaseTitle`) — `"By LemonDBD"`, image `/images/streaks/id-please/k0.webp`. Click navigates to saved difficulty (`killer` lane) or opens `IdPleaseModeModal`.
    6. `"Nice Guy streak"` (`streaks.niceGuyStreakTitle`) — `"By Otzdarva"`, image `/images/streaks/nice-guy-streak.webp`, `comingSoon: true`.
    7. `"Blood Money streak"` (`streaks.bloodMoneyStreakTitle`) — `"By SpookyLoopz"`, image `/images/streaks/blood-money-streak.webp`, `comingSoon: true`.
  - **Cards when `role === 'survivor'`** (`getSurvivorStreakPanels`):
    1. `"The Gauntlet"` (`streaks.gauntletStreakTitle`) — `"By Zerbs"`, image `/images/streaks/gauntlet-streak.webp`. Click navigates to saved mode or opens `GauntletModeModal`.
    2. `"ID, Please"` (`streaks.idPleaseTitle`) — `"By LemonDBD"`, image `/images/streaks/id-please/s0.webp`. Click navigates to saved difficulty (`survivor` lane) or opens `IdPleaseModeModal`.
    3. `"Copycat streak"` (`streaks.copycatStreakTitle`) — `"By KnightLight"`, image `/images/streaks/copycat-streak.webp`, `comingSoon: true`.
  - **Cards when `role === 'challenge'`** (`getChallengeStreakPanels`):
    1. `"ID, Please"` (`streaks.idPleaseTitle`) — `"By LemonDBD"`, image `/images/streaks/id-please/s0.webp`. Click navigates to saved difficulty (`mixed` lane) or opens `IdPleaseModeModal`.
    2. `"Copycat streak"` (`streaks.copycatStreakTitle`) — `"By KnightLight"`, image `/images/streaks/copycat-streak.webp`, `comingSoon: true`.

### Modes / states
- **Role Variants**: `'survivor'`, `'killer'`, `'challenge'` (invalid role triggers 404 `notFound()`).
- **Auth / Email-Verification States**: Inherited from `StreaksLayoutShell.tsx` (loading, login required, verify email required).
- **Admin Kill-Switch State**: If a mode is disabled in `fetchChallengeModeStatus()`:
  - **Standard user (`!isAdmin`)**: Card renders in disabled state (`opacity-70`, amber `"Disabled"` badge); clicking opens `DisabledReasonModal`.
  - **Admin (`isAdmin`)**: Kill-switch is bypassed; card remains interactive so admins can inspect the mode.
- **Coming Soon State**: Static non-interactive card (`opacity-70`, neutral `"Coming soon."` badge).

### Modals & drawers (file)
- **Disabled Reason Modal** (`components/DisabledReasonModal.tsx`):
  - Trigger: Clicking a disabled `StreakPanel` card (when `!isAdmin`).
  - Elements: Title `"Temporarily disabled"` (`modal.temporarilyDisabled`), close button (`modal.close`), body `"{item} was disabled temporarily."` (`modal.wasDisabledTemporarily`) + optional `"Reason: {reason}"` (`modal.reasonLabel`).
- **Gauntlet Mode Modal** (`components/streaks/gauntlet/GauntletModeModal.tsx` -> `ChallengeModeModal.tsx` -> `ChallengeIntroModalShell.tsx`):
  - Trigger: Clicking `"The Gauntlet"` card when no mode is saved in localStorage for that role.
  - Stage `'root'` (`title="Choose a mode"` / `streaks.chooseMode`):
    - Intro text: Killer `"Win with every killer, in a random order."` (`streaks.gauntletIntroKiller`) / Survivor `"Win with every survivor, in a random order."` (`streaks.gauntletIntroSurvivor`)
    - Dynamic detail text for highlighted tile (`gauntletOriginalDescKiller`, `gauntletOriginalDesc`, `gauntletSummaryLemonKiller`, `gauntletSummaryLemonSurvivor`)
    - Secondary button: `"Rules"` (`streaks.rules`, `ScrollText` icon) -> opens `GauntletRulesModal`
    - 2 `SelectableCard` tiles: `"Original"` (`streaks.original`, with optional gold/red `TrophyIcon` completion badge) and `"Lemon"` (`streaks.lemonMode` for killer) / `"Lemon version"` (`streaks.lemonVersion` for survivor), plus `"Current"` (`streaks.current`) tag if active
    - Primary footer button: `"ACCEPT"` (`streaks.accept`) — for killer `'lemon'` selects `'lemon_killer'`; for survivor `'lemon'` advances modal to stage `'lemon'`
  - Stage `'lemon'` (Survivor only, `title="How many players?"` / `streaks.chooseLemonPlayers`):
    - Header back icon button (`ChevronLeft`, `aria-label="Back"` / `streaks.back`) -> returns to `'root'` stage
    - 3 `SelectableCard` tiles: `"Solo"` (`streaks.lemonSolo`), `"Duo"` (`streaks.lemonDuo`), `"Squad"` (`streaks.lemonSquad`)
    - Dynamic detail text (`gauntletSummaryLemonSolo`, `gauntletSummaryLemonDuo`, `gauntletSummaryLemonSquad`)
    - `"Rules"` button + `"ACCEPT"` button
- **Chaos Mode Modal** (`components/streaks/chaos/ChaosModeModal.tsx`):
  - Trigger: Clicking `"Chaos streak"` card when no difficulty is saved.
  - Elements: Title `"Choose a mode"` (`streaks.chooseMode`), intro `"Win with every killer, each time with a random build of perks and addon rarities."` (`streaks.chaosIntro`), dynamic tile description, `"Rules"` button (-> `ChaosRulesModal`), 3 `SelectableCard` tiles (`"Easy"` / `"A checkpoint every 5 wins."`, `"Medium"` / `"A checkpoint every 10 wins."`, `"Hell"` / `"No checkpoints."` with cascaded completion badges), `"ACCEPT"` button.
- **History Mode Modal** (`components/streaks/history/HistoryModeModal.tsx`):
  - Trigger: Clicking `"History streak"` card when no mode is saved.
  - Elements: Title `"Choose a mode"` (`streaks.chooseMode`), intro `"Beat every killer row by row, unlocking more perks along the way."` (`streaks.historyIntro`), dynamic tile description, `"Rules"` button (-> `HistoryRulesModal`), 2 `SelectableCard` tiles (`"Medium"` / `"A checkpoint for every row you clear."`, `"Hell"` / `"No checkpoints. One loss resets everything."` with cascaded completion badges), `"ACCEPT"` button.
- **ID, Please Mode Modal** (`components/streaks/id-please/IdPleaseModeModal.tsx`):
  - Trigger: Clicking `"ID, Please"` card when no difficulty is saved for the current lane.
  - Elements: Title `"Choose a difficulty"` (`streaks.idPleaseModeSelectTitle`), dynamic detail description + eligibility shortfall lines (`"{side}: needs {need} characters ({have} owned)"`, `"{side}: needs {need} unlocked perks ({have} unlocked)"`), `"Rules"` button (-> `IdPleaseRulesModal`), 3 `SelectableCard` tiles (`"Milestones"`, `"Hardcore"`, `"Hardcore+"` — disabled with `"Locked"` / `streaks.idPleaseLockedBadge` label if `eligibility.difficulties[d].met === false`, or amber `TrophyIcon` badge if completed), `"ACCEPT"` button.
- **Page Streak Mode Modal** (`components/streaks/page-streak/PageStreakModeModal.tsx`):
  - Trigger: Clicking `"Page streak"` card when `hasSeenPageStreakIntro()` is false.
  - Elements: Title `"Choose a mode"` (`streaks.chooseMode`), intro `"Pick a killer and win with the best loadout you can build from each page of their perks."` (`streaks.pageStreakIntro`), `"Rules"` button (-> `PageStreakRulesModal`), 1 `SelectableCard` tile (`"Normal"` / `streaks.normal`), `"ACCEPT"` button.
- **Rules Modals** (`GauntletRulesModal.tsx`, `ChaosRulesModal.tsx`, `HistoryRulesModal.tsx`, `IdPleaseRulesModal.tsx`, `PageStreakRulesModal.tsx`):
  - Trigger: Clicking `"Rules"` inside any of the Mode Modals above (detailed under each challenge route below).

---

## /streaks/[role]/gauntlet-streak

### Page & files
- Page: `app/[locale]/streaks/[role]/gauntlet-streak/page.tsx` (validates `role` in `['killer', 'survivor']`, else `notFound()`; parses `?mode=` into `'original' | 'lemon_solo' | 'lemon_duo' | 'lemon_squad' | 'lemon_killer'`)
- Layout: `app/[locale]/streaks/layout.tsx` (`components/streaks/StreaksLayoutShell.tsx`)
- Components:
  - `components/streaks/ChallengeModeGate.tsx`
  - `components/streaks/gauntlet/GauntletBoard.tsx`
  - `components/streaks/gauntlet/GauntletHeader.tsx`
  - `components/streaks/gauntlet/ActiveTargetStage.tsx`
  - `components/streaks/gauntlet/ActiveTargetStageParts.tsx`
  - `components/streaks/gauntlet/LemonTokenPanel.tsx`
  - `components/streaks/gauntlet/CharacterRosterGrid.tsx`
  - `components/streaks/gauntlet/GauntletModeModal.tsx`
  - `components/streaks/gauntlet/GauntletRulesModal.tsx`
  - `components/streaks/gauntlet/GauntletStatsDrawer.tsx`
  - `components/streaks/gauntlet/TokenRollModal.tsx`, `components/streaks/gauntlet/TokenRoulette.tsx`
  - `components/streaks/gauntlet/ShieldPromptModal.tsx`
  - `components/streaks/ChallengePanel.tsx`, `components/streaks/ChallengeProgress.tsx`, `components/streaks/StreakStatTiles.tsx`, `components/streaks/FreezeBadge.tsx`, `components/streaks/StreakActionBar.tsx`, `components/streaks/Confetti.tsx`, `components/streaks/CelebrationBadge.tsx`
  - `components/streaks/AbandonConfirmModal.tsx`, `components/streaks/CheckpointCelebrationModal.tsx`, `components/streaks/ChallengeCompletionHistoryDrawer.tsx`, `components/streaks/StreakStatsDrawer.tsx`, `components/streaks/StreakAttemptGroups.tsx`, `components/streaks/StreakMatchRow.tsx`

### Layout elements
- **Confetti Canvas** (`Confetti.tsx`): Full-screen canvas burst on run completion or checkpoint celebration.
- **Error Banner** (`ChallengeErrorBanner` in `ChallengePanel.tsx`, conditional on `error`): Red alert box (`role="alert"`) displaying error message.
- **Challenge Header** (`GauntletHeader.tsx` inside `ChallengePanel.tsx`):
  - **Stat Tiles** (`StreakStatTiles.tsx`):
    - `"Current"` (`streaks.current`) stat tile with `Flame` icon and `current_streak` count (flashes green on win, red on loss, amber on record)
    - `"Best"` (`streaks.best`) stat tile with `TrophyIcon` and `best_streak` count (amber shimmer/burst when current streak is a record)
  - **Freeze Badge** (`FreezeBadge.tsx`, shown when `run.pool_frozen && run.target_revealed`): `Snowflake` icon badge with tooltip title `"Challenge started."` (`streaks.challengeStarted`) and body `"Unlocking or locking perks or characters won't affect this run until a win, a loss back to 0, or a reset."` (`streaks.freezeNotice`).
  - **Header Action Controls** (`StandardHeaderActions` in `ChallengePanel.tsx`):
    - **Mode Select Button** (`ModeSelectButton`): Amber dot + current mode label (`"Original"`, `"Solo"`, `"Duo"`, `"Squad"`, or `"Lemon"`) + `ChevronDown` icon, tooltip `"Change Mode"` (`streaks.changeMode`) -> opens `GauntletModeModal`
    - **Draw Animations Toggle** (`DrawAnimationButton`): `ClapperboardIcon` (with red diagonal strike-through when disabled), tooltip `"Animations"` (`streaks.drawAnimations`)
    - **Rules Button**: `ScrollText` icon button, tooltip `"Rules"` (`streaks.rules`) -> opens `GauntletRulesModal`
    - **Statistics Button**: `BarChart2` icon button, tooltip `"Statistics"` (`streaks.stats`) -> opens `GauntletStatsDrawer`
    - **Win History Button**: `History` icon button, tooltip `"Win History"` (`streaks.pastWins`) -> opens `ChallengeCompletionHistoryDrawer`
    - **Abandon Run Button**: Danger `RotateCcw` icon button, tooltip `"Abandon Run"` (`streaks.abandonRun`) -> opens `AbandonConfirmModal`
    - **Mobile Collapse Toggle** (`sm:hidden`): `ChevronDown` ghost button (`aria-label="More actions"` / `streaks.moreActions`) folding action buttons on small screens
- **Progress Bar Strip** (`ChallengeProgress.tsx`):
  - Heading (`h3`): `"Progress"` (`streaks.progressTitle`)
  - Counter: `"Completed: {cleared} / {total}"` (`stats.completed`)
  - Progress track with colour-mix gradient, `Flag` nodes at checkpoints (every 10 wins in Original/Lemon Killer, every 5 in Solo, every 6 in Duo/Squad) with numeric labels underneath, and `TrophyIcon` node at `total`.
- **Main Stage** (`ActiveTargetStage.tsx` & `ActiveTargetStageParts.tsx`):
  - **Revealed Loadout View** (`CompactPlayerBuild`):
    - Single-player (`original`, `lemon_solo`, `lemon_killer`): Character portrait (`Img` or fallback `PersonIcon`) + character display name + `TeachablePerkCluster` (3 diamond `PerkTile`s with perk name tooltips) + `PerkSlotsRow` (4 diamond `SlotChip`s):
      - Teachable slot: Amber/red diamond with `Star` icon and `"Teachable"` (`streaks.teachableBadge`) chip
      - Free perk slot (Survivor / bonus token slot): Neutral diamond with `HelpCircle` icon
      - Locked slot (when `idx >= perk_limit`): Dashed dimmed diamond with `LockIcon`
      - Random unique perk slot (Tier 4 `perk_limit === 0` in `lemon_solo` / `lemon_killer`): `PerkArt` icon + perk name caption
      - Perkless trial notice (when `character_perks_only && perk_limit === 0 && random_perks.length === 0`): `"No perks this trial. {character} goes in bare."` (`streaks.noPerksThisTrial`, `streaks.goesInBare`)
    - Team modes (`lemon_duo`, `lemon_squad`): 2-column split (`xl:grid-cols-2`) showing 2 character builds; in `lemon_squad` (`players_per_character === 2`), each character build renders two stacked `PerkSlotsRow` rows labeled `"Player 1"`, `"Player 2"`, `"Player 3"`, `"Player 4"` (`streaks.playerLabel`) with alternating amber/red teachable badges.
- **Lemon Token & Boosts Panel** (`LemonTokenPanel.tsx`, rendered only when `run.boosts` is present in `lemon_killer` mode):
  - Section (`aria-label="Boosts"` / `streaks.boostsTitle`):
  - 3 `BoostTile` buttons (or hint text `"Choose a killer from the roster below."` / `streaks.boostPickHint` when `buyingPick` is true):
    1. `"Reroll killer"` (`streaks.boostReroll`, `Shuffle` icon, price `2`) -> calls `buyBoost('reroll')`
    2. `"Pick killer"` (`streaks.boostPick`, `Crosshair` icon, price `6`) -> enters killer pick sub-mode (`buyingPick = true`)
    3. `"Free perk slot"` (`streaks.boostSlot`, `Plus` icon, price `4`) -> calls `buyBoost('slot')`
  - Token balance indicator: `Coins` icon + `"Tokens: {tokens} / {cap}"` (`streaks.tokensLabel`, cap `20`)
- **Character Roster Grid** (`CharacterRosterGrid.tsx`):
  - Responsive grid of character portrait cards (`OwnedCharacterItem[]`):
    - Avatar `Img` (or `PersonIcon` fallback) + character display name
    - Completed state: Green border (`border-accent-green`) + top-right green circle `Check` badge + `aria-label="{name} (Completed)"`
    - Active target state: Red pulsing border (`border-accent-red animate-pulse`) + `aria-label="{name} (Active Gauntlet Target)"`
    - Checkpoint state: Amber border (`border-accent-amber`) + top-right amber circle `Flag` badge
    - Selected pick state (in `lemon_solo` or `buyingPick`): Green ring (`ring-accent-green`)
- **Sticky Bottom Action Bar** (`StreakActionBar.tsx` / `StickyActionBar.tsx`):
  - In `lemon_solo` unrevealed state: Red button `"ACCEPT PICK"` (`streaks.acceptPick`, disabled until a roster character is clicked)
  - In `lemon_killer` `buyingPick` state: Gray button `"Cancel"` (`streaks.cancel`) + Red button `"Pick ({price})"` (`streaks.boostConfirmPick`, `streaks.boostPrice`)
  - In active revealed match state: Red button `"LOST"` (`streaks.loseMatch`) + Green button `"WON"` (`streaks.winMatch`)

### Modes / states
- **Game Mode Variants (`?mode=`)**:
  - `'original'` (Killer & Survivor): Random character draw; checkpoints every 10 wins; progressive perk slot loss (Killer 3->2->1->0 teachable-only; Survivor 4->3->2->1->0 with 1 teachable).
  - `'lemon_killer'` (Killer): Random character draw + token economy (`1, 2, 3, or 5` tokens per win, cap 20) + 4 boosts (Reroll 2, Pick 6, Free slot 4, Shield 8) + Tier 3 gives 1 random perk instead of 0.
  - `'lemon_solo'` (Survivor): Player manually picks unbeaten survivor from `CharacterRosterGrid` (`pickCharacter = true`); checkpoints every 5 wins; Tier 4 gives 1 random unique perk.
  - `'lemon_duo'` (Survivor): Draws 2 random survivors simultaneously (dual reels); checkpoints & tier advances every 6 wins (4 tiers, run length 26).
  - `'lemon_squad'` (Survivor): Draws 2 random survivors shared by 4 players (2 rows per character); checkpoints & tier advances every 6 wins (4 tiers, run length 26).
- **Stage Sub-States**:
  - **Loading Run State**: `Spinner` + `"Loading streak…"` (`streaks.loadingStreak`).
  - **Unrevealed / Pre-Draw State** (random draw modes): Centered primary button `"START GAME"` (`streaks.startGame`).
  - **Unrevealed / Pick State** (`lemon_solo`): Prompt heading `"Choose your survivor"` (`streaks.soloPickTitle`), interactive `CharacterRosterGrid`, and `"ACCEPT PICK"` sticky action button.
  - **Spinning / Reel Draw State**: 1 reel (single) or 2 side-by-side reels (`isTeam`) cycling portraits (`RevealPortrait` with `gn-spin-frame` / `gn-land-frame` / `gn-land-glow`). Held while `TokenRollModal` or `CheckpointCelebrationModal` is open.
  - **Revealed Match State**: Shows `CompactPlayerBuild` + `StreakActionBar` (`"LOST"` / `"WON"`).
  - **Buying Killer Pick Sub-State** (`lemon_killer`): Replaces boost buttons with `"Choose a killer from the roster below."`, makes unbeaten killers in `CharacterRosterGrid` selectable, and swaps action bar to `"Cancel"` / `"Pick (6)"`.
  - **Victory / Completed State** (`run.status === 'completed'`): Renders `ChallengeVictoryCard` with amber `CelebrationBadge` (`TrophyIcon`), `"Congratulations"` (`streaks.victoryCongrats`), and heading `"You won The Gauntlet"` (`streaks.gauntletComplete`).
- **Roster Grid States**:
  - **Loading Roster**: 16 pulsing `SkeletonBlock` squares.
  - **Empty Roster**: `"No owned characters found for this filter."` (`streaks.noOwnedCharacters`).
- **Admin Kill-Switch Block State** (`ChallengeModeGate.tsx`, when `gauntlet` is disabled and `!isAdmin`):
  - Amber alert card with `TriangleAlert` icon, heading `"This challenge was disabled temporarily."` (`streaks.temporarilyDisabled`), and optional `"Reason: {reason}"` (`modal.reasonLabel`).

### Modals & drawers (file)
- **Gauntlet Mode Modal** (`components/streaks/gauntlet/GauntletModeModal.tsx`):
  - Trigger: Clicking `ModeSelectButton` in `GauntletHeader.tsx`.
  - Elements: Same 2-stage modal as on `/streaks/[role]` (`"Original"` vs `"Lemon"` / `"Lemon version"`, and `"Solo"` / `"Duo"` / `"Squad"` for survivor).
- **Gauntlet Rules Modal** (`components/streaks/gauntlet/GauntletRulesModal.tsx`):
  - Trigger: Clicking `"Rules"` header button or `"Rules"` button inside `GauntletModeModal`.
  - Elements:
    - Title: `"{role} Gauntlet Rules"` (`streaks.gauntletRulesTitle`, e.g. `"Killers Gauntlet Rules"` / `"Survivors Gauntlet Rules"`)
    - Optional `"Note from the devs"` (`streaks.devNoteTitle`) card (`RulesConceptCard`) in Lemon modes (`lemonKillerDevNote` / `soloDevNote`)
    - `"How it works"` (`streaks.howItWorks`) bullet list: mode-specific win condition, token & boost rules with `BOOST_ICONS` (in `lemon_killer`), character pick/rematch/unique perk rules (in `lemon_solo`/`duo`/`squad`), perk rule, checkpoint rule, and roster cap note (`"The roster stops at the 43 killers, up through The Slasher."` / `"The roster stops at the 52 survivors, up through Kwon Tae-young."`)
    - `"Progressive Tier Restrictions"` (`streaks.progressiveTierRestrictions`) section: list of tier cards showing `"Tier {level}: {name}"` (`"The Warm Up"`, `"The Thinning"`, `"The Struggle"`, `"The Hardcore"`, `"The Legend"` for Survivor; `"The Bloodbath"`, `"The Obsession"`, `"The Executioner"`, `"The Entity"` for Killer), streak range `(1 - 10)` etc., and `LockIcon` + `"X Perks Allowed"` / `"0 Perks"` / `"1 random unique perk"`
    - `"Exceptions"` (`streaks.exceptions`) card: intro `"These matches don't count. Replay them."` (or `soloVoidMatchNotice`) + items (`"Early disconnect"` for survivor, `"Game cancelled"`, `"Hackers"`, `"Crash or server failure"`)
    - `"Clarifications"` (`streaks.clarifications`) card: Killer (`"Survivor disconnects"`, `"No dodging"`, `"Add-ons and offerings"`) or Survivor (`"Add-ons and offerings"`, `"Rat off"`, `"A death is a death"`, `"Killer disconnects"` with solo/duo/squad variants)
    - Footer notices (`RulesModalNotices`): `Snowflake` `"Your run freezes. New unlocks join after your next reset, loss to zero, or completion."` (`streaks.runFreezeNotice`) and `Clock` `"An in-progress run untouched for {days} days automatically counts as a loss."` (`streaks.inactivityLossNotice`).
- **Gauntlet Statistics Drawer & Older Attempts Modal** (`components/streaks/gauntlet/GauntletStatsDrawer.tsx` -> `components/streaks/StreakStatsDrawer.tsx`):
  - Trigger: Clicking `"Statistics"` (`BarChart2`) button in `GauntletHeader.tsx`.
  - Drawer (`variant="drawer-right"`, title `"Statistics"` / `streaks.stats`):
    - `"Win Rate"` (`streaks.winRate`) card with percentage (`0.0%`) and green/red split bar
    - 4 `StatCell` tiles: `"Matches"` (`streaks.matches`), `"Attempts"` (`streaks.attempts`), `"Wins"` (`streaks.wins`, green), `"Losses"` (`streaks.losses`, red)
    - `"Match History"` (`streaks.matchHistory`) section:
      - Empty state: `"No matches logged yet. Complete your first match!"` (`streaks.noMatchesLogged`)
      - Populated state: Note `"Each run keeps its latest 100 matches. Beyond that, the oldest attempts are deleted whole."` (`streaks.matchHistoryLimitNote`), up to 10 collapsible `StreakAttemptGroups` (`"Attempt {n}"`, `"{wins}W / {losses}L"`), each expanding `StreakMatchRow` items (character name or `Clock` `"Auto-loss, run was inactive"`, `"Streak: {n}"` on wins, `"win"`/`"loss"` badge, date)
      - `"Older attempts ({count})"` (`streaks.olderAttempts`) button when >10 attempts exist -> opens **Older Attempts Dialog Modal** (`variant="dialog"`, `size="2xl"`, title `"Older attempts"`).
- **Win History Drawer** (`components/streaks/ChallengeCompletionHistoryDrawer.tsx`):
  - Trigger: Clicking `"Win History"` (`History`) button in `GauntletHeader.tsx`.
  - Drawer (`variant="drawer-right"`, title `"Win History"` / `streaks.pastWins`):
    - Empty state: `"No completed runs yet. Finish the whole challenge to see it here!"` (`streaks.noCompletionsLogged`)
    - Populated state: List of completion cards with `Swords` `"{n} Matches"`, `RotateCcw` `"{n} Attempts"`, `Users` `"{n} killers"` / `"{n} survivors"`, and completion date.
- **Abandon Confirm Modal** (`components/streaks/AbandonConfirmModal.tsx` -> `ConfirmModal.tsx`):
  - Trigger: Clicking `"Abandon Run"` (`RotateCcw`) button in `GauntletHeader.tsx`.
  - Elements: Title `"Start over?"` (`streaks.abandonRunTitle`), message `"Do you want to leave this run and start over from the beginning?"` (`streaks.abandonConfirmPrompt`), header close `X` button, red confirm button `"Abandon"` (`streaks.abandonConfirm`).
- **Token Roll Modal** (`components/streaks/gauntlet/TokenRollModal.tsx` + `TokenRoulette.tsx`):
  - Trigger: Automatically opens after a win in `lemon_killer` mode (`tokenRoll != null`).
  - Elements: Lightbox modal with `Coins` icon; when balance is not full, shows `"Congratulations!"` (`streaks.tokenRollTitle`), vertical spinning number reel (`TokenRoulette` ticking through `1, 2, 3, 5`), result text `"You won {count} token(s)"` (`streaks.tokenRollResult`), and amber `"Continue"` (`streaks.continueButton`) button (disabled until reel lands). When balance is already at cap, shows `"Tokens full"` (`streaks.tokenFullTitle`) and `"You already have the maximum of {cap} tokens"` (`streaks.tokenFullText`).
- **Shield Prompt Modal** (`components/streaks/gauntlet/ShieldPromptModal.tsx`):
  - Trigger: Clicking `"LOST"` in `lemon_killer` mode when `tokens >= boosts.prices.shield` (8) and `current_streak > last_checkpoint_streak`.
  - Elements: Lightbox modal with red `Shield` icon, heading `"Do you want to use the shield to protect your run?"` (`streaks.shieldTitle`), subtitle `"Cost: {price} tokens"` (`streaks.shieldMessage`), secondary button `"No"` (`streaks.shieldDecline`), primary button `"Yes"` (`streaks.shieldConfirm`).
- **Checkpoint Celebration Modal** (`components/streaks/CheckpointCelebrationModal.tsx`):
  - Trigger: Automatically opens when a win banks a checkpoint (`justBankedCheckpoint != null`, after `TokenRollModal` closes if applicable).
  - Elements: Lightbox modal with animated amber rays, rings, sparks, `Flag` medallion, `"Checkpoint secured"` (`streaks.checkpointSecured`), and animated count-up `"{n} wins"` (`streaks.winsSuffix`).

---

## /streaks/[role]/id-please

### Page & files
- Page: `app/[locale]/streaks/[role]/id-please/page.tsx` (validates `role` in `['killer', 'survivor', 'challenge']`, else `notFound()`; maps role to lane `'killer' | 'survivor' | 'mixed'`)
- Layout: `app/[locale]/streaks/layout.tsx` (`components/streaks/StreaksLayoutShell.tsx`)
- Components:
  - `components/streaks/ChallengeModeGate.tsx`
  - `components/streaks/id-please/IdPleaseBoard.tsx`
  - `components/streaks/id-please/IdPleaseHeader.tsx`
  - `components/streaks/id-please/IdPleaseProgress.tsx`
  - `components/streaks/id-please/IdPleaseSetup.tsx`
  - `components/streaks/id-please/IdPleaseMatchCard.tsx`
  - `components/streaks/id-please/IdPleaseTiles.tsx`
  - `components/streaks/id-please/IdPleaseModeModal.tsx`
  - `components/streaks/id-please/IdPleaseRulesModal.tsx`
  - `components/streaks/id-please/IdPleaseStatsDrawer.tsx`
  - `components/streaks/id-please/idPleaseNeeds.ts`, `components/streaks/id-please/idPleaseAssets.ts`
  - `components/perks/PerkSearchBox.tsx`, `components/perks/PerkFilterMenu.tsx`, `components/perks/PerkFilterPanel.tsx`
  - `components/common/Toast.tsx`
  - `components/streaks/ChallengePanel.tsx`, `components/streaks/ChallengeProgress.tsx`, `components/streaks/StreakStatTiles.tsx`, `components/streaks/StreakActionBar.tsx`, `components/streaks/Confetti.tsx`, `components/streaks/AbandonConfirmModal.tsx`, `components/streaks/CheckpointCelebrationModal.tsx`, `components/streaks/ChallengeCompletionHistoryDrawer.tsx`, `components/streaks/StreakStatsDrawer.tsx`

### Layout elements
- **Confetti Canvas** (`Confetti.tsx`): Full-screen confetti burst when earning a difficulty badge or banking a checkpoint.
- **Error Banner** (`ChallengeErrorBanner`, conditional on `error`): Red alert box.
- **Recalculation / Stale Notice Banner** (`IdPleaseBoard.tsx`, conditional on `notice`): Amber `<output>` banner displaying one of:
  - `"Your characters or perks changed, so the matches were recalculated. Check the match again."` (`streaks.idPleaseRosterChanged`)
  - `"Your roster is below this difficulty's minimum. Nothing was counted."` (`streaks.idPleaseRosterBelowMin`)
  - `"That match was already reported. Showing the latest state."` (`streaks.idPleaseStaleMatch`)
- **Challenge Header** (`IdPleaseHeader.tsx`):
  - **Stat Tiles** (`StreakStatTiles.tsx`): `"Current"` (`Flame` icon + `current_streak`) and `"Best"` (`TrophyIcon` + `best_streak`). (No `FreezeBadge` because ID, Please rosters are live.)
  - **Header Action Controls** (`StandardHeaderActions`):
    - `ModeSelectButton`: Green/amber/red dot + difficulty label (`"Milestones"`, `"Hardcore"`, `"Hardcore+"`) + `ChevronDown`, tooltip `"Change Mode"` (`streaks.changeMode`) -> opens `IdPleaseModeModal`
    - `"Rules"` (`ScrollText` icon) -> opens `IdPleaseRulesModal`
    - `"Statistics"` (`BarChart2` icon) -> opens `IdPleaseStatsDrawer`
    - `"Win History"` (`History` icon) -> opens `ChallengeCompletionHistoryDrawer`
    - `"Abandon Run"` (`RotateCcw` danger icon) -> opens `AbandonConfirmModal`
    - Mobile collapse chevron button (`"More actions"`)
- **Progress Bar Strip** (`IdPleaseProgress.tsx` -> `ChallengeProgress.tsx` with `endless={true}`, rendered while `run.badge_progress` is non-null before the difficulty badge is earned):
  - Heading: `"Progress"` (`streaks.progressTitle`)
  - Counter: `"{current} / {target} wins"` (`streaks.idPleaseProgressWins`, in mixed lane or Hardcore/Hardcore+) or `"{current} / {target} characters"` (`streaks.idPleaseProgressCharacters`, in single-side Milestones)
  - Endless track: Solid progress bar up to 62% width (`TrophyIcon` at badge target + `Flag` nodes every 10 wins in Milestones), followed by a dashed line tail ending in an `InfinityIcon`.
- **Opening Setup View** (`IdPleaseSetup.tsx`, when `run.current_match === 0`):
  - Header: Heading `"Choose your opening"` (`streaks.idPleaseSetupTitle`) + counter `"{count}/4 chosen"` (`streaks.idPleasePerksChosen`)
  - **Side Toggle Fieldset** (shown only in `'mixed'` lane when `role === 'challenge'`, `aria-label="Choose a side"` / `streaks.idPleaseChooseSide`):
    - `"Survivor"` (`streaks.survivor`) button and `"Killer"` (`streaks.killer`) button
  - **Perk Search & Filter Bar**:
    - `PerkSearchBox` (`typesInField={false}`, `suggestPerks={true}`): Pill search input (`placeholder="Search perks, characters or types..."` / `perkTypes.searchPlaceholder`), clear button (`"Clear search"`), and autocomplete `Popover` showing matching `"Perk types"` (`perkTypes.suggestionsHeading`) with counts and up to 8 matching perks (with `"Alias:"` and character/general label)
    - `PerkFilterMenu` (`PerkFilterPanel.tsx`): `"Filters"` (`filters.filtersTitle`) dropdown button with `FiltersIcon` and active filter count `Badge`; opens popover with `"Perk types"` (`perkTypes.typesHeading`) 2-column `Checkbox` list with live counts and `"Reset Filters"` (`filters.clear`) button
  - **Owned Perk Inventory Grid**: Scrollable progressive grid (`max-h-96`) of `SelectableCard` tiles wrapping `IdPleasePerkTile`:
    - Perk icon (`PerkIcon` or `PerkHexIcon` fallback)
    - In-game inventory coordinate tag (`PerkCoordinateLabel`): Amber text `"[P{page}/S{slot}]"` (`generator.coordOpenPage`, `coordSlot`, `coordClose`) or `"[-/-]"` (`generator.emptyCoordinate`)
    - Perk display name
  - **Match Preview Cards** (`IdPleaseMatchCard.tsx`, shown once 4 perks are selected in `'milestones'` and `'hardcore'` difficulties; hidden in `'hardcore_plus'` because perks shuffle on start):
    - `"Match 1 · {Killer|Survivor}"` (`streaks.idPleaseMatchLabel`) card
    - `"Match 2 (preview) · {Killer|Survivor}"` (`streaks.idPleaseMatchTwoPreview`, shown in `'mixed'` lane)
  - **Sticky Action Bar**: Green button `"Start"` (`streaks.idPleaseStart`, disabled until 4 perks are chosen)
- **Active Match View** (`IdPleaseMatchCard.tsx`, when `run.current_match > 0`):
  - Heading (`h3`): `"Match {number} · {Killer|Survivor}"` (`streaks.idPleaseMatchLabel`)
  - Left column: Label `"Play as"` (`streaks.idPleasePlayAs`) + `IdPleaseCharacterTile` (character portrait + display name)
  - Right column: Label `"Perks"` (`streaks.idPleasePerksHeading`) + 4-column grid of `IdPleasePerkTile` cards (perk icon + amber `[P#/S#]` coordinate + perk name)
  - **Sticky Action Bar** (`StreakActionBar`): Red button `"LOST"` (`streaks.loseMatch`) + Green button `"WON"` (`streaks.winMatch`)
- **Badge Earned Toast** (`Toast.tsx`, when `justEarnedBadge` is true):
  - Amber centered toast with `CheckCircle2` icon: `"You earned the {difficulty} badge!"` (`streaks.idPleaseBadgeToast`) and dismiss button (`admin.close`).

### Modes / states
- **Lane Variants (by route `role`)**:
  - `role === 'survivor'` -> `'survivor'` lane (mode key `id_please_survivor`): Survivor only; Milestones badge requires winning with every owned survivor.
  - `role === 'killer'` -> `'killer'` lane (mode key `id_please_killer`): Killer only; Milestones badge requires winning with every owned killer.
  - `role === 'challenge'` -> `'mixed'` lane (mode key `id_please`): Alternates sides; player chooses starting side in setup; Milestones badge at 50 wins.
- **Difficulty Variants (`?difficulty=`)**:
  - `'milestones'` (green tone): Checkpoint every 10 wins; badge at 50 wins (mixed) or all owned characters (solo).
  - `'hardcore'` (amber tone): No checkpoints, no character repeats until all have played; badge at 30 wins.
  - `'hardcore_plus'` (red tone): Like Hardcore, but perks are shuffled at every start (no Match 1 preview during setup); badge at 25 wins.
- **Board States**:
  - **Loading State**: `"Loading..."` (`app.loading`).
  - **Locked / Ineligible Difficulty State** (`!run.eligibility.met`):
    - Heading (`h2`): `"This difficulty is locked"` (`streaks.idPleaseLockedTitle`)
    - Text: `"Own more characters and unlock more perks to play it. Nothing counts as a loss while you are below the minimum."` (`streaks.idPleaseLockedText`)
    - Amber list of requirements (`idPleaseNeeds`): `"{Killer|Survivor}: needs {need} characters ({have} owned)"` and/or `"{Killer|Survivor}: needs {need} unlocked perks ({have} unlocked)"`.
  - **Setup Empty / Search States** (`IdPleaseSetup.tsx`):
    - Side below minimum (<1 character or <4 perks): `"Not enough characters or perks on this side."` (`streaks.idPleaseSideEmpty`)
    - Role-only perk type conflict: `"{type} perks only exist for {role}."` (`perkTypes.roleOnlyTitle`)
    - No search results: `"No perks match your search."` (`streaks.idPleaseNoPerksFound`)
  - **Active Match State**: Displays `IdPleaseMatchCard` + `"LOST"` / `"WON"` action bar (endless mode: never transitions to a terminal completion screen; `IdPleaseProgress` bar disappears once badge is earned).
- **Admin Kill-Switch Block State** (`ChallengeModeGate.tsx`): Separate kill-switch per lane (`id_please`, `id_please_survivor`, `id_please_killer`).

### Modals & drawers (file)
- **ID, Please Mode Modal** (`components/streaks/id-please/IdPleaseModeModal.tsx`):
  - Trigger: Clicking `ModeSelectButton` in `IdPleaseHeader.tsx`.
  - Elements: Title `"Choose a difficulty"` (`streaks.idPleaseModeSelectTitle`), `"Rules"` button, 3 tiles (`"Milestones"`, `"Hardcore"`, `"Hardcore+"` with side-specific artwork `k1..k3` or `s1..s3`, `"Locked"` badge + shortfall description if ineligible, or amber `TrophyIcon` if badge earned), `"ACCEPT"` button.
- **ID, Please Rules Modal** (`components/streaks/id-please/IdPleaseRulesModal.tsx`):
  - Trigger: Clicking `"Rules"` button in `IdPleaseHeader.tsx` or inside `IdPleaseModeModal`.
  - Elements:
    - Title: `"Rules"` (`streaks.rules`)
    - `"How it works"` (`streaks.howItWorks`) bullets: lane-specific win condition (`gauntletWinConditionKiller`, `gauntletWinConditionSurvivor`, or `idPleaseWinMixed`), opening rule (`idPleaseRuleOpeningSolo` or `idPleaseRuleOpening`), `"Every match, you play the character shown with the 4 perks shown."` (`idPleaseRulePlay`), chain rule (`idPleaseRuleChain` or `idPleaseRuleChainPlus`), `"Unlocking or losing a character or perk changes the upcoming matches."` (`idPleaseRuleLive`), `"No end: win for as long as you can. Your best streak is kept."` (`idPleaseRuleEndless`)
    - `"Difficulty"` (`streaks.difficultyAndCheckpoints`) rows: `"Milestones"`, `"Hardcore"`, `"Hardcore+"`
    - `"Exceptions"` and `"Clarifications"` cards (lane-appropriate killer, survivor, or combined rules)
    - Footer notice: Only the `Clock` inactivity auto-loss notice (`showFreezeNotice={false}`).
- **ID, Please Statistics Drawer & Older Attempts Modal** (`components/streaks/id-please/IdPleaseStatsDrawer.tsx` -> `StreakStatsDrawer.tsx`):
  - Trigger: Clicking `"Statistics"` (`BarChart2`) button in `IdPleaseHeader.tsx`.
  - Elements: Win rate card, 4 stat cells (`Matches`, `Attempts`, `Wins`, `Losses`), collapsible attempt groups with match rows showing character name and `"Streak: {n}"` on wins, plus `"Older attempts"` modal when >10 attempts.
- **Win History Drawer** (`components/streaks/ChallengeCompletionHistoryDrawer.tsx`):
  - Trigger: Clicking `"Win History"` (`History`) button in `IdPleaseHeader.tsx`.
  - Elements: Lists badge-earning completions with `Matches`, `Attempts`, `"{n} characters"` (`streaks.idPleaseCharactersSubject`), and date.
- **Abandon Confirm Modal** (`components/streaks/AbandonConfirmModal.tsx`):
  - Trigger: Clicking `"Abandon Run"` (`RotateCcw`) button in `IdPleaseHeader.tsx`.
- **Checkpoint Celebration Modal** (`components/streaks/CheckpointCelebrationModal.tsx`):
  - Trigger: Banking a 10-win checkpoint in `'milestones'` difficulty.

---

## /streaks/killer/chaos-streak

### Page & files
- Page: `app/[locale]/streaks/killer/chaos-streak/page.tsx`
- Layout: `app/[locale]/streaks/layout.tsx` (`components/streaks/StreaksLayoutShell.tsx`)
- Components:
  - `components/streaks/ChallengeModeGate.tsx`
  - `components/streaks/chaos/ChaosBoard.tsx`
  - `components/streaks/chaos/ChaosHeader.tsx`
  - `components/streaks/chaos/SlotMachineStage.tsx`
  - `components/streaks/chaos/KillerPickerGrid.tsx`
  - `components/streaks/chaos/ChaosModeModal.tsx`
  - `components/streaks/chaos/ChaosRulesModal.tsx`
  - `components/streaks/chaos/ChaosPerkPoolModal.tsx`
  - `components/streaks/chaos/ChaosStatsDrawer.tsx`
  - `components/streaks/ChallengePanel.tsx`, `components/streaks/ChallengeProgress.tsx`, `components/streaks/StreakStatTiles.tsx`, `components/streaks/FreezeBadge.tsx`, `components/streaks/StreakActionBar.tsx`, `components/streaks/Confetti.tsx`, `components/streaks/AbandonConfirmModal.tsx`, `components/streaks/CheckpointCelebrationModal.tsx`, `components/streaks/ChallengeCompletionHistoryDrawer.tsx`, `components/streaks/StreakStatsDrawer.tsx`

### Layout elements
- **Confetti Canvas** (`Confetti.tsx`): Full-screen confetti burst on checkpoint or run completion.
- **Error Banner** (`ChallengeErrorBanner`, conditional on `error`).
- **Challenge Header** (`ChaosHeader.tsx`):
  - **Stat Tiles** (`StreakStatTiles.tsx`): `"Current"` (`Flame` + `current_streak`) and `"Best"` (`TrophyIcon` + `best_streak`).
  - **Freeze Badge** (`FreezeBadge.tsx`, shown once perks have been revealed in the run): `Snowflake` icon + freeze tooltip.
  - **Header Action Controls** (`StandardHeaderActions`):
    - `ModeSelectButton`: Green/amber/red dot + difficulty label (`"Easy"`, `"Medium"`, `"Hell"`) + `ChevronDown`, tooltip `"Change Difficulty"` (`streaks.changeDifficulty`) -> opens `ChaosModeModal`
    - **Perk Pool Button** (`HeaderButton`): Text button `"Perk Pool"` (`streaks.perkPool`) -> opens `ChaosPerkPoolModal`
    - **Draw Animations Toggle**: `ClapperboardIcon` button, tooltip `"Animations"` (`streaks.drawAnimations`)
    - `"Rules"` (`ScrollText` icon) -> opens `ChaosRulesModal`
    - `"Statistics"` (`BarChart2` icon) -> opens `ChaosStatsDrawer`
    - `"Win History"` (`History` icon) -> opens `ChallengeCompletionHistoryDrawer`
    - `"Abandon Run"` (`RotateCcw` danger icon) -> opens `AbandonConfirmModal`
    - Mobile collapse chevron button (`"More actions"`)
- **Progress Bar Strip** (`ChallengeProgress.tsx`):
  - `"Progress"` heading + `"Completed: {current} / {total}"` counter + progress track with `Flag` checkpoints (every 5 in Easy, every 10 in Medium, none in Hell) and finish `TrophyIcon`.
- **Slot Machine Stage** (`SlotMachineStage.tsx`):
  - **4 Perk Reel Windows** (`ReelStrip`): 4 square windows showing `"?"` fallback when unrevealed, vertical spinning perk strips (`REEL_DIRECTIONS = ['up', 'down', 'down', 'up']`), and landed `PerkIcon` images with `border-accent-red`.
  - **Desktop Slot Lever** (`SlotLever`, `max-sm:hidden`): Interactive 2D-projected mechanical lever (`TileButton`, `aria-label="Pull the lever!"` / `streaks.pullTheLever`) that swings down when pulled, accompanied by prompt text `"Pull the lever!"` (`streaks.pullTheLever`).
  - **Mobile Pull Button** (`sm:hidden`, shown when `!revealed`): Primary full-width button `"Pull the lever!"` (`streaks.pullTheLever`).
  - **2 Add-on Rarity Badges** (`RarityBadge`, shown once revealed and reels land): Chips displaying rarity icon (`/images/addon-rarity/{common|uncommon|rare|very-rare|ultra-rare}.webp`) + translated rarity label (`"Common"`, `"Uncommon"`, `"Rare"`, `"Very Rare"`, `"Ultra Rare"` / `streaks.addonRarity*`).
  - **Loading Indicator** (bottom of stage when `loading || busy`): `Spinner` + `"Loading..."` (`app.loading`).
- **Killer Picker Card** (`ChaosBoard.tsx` + `KillerPickerGrid.tsx`, shown when `!isCompleted`, dimmed with `opacity-40 pointer-events-none` until perks are revealed):
  - Heading (`h3`): `"Pick your killer"` (`streaks.pickYourKiller`)
  - Grid of `KillerTile` buttons (`TileButton`):
    - Killer portrait (`PerkIcon` or `PersonIcon` fallback) + killer display name
    - Completed state: Green border (`border-accent-green`) + top-right green `Check` badge + `aria-label="{name} (Cleared)"` (disabled)
    - Selected state: Red border & ring (`border-accent-red ring-2 ring-accent-red`)
- **Sticky Bottom Action Bar** (`StreakActionBar.tsx`, shown when `!isCompleted`):
  - Before accepting killer (`!acceptedKillerId`): Red button `"ACCEPT"` (`streaks.accept`, disabled until perks are revealed and a killer is selected)
  - After accepting killer (`acceptedKillerId` set): Red button `"LOST"` (`streaks.loseMatch`) + Green button `"WON"` (`streaks.winMatch`)
- **Admin Dev Skip Panel** (`ChaosBoard.tsx`, **Admin-Gated**: shown only when `isAdmin && !isCompleted`):
  - `Surface` card with `amberSoft` button: `TrophyIcon` + `"DEV: Skip to win screen"` (`streaks.devSkipWinLabel`), tooltip `"Dev only: win with every remaining killer to reach the completion screen"` (`streaks.devSkipWinTitle`).

### Modes / states
- **Difficulty Variants (`?difficulty=`, default `'hell'`)**:
  - `'easy'`: Checkpoint every 5 wins.
  - `'medium'`: Checkpoint every 10 wins.
  - `'hell'`: No checkpoints.
- **Stage Sub-States**:
  - **Unrevealed State**: Reels show `"?"`, lever is up, `"Pull the lever!"` prompt/button active, killer grid is dimmed (`opacity-40`) and non-interactive, `"ACCEPT"` button disabled.
  - **Revealed — Picking Killer State**: Reels land on 4 perks and 2 add-on rarities pop in; killer grid becomes interactive; selecting a killer enables `"ACCEPT"`.
  - **Revealed — Killer Locked / Match In Progress State** (`acceptedKillerId` set): Killer grid is locked (`disabled`), action bar switches to `"LOST"` and `"WON"`.
  - **Loading Killers State** (`KillerPickerGrid.tsx`): `"Loading your killers..."` (`streaks.loadingKillers`).
  - **Victory / Completed State** (`run.status === 'completed'`): Hides slot machine, killer grid, and action bar; renders `ChallengeVictoryCard` with `"Congratulations"` and `"You won the Chaos Streak"` (`streaks.chaosVictoryTitle`).
- **Admin Kill-Switch Block State** (`ChallengeModeGate.tsx`, mode `'chaos'`).

### Modals & drawers (file)
- **Chaos Perk Pool Modal** (`components/streaks/chaos/ChaosPerkPoolModal.tsx`):
  - Trigger: Clicking `"Perk Pool"` button in `ChaosHeader.tsx`.
  - Elements:
    - Dialog modal (`size="3xl"`, title `"Perk Pool"` / `streaks.perkPool`)
    - `SegmentedControl` (`aria-label="Perk Pool Navigation"` / `streaks.perkPoolTabs`): `"Used ({used.length})"` (`streaks.usedTab`) and `"Remaining ({remaining.length})"` (`streaks.remainingTab`)
    - Scrollable 4/6/8-col grid of `PerkTile` cards (perk icon + display name)
    - Empty states: Used tab `"No perks drawn yet this cycle."` (`streaks.noPerksDrawnYet`); Remaining tab `"The pool is empty; the next draw starts a fresh cycle."` (`streaks.perkPoolEmptyFreshCycle`).
- **Chaos Mode Modal** (`components/streaks/chaos/ChaosModeModal.tsx`):
  - Trigger: Clicking `ModeSelectButton` in `ChaosHeader.tsx`.
  - Elements: `"Easy"`, `"Medium"`, `"Hell"` tiles, `"Rules"` button, `"ACCEPT"` button.
- **Chaos Rules Modal** (`components/streaks/chaos/ChaosRulesModal.tsx`):
  - Trigger: Clicking `"Rules"` button in `ChaosHeader.tsx` or inside `ChaosModeModal`.
  - Elements:
    - Title: `"Rules"` (`streaks.rules`)
    - `"How it works"` (`streaks.howItWorks`) bullets: `"A win means 3 kills or more."` (`chaosWinCondition`), `"Perks don't repeat until the whole pool has been drawn."` (`chaosNoRepeatRule`), `"Add-ons must match the 2 drawn rarities."` (`chaosAddonRule`), `"A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero."` (`chaosCheckpointRule`), `"Clear the pool with every killer to complete the run."` (`chaosCompletionRule`)
    - `"Difficulty"` (`streaks.difficultyAndCheckpoints`) rows: `"Easy"`, `"Medium"`, `"Hell"`
    - `"Exceptions"` (`STANDARD_EXCEPTIONS`: Game cancelled, Hackers, Crash or server failure) and `"Clarifications"` (`STANDARD_CLARIFICATIONS`: Survivor disconnects, No dodging)
    - Footer notices: `Snowflake` run freeze notice + `Clock` inactivity auto-loss notice.
- **Chaos Statistics Drawer & Older Attempts Modal** (`components/streaks/chaos/ChaosStatsDrawer.tsx` -> `StreakStatsDrawer.tsx`):
  - Trigger: Clicking `"Statistics"` (`BarChart2`) button in `ChaosHeader.tsx`.
  - Elements: Win rate card, 4 stat cells (`Matches`, `Attempts`, `Wins`, `Losses`), collapsible attempt groups with match rows showing killer name and `"Streak: {n}"` on wins, plus `"Older attempts"` dialog modal.
- **Win History Drawer** (`components/streaks/ChallengeCompletionHistoryDrawer.tsx`):
  - Trigger: Clicking `"Win History"` (`History`) button in `ChaosHeader.tsx`.
  - Elements: Completion cards with `Matches`, `Attempts`, `"{n} killers"` (`streaks.killersLabel`), and date.
- **Abandon Confirm Modal** (`components/streaks/AbandonConfirmModal.tsx`):
  - Trigger: Clicking `"Abandon Run"` (`RotateCcw`) button in `ChaosHeader.tsx`.
- **Checkpoint Celebration Modal** (`components/streaks/CheckpointCelebrationModal.tsx`):
  - Trigger: Banking a checkpoint in `'easy'` or `'medium'` difficulty.

---

## /streaks/killer/history-streak

### Page & files
- Page: `app/[locale]/streaks/killer/history-streak/page.tsx`
- Layout: `app/[locale]/streaks/layout.tsx` (`components/streaks/StreaksLayoutShell.tsx`)
- Components:
  - `components/streaks/ChallengeModeGate.tsx`
  - `components/streaks/history/HistoryBoard.tsx`
  - `components/streaks/history/HistoryHeader.tsx`
  - `components/streaks/history/HistoryNextRowPreview.tsx`
  - `components/streaks/history/HistoryPerkPoolPanel.tsx`
  - `components/streaks/history/HistoryPerkModal.tsx`
  - `components/streaks/history/HistoryRowClearedBanner.tsx`
  - `components/streaks/history/HistoryModeModal.tsx`
  - `components/streaks/history/HistoryRulesModal.tsx`
  - `components/streaks/history/HistoryStatsDrawer.tsx`
  - `components/streaks/chaos/KillerPickerGrid.tsx`
  - `components/streaks/ChallengePanel.tsx`, `components/streaks/ChallengeProgress.tsx`, `components/streaks/StreakStatTiles.tsx`, `components/streaks/FreezeBadge.tsx`, `components/streaks/StreakActionBar.tsx`, `components/streaks/Confetti.tsx`, `components/streaks/AbandonConfirmModal.tsx`, `components/streaks/ChallengeCompletionHistoryDrawer.tsx`, `components/streaks/StreakStatsDrawer.tsx`

### Layout elements
- **Confetti Canvas** (`Confetti.tsx`): Full-screen confetti burst on run completion.
- **Row Cleared Floating Banner** (`HistoryRowClearedBanner.tsx`, fixed top-center `z-50` for 3.2s when `rowClearedNumber != null`):
  - Green-bordered card with `TrophyIcon` + `"Row cleared! Row {n} unlocked."` (`streaks.rowClearedPrefix`, `streaks.rowUnlockedSuffix`).
- **Error Banner** (`ChallengeErrorBanner`, conditional on `error`).
- **Challenge Header** (`HistoryHeader.tsx`):
  - **Stat Tiles** (`StreakStatTiles.tsx`): `"Current"` (`Flame` + `total_killers_beaten`) and `"Best"` (`TrophyIcon` + `best_killers_beaten`).
  - **Freeze Badge** (`FreezeBadge.tsx`, shown when `run.pool_frozen && hasProgress`): `Snowflake` icon + freeze tooltip.
  - **Header Action Controls** (`StandardHeaderActions`):
    - `ModeSelectButton`: Amber/red dot + mode label (`"Medium"`, `"Hell"`) + `ChevronDown`, tooltip `"Change Mode"` (`streaks.changeMode`) -> opens `HistoryModeModal`
    - **Draw Animations Toggle**: `ClapperboardIcon` button, tooltip `"Animations"` (`streaks.drawAnimations`) — controls lock-breaking animation in `HistoryPerkModal`
    - `"Rules"` (`ScrollText` icon) -> opens `HistoryRulesModal`
    - `"Statistics"` (`BarChart2` icon) -> opens `HistoryStatsDrawer`
    - `"Win History"` (`History` icon) -> opens `ChallengeCompletionHistoryDrawer`
    - `"Abandon Run"` (`RotateCcw` danger icon) -> opens `AbandonConfirmModal`
    - Mobile collapse chevron button (`"More actions"`)
- **Progress Bar Strip** (`ChallengeProgress.tsx`):
  - `"Progress"` heading + `"Completed: {total_killers_beaten} / {total_owned_killers}"` counter + progress track with `Flag` checkpoints at every row (`row_size`, typically 5) in `'medium'` mode (none in `'hell'`) and finish `TrophyIcon`.
- **Current Row Killer Picker** (`HistoryBoard.tsx` + `KillerPickerGrid.tsx` with `center={true}`):
  - Heading (`h3`): `"Pick your killer"` (`streaks.pickYourKiller`)
  - Centered row of `KillerTile` buttons for `run.current_row_killers` (completed killers marked with green border + `Check` badge; selected killer marked with red border/ring).
- **Next Row Preview Disclosure** (`HistoryNextRowPreview.tsx`, shown when `nextRow.length > 0`):
  - `DisclosureButton`: `"Next row preview · Row {currentRowIndex + 2}"` (`streaks.nextRowPreviewLabel`, `streaks.rowLabel`) + chevron
  - `Collapsible` body: Centered row of greyscale dimmed `PreviewTile` cards (killer portrait + name).
- **Perk Pool Panel** (`HistoryPerkPoolPanel.tsx`, rendered below `ChallengePanel` when `!isCompleted && run`):
  - Header: Heading `"Perk Pool"` (`streaks.perkPool`) + `SearchInput` (`placeholder="Search..."` / `streaks.searchPerksPlaceholder`) with clear `X` icon button (`aria-label="Clear search"` / `streaks.clearSearch`)
  - **Available Section**:
    - Subheading with green `CheckCircle2` icon: `"Available"` (`streaks.availableLabel`)
    - Grid of `UnlockedTile` cards (perk icon + display name; freshly unlocked perks animate with `chaos-badge-pop`)
    - Empty states: `"No perks match your search."` (`streaks.noPerksMatchSearch`) when filtering, or `"No perks unlocked yet."` (`streaks.noPerksUnlockedYet`)
  - **Locked Section**:
    - Subheading with `LockIcon`: `"Locked"` (`streaks.lockedLabel`)
    - Grid of `LockedTile` cards (greyscale dimmed perk icon + display name + centered `LockIcon` overlay badge)
    - Empty states: `"No perks match your search."` (`streaks.noPerksMatchSearch`) when filtering, or `"Every perk is unlocked."` (`streaks.everyPerkUnlocked`).
- **Sticky Bottom Action Bar** (`StreakActionBar.tsx`, shown when `!isCompleted`):
  - Before accepting killer (`!acceptedKillerId`): Red button `"ACCEPT"` (`streaks.accept`, disabled until a killer in the current row is selected)
  - After accepting killer (`acceptedKillerId` set): Red button `"LOST"` (`streaks.loseMatch`) + Green button `"WON"` (`streaks.winMatch`)

### Modes / states
- **Mode Variants (`?mode=`, default `'hell'`)**:
  - `'medium'`: Checkpoint after every cleared row.
  - `'hell'`: No checkpoints; one loss resets the entire run.
- **Stage Sub-States**:
  - **Picking Killer in Row State**: Current row killers are selectable; `"ACCEPT"` button locks the choice (persisted in localStorage per row/attempt).
  - **Killer Locked / Match In Progress State** (`acceptedKillerId` set): Current row killer tiles are disabled; action bar shows `"LOST"` / `"WON"`.
  - **Loading Killers State**: `"Loading your killers..."` (`streaks.loadingKillers`).
  - **Victory / Completed State** (`run.status === 'completed'`): Hides killer picker and `HistoryPerkPoolPanel`; renders `ChallengeVictoryCard` with `"Congratulations"` and `"You won the History Streak"` (`streaks.historyStreakComplete`).
- **Admin Kill-Switch Block State** (`ChallengeModeGate.tsx`, mode `'history'`).

### Modals & drawers (file)
- **History Perk Unlock Modal** (`components/streaks/history/HistoryPerkModal.tsx`):
  - Trigger: Automatically opens after reporting a `"WON"` match (`perkModal != null`).
  - Elements:
    - Lightbox modal with amber `CelebrationBadge` (`TrophyIcon`)
    - Label: `"Congratulations"` (`streaks.victoryCongrats`)
    - Heading (`h2`): `"You unlocked {count} new perk(s)"` (`streaks.unlockedPerks`) or `"No new perks this time."` (`streaks.noNewPerks`)
    - 3-column grid of unlocked `PerkTile` cards (when `animations` enabled, each tile starts greyscale with a `LockIcon` overlay that shakes, breaks, and reveals the full-color perk icon)
    - Amber full-width button: `"Continue"` (`streaks.continueButton`).
- **History Mode Modal** (`components/streaks/history/HistoryModeModal.tsx`):
  - Trigger: Clicking `ModeSelectButton` in `HistoryHeader.tsx`.
  - Elements: `"Medium"` and `"Hell"` tiles, `"Rules"` button, `"ACCEPT"` button.
- **History Rules Modal** (`components/streaks/history/HistoryRulesModal.tsx`):
  - Trigger: Clicking `"Rules"` button in `HistoryHeader.tsx` or inside `HistoryModeModal`.
  - Elements:
    - Title: `"Rules"` (`streaks.rules`)
    - `"How it works"` (`streaks.howItWorks`) bullets: `"A win means 3 kills or more."` (`historyWinCondition`), `"You start with every General perk unlocked."` (`historyStartingPerksNote`), `"Beating a killer adds their teachables to your pool."` (`historyPerkUnlockRule`), `"A checkpoint saves your progress, so a loss falls back to your last checkpoint instead of zero."` (`historyCheckpointRule`), plus italic hint `"For the full experience try to play killers in order from the oldest to newest. 🙂"` (`historyConceptHint`)
    - `"Difficulty"` (`streaks.difficultyAndCheckpoints`) rows: `"Medium"` (`"Checkpoint every row."`) and `"Hell"` (`"No checkpoints."`)
    - `"Exceptions"` (`STANDARD_EXCEPTIONS`) and `"Clarifications"` (`STANDARD_CLARIFICATIONS_WITH_ADDONS`)
    - Footer notices: `Snowflake` run freeze notice + `Clock` inactivity auto-loss notice.
- **History Statistics Drawer & Older Attempts Modal** (`components/streaks/history/HistoryStatsDrawer.tsx` -> `StreakStatsDrawer.tsx`):
  - Trigger: Clicking `"Statistics"` (`BarChart2`) button in `HistoryHeader.tsx`.
  - Elements: Win rate card, 4 stat cells (`Matches`, `Attempts`, `Wins`, `Losses`), collapsible attempt groups with match rows showing killer name and `"Killers: {streak_after} · Row {row_index + 1}"` on wins (or `"Row {row_index + 1}"` on losses), plus `"Older attempts"` dialog modal.
- **Win History Drawer** (`components/streaks/ChallengeCompletionHistoryDrawer.tsx`):
  - Trigger: Clicking `"Win History"` (`History`) button in `HistoryHeader.tsx`.
  - Elements: Completion cards with `Matches`, `Attempts`, `"{n} killers"` (`streaks.killersLabel`), and date.
- **Abandon Confirm Modal** (`components/streaks/AbandonConfirmModal.tsx`):
  - Trigger: Clicking `"Abandon Run"` (`RotateCcw`) button in `HistoryHeader.tsx`.

---

## /streaks/killer/page-streak

### Page & files
- Page: `app/[locale]/streaks/killer/page-streak/page.tsx`
- Layout: `app/[locale]/streaks/layout.tsx` (`components/streaks/StreaksLayoutShell.tsx`)
- Components:
  - `components/streaks/ChallengeModeGate.tsx`
  - `components/streaks/PageStreakBoard.tsx`
  - `components/streaks/page-streak/PageStreakRoster.tsx`
  - `components/streaks/page-streak/KillerRosterGrid.tsx`
  - `components/DisabledBadge.tsx`
  - `components/DisabledReasonModal.tsx`
  - `components/common/ConfirmModal.tsx`

### Layout elements
- **Top Action Bar** (`PageStreakBoard.tsx`):
  - Right-aligned secondary button (`size="sm"`): `RotateCcw` icon + `"Abandon all"` (`streaks.abandonAllRuns`) -> opens `ConfirmModal`.
- **Killer Roster Grid** (`PageStreakRoster.tsx` -> `KillerRosterGrid.tsx`, 3/5/10-col responsive grid of killer cards):
  - **Killer Card Anatomy** (`KillerRosterGrid.tsx`):
    - Portrait (`KillerPortrait`: `PerkIcon` or `PersonIcon` fallback)
    - Killer display name
    - Mini horizontal progress bar (`bg-accent-amber`, width `pct%` of pages cleared; hidden when completed or unplayable)
    - Status caption:
      - Not started / In progress (playable): `"{cleared} of {page_count} pages"` (`streaks.ofLabel`, `streaks.pagesCount`; amber text when `in_progress`, muted when `not_started`)
      - Completed (`status === 'completed'`): Green text `"Completed · Pages: {page_count}"` (`streaks.completed`, `streaks.pagesCompleted`)
    - Ever-Completed Corner Badge (shown when `entry.ever_completed || entry.status === 'completed'`): Top-right green circle `Check` icon with tooltip `"Completed: Pages: {clearedPages}"` (`streaks.completed`, `streaks.pagesCompleted`).

### Modes / states
- **Killer Card Variants**:
  - **Playable — Not Started** (`owned && !disabled && status === 'not_started'`): Standard `<Link>` card to `/{locale}/streaks/killer/page-streak/{encodeURIComponent(killer)}`.
  - **Playable — In Progress** (`owned && !disabled && status === 'in_progress'`): Amber-tinted `<Link>` card (`border-accent-amber/45 bg-accent-amber/[0.07]`).
  - **Playable — Completed** (`owned && !disabled && status === 'completed'`): Green-tinted pulsing `<Link>` card (`border-accent-green/40 bg-accent-green/[0.07] ps-complete-pulse`).
  - **Admin-Disabled Killer** (`entry.disabled === true`): Non-clickable greyscale card (`opacity-40 grayscale`) with full-color top-left amber `DisabledBadge` (`TriangleAlert` icon button, `aria-label={displayName}`) -> clicking opens `DisabledReasonModal`.
  - **Unowned Killer** (`!entry.owned && !entry.disabled`): Non-clickable greyscale card (`opacity-40 grayscale`, `aria-disabled="true"`), status line hidden.
- **Board States**:
  - **Loading State** (`PageStreakRoster.tsx`): Centered muted text `"Loading roster…"` (`streaks.loadingRoster`).
  - **Error State** (`PageStreakRoster.tsx`): Red alert bar with error text and `"Retry"` (`streaks.retry`) `InlineLink` button.
- **Admin Kill-Switch Block State** (`ChallengeModeGate.tsx`, mode `'page_streak'`).

### Modals & drawers (file)
- **Abandon All Confirm Modal** (`components/common/ConfirmModal.tsx` in `PageStreakBoard.tsx`):
  - Trigger: Clicking `"Abandon all"` button at top-right of `/streaks/killer/page-streak`.
  - Elements: Title `"Abandon all?"` (`streaks.abandonAllRunsTitle`), message `"Every run in progress goes back to Page 1."` (`streaks.abandonAllRunsPrompt`), header close `X` button, red confirm button `"Abandon"` (`streaks.abandonConfirm`).
- **Disabled Reason Modal** (`components/DisabledReasonModal.tsx` in `KillerRosterGrid.tsx`):
  - Trigger: Clicking the amber `DisabledBadge` (`TriangleAlert`) on an admin-disabled killer card.
  - Elements: Title `"Temporarily disabled"` (`modal.temporarilyDisabled`), body `"{killer} was disabled temporarily."` + optional `"Reason: {reason}"`.

---

## /streaks/killer/page-streak/[killer]

### Page & files
- Page: `app/[locale]/streaks/killer/page-streak/[killer]/page.tsx` (decodes `killer` URL param via `safeDecodeParam`, else `notFound()`)
- Layout: `app/[locale]/streaks/layout.tsx` (`components/streaks/StreaksLayoutShell.tsx`)
- Components:
  - `components/streaks/ChallengeModeGate.tsx`
  - `components/streaks/page-streak/PageStreakRunView.tsx`
  - `components/streaks/page-streak/RunHeader.tsx`
  - `components/streaks/page-streak/PerkPageGrid.tsx`
  - `components/streaks/page-streak/PerkTile.tsx`
  - `components/streaks/page-streak/BuildPanel.tsx`
  - `components/streaks/page-streak/PageStreakRulesModal.tsx`
  - `components/streaks/page-streak/PageStreakStatsDrawer.tsx`
  - `components/streaks/ChallengePanel.tsx`, `components/streaks/ChallengeProgress.tsx`, `components/streaks/StreakStatTiles.tsx`, `components/streaks/FreezeBadge.tsx`, `components/streaks/StreakActionBar.tsx`, `components/streaks/Confetti.tsx`, `components/streaks/AbandonConfirmModal.tsx`, `components/streaks/ChallengeCompletionHistoryDrawer.tsx`, `components/streaks/StreakStatsDrawer.tsx`

### Layout elements
- **Confetti Canvas** (`Confetti.tsx`): Full-screen confetti burst when `run.status === 'completed'`.
- **Back Navigation Link** (`PageStreakRunView.tsx`): Secondary button-styled `<Link>` to `/{locale}/streaks/killer/page-streak` with rotated `ChevronIcon` and label `"Back"` (`streaks.back`).
- **Error Banner** (`ChallengeErrorBanner`, conditional on `error && !killerUnavailable`).
- **Challenge Header** (`RunHeader.tsx`):
  - **Stat Tiles** (`StreakStatTiles.tsx`):
    - `"Current"` (`streaks.current`): `Flame` icon + pages cleared in current run (`current_page - 1`, or `page_count` when completed)
    - `"Best"` (`streaks.best`): `TrophyIcon` + `run.best_page`
  - **Freeze Badge** (`FreezeBadge.tsx`, shown when `run.pool_frozen`): `Snowflake` icon + freeze tooltip.
  - **Header Action Controls** (`StandardHeaderActions`):
    - `"Rules"` (`ScrollText` icon) -> opens `PageStreakRulesModal`
    - `"Statistics"` (`BarChart2` icon) -> opens `PageStreakStatsDrawer`
    - `"Win History"` (`History` icon) -> opens `ChallengeCompletionHistoryDrawer`
    - `"Abandon Run"` (`RotateCcw` danger icon) -> opens `AbandonConfirmModal`
    - Mobile collapse chevron button (`"More actions"`)
- **Progress Bar Strip** (`ChallengeProgress.tsx`):
  - `"Progress"` heading + `"Completed: {cleared} / {page_count}"` counter + progress track with finish `TrophyIcon` (`checkpoints={[]}`).
- **Main Build & Perk Page Workspace** (`PageStreakRunView.tsx`, 2-column `lg:grid-cols-main-aside` when `run.status !== 'completed'`):
  - **Page Switcher Tabs** (`SegmentedControl`, shown above the perk grid when `run.current_page < run.page_count`, `aria-label="Page"` / `streaks.pageLabel`):
    - Tab 1: `"Page {current_page}"` (`streaks.pageLabel`)
    - Tab 2: `"Page {current_page + 1}"` (`streaks.pageLabel`)
  - **In-Game Perk Page Grid** (`PerkPageGrid.tsx` + `PerkTile.tsx`):
    - Staggered 5/4 diamond grid (`ALTERNATING_ROWS = [5, 4]`, or even staggered rows when a final page has fewer than 15 perks)
    - Each `PerkTile` is a diamond-clipped `TileButton` (`PerkIcon` or perk name text fallback) with tooltip showing the localized perk name and a red SVG diamond outline when `selected`
    - Unselected perks fade (`opacity-35`) once the build is confirmed (`locked={confirmed}`)
    - When viewing `"Page {current_page + 1}"`, the grid is rendered read-only and dimmed (`pointer-events-none opacity-40 grayscale`).
  - **Selected Build Aside** (`BuildPanel.tsx`, `aria-label="Your build for this match"` / `streaks.yourBuildForMatch`):
    - Killer portrait (`PerkIcon` or `PersonIcon` fallback) + killer display name heading (`h3`)
    - 4-slot diamond cluster (or fewer if the last page has <4 perks): dashed SVG diamond slots (`aria-label="Slot {n}"` / `streaks.slotLabel` with `Plus` icon when empty; animated `motion.img` perk icon with perk name tooltip when filled).
- **Sticky Bottom Action Bar** (`StreakActionBar.tsx`, shown when `run.status !== 'completed'`):
  - **Before Confirming Build (`!confirmed`)**: Single red button `"CONFIRM"` (`streaks.confirmBuild`, disabled until `selected.length === buildSize`, i.e. 4 perks or all perks on a <4-perk final page). Clicking locks the perk pages (`lockPages()`) and marks the build confirmed.
  - **After Confirming Build (`confirmed`)**: Red button `"LOST"` (`streaks.loseMatch`) + Green button `"WON"` (`streaks.winMatch`).

### Modes / states
- **Sub-States**:
  - **Loading / Auto-Start State**: Shows `"Loading streak…"` (`streaks.loadingStreak`); if no run exists yet, automatically calls `startRun()`.
  - **Unavailable / Unowned Killer State** (`errorStatus === 404`): Shows `"Loading streak…"` and automatically redirects (`router.replace`) to `/{locale}/streaks/killer/page-streak`.
  - **Build Selection State** (`!confirmed`, viewing `"Page N"`): Diamond perk tiles are toggleable (`onToggle`); `"CONFIRM"` button in sticky bar is enabled once `buildSize` perks are picked.
  - **Next Page Preview State** (`viewingNext === true`, viewing `"Page N+1"`): Displays next page's perks dimmed and non-interactive (`dimmed`).
  - **Build Confirmed / Match In Progress State** (`confirmed === true`): Perk tiles on `"Page N"` are locked (`onToggle` removed, unpicked tiles faded to `opacity-35`); sticky action bar switches from `"CONFIRM"` to `"LOST"` and `"WON"`.
  - **Page Transition Animations**: Winning a page slides the next page in (`ps-page-enter`); losing resets back to Page 1 with `ps-page-reset`.
  - **Victory / Completed State** (`run.status === 'completed'`): Hides perk grid, build panel, and sticky action bar; renders `ChallengeVictoryCard` with `"Congratulations"`, title `"You won the Page Streak"` (`streaks.pageStreakVictoryTitle`), and subtitle `"on {killerDisplayName}"` (`streaks.pageStreakVictoryPrefix`).
- **Admin Kill-Switch Block State** (`ChallengeModeGate.tsx`, mode `'page_streak'`).

### Modals & drawers (file)
- **Page Streak Rules Modal** (`components/streaks/page-streak/PageStreakRulesModal.tsx`):
  - Trigger: Clicking `"Rules"` (`ScrollText`) button in `RunHeader.tsx`.
  - Elements:
    - Title: `"Rules"` (`streaks.rules`)
    - `"How it works"` (`streaks.howItWorks`) bullets: `"A win means 3 kills or more."` (`pageStreakKillWinCondition`), `"Win a page to move to the next."` (`pageStreakWinCondition`), `"Lose and start over."` (`pageStreakLossCondition`)
    - `"Exceptions"` (`STANDARD_EXCEPTIONS`: Game cancelled, Hackers, Crash or server failure) and `"Clarifications"` (`STANDARD_CLARIFICATIONS_WITH_ADDONS`: Survivor disconnects, No dodging, Add-ons and offerings)
    - Footer notices: `Snowflake` run freeze notice + `Clock` inactivity auto-loss notice.
- **Page Streak Statistics Drawer & Older Attempts Modal** (`components/streaks/page-streak/PageStreakStatsDrawer.tsx` -> `StreakStatsDrawer.tsx`):
  - Trigger: Clicking `"Statistics"` (`BarChart2`) button in `RunHeader.tsx`.
  - Elements: Scoped to the current killer — Win rate card, 4 stat cells (`Matches`, `Attempts`, `Wins`, `Losses`), collapsible attempt groups with match rows showing killer name and `"Page {page_number}"` (`streaks.pageLabel`), plus `"Older attempts"` dialog modal when >10 attempts.
- **Win History Drawer** (`components/streaks/ChallengeCompletionHistoryDrawer.tsx`):
  - Trigger: Clicking `"Win History"` (`History`) button in `RunHeader.tsx`.
  - Elements: Scoped to the current killer — completion cards showing `Swords` `"{n} Matches"`, `RotateCcw` `"{n} Attempts"`, `PagesIcon` `"Pages: {pages_count}"` (`streaks.pagesCompleted`), and completion date (no `subjectLabel` / character count).
- **Abandon Confirm Modal** (`components/streaks/AbandonConfirmModal.tsx`):
  - Trigger: Clicking `"Abandon Run"` (`RotateCcw`) button in `RunHeader.tsx`.
  - Elements: Title `"Start over?"`, message `"Do you want to leave this run and start over from the beginning?"`, confirm button `"Abandon"` (resets the killer's run back to Page 1 and clears saved localStorage build).
