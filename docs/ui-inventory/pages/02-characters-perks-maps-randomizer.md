# UI Inventory — Characters, Perks, Maps & Randomizer

Exhaustive inventory of all visible UI elements, component trees, interactive states, modes, and modals/drawers for `/characters`, `/characters/[slug]`, `/perks`, `/maps`, and `/randomizer` (plus shared modals `ChaosWheelModal`, `PerkModal`, `ScraperConfigModal`, and map tools). All component paths are relative to `frontend/src/`. English strings come from `locales/en/*`.

---

## /characters

### Page & files
- **Route page**: `app/[locale]/characters/page.tsx` (`generateMetadata`: `app.charactersPageTitle` = `"LemonDBD - Characters & Teachables"`)
- **Route loading**: `app/[locale]/characters/loading.tsx` -> `CharactersGridSkeleton`
- **Feature barrel**: `features/characters/index.ts`
- **Client wrapper**: `components/character-detail/CharactersClient.tsx`
- **Main hub**: `components/CharactersHub.tsx`
- **Toolbar & controls**: `components/characters/hub/CharactersToolbar.tsx`
- **Cards & overlays**: `components/characters/hub/CharacterCard.tsx`, `components/characters/CharacterOwnershipOverlay.tsx`, `components/DisabledBadge.tsx`
- **Ownership state & bars/toasts**: `components/characters/hub/useCharacterOwnership.ts`, `components/characters/hub/OwnershipSaveBar.tsx`, `components/characters/hub/SavedChangesToast.tsx`, `components/characters/hub/VerificationNotice.tsx`, `components/common/StickyActionBar.tsx`, `components/common/Toast.tsx`
- **Skeletons**: `components/character-detail/CharactersSkeleton.tsx` (`CharactersGridSkeleton`), `components/common/DbdSpinner.tsx`
- **Modals**: `components/characters/PerksTogglePopup.tsx`, `components/common/ConfirmModal.tsx`, `components/DisabledReasonModal.tsx`, `components/AuthModal.tsx` (`components/auth/AuthModalParts.tsx`, `components/EmailVerificationForm.tsx`, `components/auth/TwoFactorChallengeForm.tsx`, `components/common/AltchaWidget.tsx`, `components/legal/LegalDocModal.tsx`, `components/moderation/AccountBlockedNotice.tsx`)

### Layout elements
- **Toolbar (`CharactersToolbar.tsx`)** (`<section aria-label="Character Dossier">` / `characterDetail.characterOverview`):
  - **Role SegmentedControl** (`aria-label="Category"` / `filters.category`):
    - Option `'Survivor'`: `"Survivors ({survivorCount})"` (`filters.survivor`), active green (`bg-accent-green`)
    - Option `'Killer'`: `"Killers ({killerCount})"` (`filters.killer`), active red (`bg-accent-red`)
    - Selecting a tab updates URL query `?role=Survivor` or `?role=Killer` (also reads `?tab=`)
  - **Ownership Mode Toggle Button**:
    - Default state: `LockIcon` + `"My Characters"` (`characterDetail.myCharacters`), `variant="secondary"`
    - Loading ownership state (`ownershipLoading`): `"Loading..."` (`app.loading`), disabled
    - Active ownership mode (`ownershipMode`): `X` icon + `"Exit Selection"` (`characterDetail.exitSelection`), `variant="amber"`, `aria-pressed="true"`
  - **Character Search Input (`IconInput`)**:
    - Leading `Search` icon, placeholder & `aria-label`: `"Search..."` (`filters.filterByCharacter`)
    - Matches normalized character `name` or `real_name` (accent-insensitive)
    - **Clear Search Button** (shown when `searchQuery` is non-empty): `X` icon button, `aria-label="Clear search"` (`filters.clearSearch`)
- **Character Roster Grid** (`<section aria-label="Character Dossier">`, `grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8`):
  - **Character Card (`CharacterCard.tsx`)** (3:4 aspect ratio `Surface` tile per character):
    - **Browse mode click target**: Full-card `<Link href="/{locale}/characters/{slug}" aria-label="{char.name}">`
    - **Ownership mode click target**: Full-card `<button aria-pressed="{isOwned}" aria-label="{char.name}">` toggling character ownership (and all their teachable perks)
    - **Disabled Badge (`DisabledBadge.tsx`)** (shown when `char.is_disabled && !ownershipMode`): Top-left amber pill button (`TriangleAlert` icon, `aria-label="{char.name}"`), opens `DisabledReasonModal`
    - **Portrait Image (`Img`)**: Character bust thumbnail (`/api/v1/thumbs/avatars/256/...` with fallback cascade to full `.webp` / `.png`), `alt="{char.name}"`; greyed out (`grayscale opacity-60`) when `char.is_disabled`
    - **Ownership Clip Overlay (`OwnershipClipOverlay` in `CharacterOwnershipOverlay.tsx`)** (when `ownershipMode` is active):
      - Owned (`isOwned`): Full color portrait
      - Unowned (`!isOwned && !hasPartialPerks`): Full grayscale + dark scrim (`bg-bg-primary/60`)
      - Partially owned perks (`!isOwned && perkStats.unlocked > 0`): Left half grayscale + dark scrim (`clipPath: inset(0 50% 0 0)`), right half full color
      - *(Note: `CharacterOwnershipOverlay` also exports a badge variant with top-left `LockIcon` / `Check` icon + status tooltips, used in onboarding legend)*
    - **Perks Sub-Button** (shown on card bottom when `ownershipMode && !isOwned`): Amber pill button (`variant="amberSoft" size="xs"`), label `"Perks ({unlocked}/{total})"` (`filters.perks`), opens `PerksTogglePopup` for that character without toggling card ownership
    - **Name Footer Bar**: Bottom strip with `<h3>` character name (`{char.name}`)

### Modes / states
- **Browse Mode (default)**: Cards link to `/characters/[slug]`; disabled characters show `DisabledBadge`.
- **Ownership Selection Mode (`ownershipMode = true`, auth + verified email gated)**:
  - Unauthenticated user clicking `"My Characters"`: Triggers `AuthModal` in `'login'` mode.
  - Authenticated but unverified email user (when `features.emailVerificationRequired` is on): Shows `VerificationNotice` center-top `Toast` (`tone="amberSolid"`, `MailWarning` icon, message `"Verify your email to manage your character collection."` / `user.verifyEmailRequired`) with actions:
    - Button `"Verify email"` (`streaks.verifyEmail`) -> opens `AuthModal` in `verify-reminder` mode
    - InlineLink `"Dismiss"` (`characterDetail.dismiss`)
  - Active `ownershipMode`:
    - Container gains `pb-20` bottom padding
    - Cards act as ownership toggle buttons; unowned cards show `"Perks (unlocked/total)"` button
    - **Bottom Sticky Save Bar (`OwnershipSaveBar.tsx` -> `StickyActionBar.tsx`)**:
      - Optional error alert above button: `ownershipSaveError` (`"Couldn't save your ownership changes. Please try again."` / `characterDetail.saveOwnershipError`)
      - Primary red uppercase button (`ActionBarButton`): `"ACCEPT"` (`streaks.accept`) or `"Saving..."` (`characterDetail.saving`) while `ownershipSaving`
    - Browser `beforeunload` warning active when draft has unsaved changes (`isDirty`)
- **Saved Changes Toast (`SavedChangesToast.tsx`)**:
  - Top-right green `Toast` (`CheckIcon`, message `"Changes saved"` / `characterDetail.changesSaved`, close `X` button `aria-label="Dismiss"` / `characterDetail.dismiss`, auto-dismisses)
- **Loading State (`loading.tsx` / `CharactersGridSkeleton`)**:
  - `<output aria-busy="true" aria-label="Loading Character Details...">` with `DbdSpinner` (`accent="blood"`, label `"Loading Character Details..."` / `characterDetail.loading`, sublabel `"Loading survivor & killer dossiers"`)
- **Ownership Load Error State**:
  - Inline `<p role="alert">` in red: `"Couldn't load your characters and perks. Please try again."` (`characterDetail.loadOwnershipError`)
- **Empty Search / Filter State (`EmptyState` variant `"dashed"`)**:
  - `SearchX` icon, heading `"No Characters Found"` (`characterDetail.noCharactersFound`), subtitle `"No characters match your current filter or search query."` (`characterDetail.hubNoMatchingCharacters`)
  - Action button (when `searchQuery` is non-empty): `"Reset Filters"` (`app.resetFilters`) -> clears search

### Modals & drawers (file)
- **Perks Toggle Popup (`components/characters/PerksTogglePopup.tsx`)**:
  - **Trigger**: Clicking `"Perks (unlocked/total)"` button on an unowned `CharacterCard` in `ownershipMode`
  - **Shell**: `Modal` (`variant="sheet" size="lg" layer="top"`), title `"{character.name} Perks"`, close button `aria-label="Close"` (`modal.close`)
  - **Contents**:
    - Help caption: `"Click a perk to toggle whether you own it."` (`characterDetail.togglePerkOwnershipHelp`)
    - 3-column grid of character's teachable perks (`TileButton` per perk):
      - Perk icon (`Img`, grayscale + `opacity-50` when locked)
      - Bottom-right circular status badge: Green `Check` icon when unlocked, muted `LockIcon` when locked
      - Perk name (`perk.name`)
      - Permanently unlocked perks (`is_generic_counterpart` or `is_general`) are disabled (`aria-disabled="true"`)
    - Empty fallback (if character has 0 teachable perks): `"No teachable perks for this character."` (`characterDetail.noTeachablePerksForCharacter`)
- **Discard Ownership Changes Confirm Modal (`components/common/ConfirmModal.tsx`)**:
  - **Trigger**: Clicking `"Exit Selection"` in `CharactersToolbar` while `isDirty` is true
  - **Shell**: `Modal` (`variant="confirm" size="xs" layer="top"`), title `"Discard your changes?"` (`characterDetail.discardOwnershipTitle`), message `"You changed which characters and perks you own but haven't saved. Leave without saving?"` (`characterDetail.discardOwnershipMessage`), close `X` button (`modal.close`)
  - **Footer buttons**:
    - Alternative button: `"Keep editing"` (`characterDetail.keepEditingOwnership`)
    - Confirm red button: `"Discard changes"` (`characterDetail.discardOwnershipConfirm`)
- **Disabled Reason Modal (`components/DisabledReasonModal.tsx`)**:
  - **Trigger**: Clicking `DisabledBadge` (`TriangleAlert`) on a disabled character card
  - **Shell**: `Modal` (`variant="confirm"`), title `"Temporarily disabled"` (`modal.temporarilyDisabled`), close button (`modal.close`)
  - **Contents**: `"{character.name} was disabled temporarily."` (`modal.wasDisabledTemporarily`) + optional `"Reason: {disabled_reason}"` (`modal.reasonLabel`)
- **Authentication Modal (`components/AuthModal.tsx` & `components/auth/AuthModalParts.tsx`)**:
  - **Trigger**: Clicking `"My Characters"` while logged out (`initialMode="login"`), or clicking `"Verify email"` in `VerificationNotice` (`verifyEmailFor={user.email}`)
  - **Shell**: `Modal` (`variant="dialog" size="md"`), dynamic title (`"Sign In"` / `"Create Account"` / `"Reset Password"` / `"Verify Email"` / `"Two-step verification"` / `"Account banned"` / `"Account suspended"`), close button (`modal.close`)
  - **Sub-views / modes inside `AuthModal`**:
    - **Security check loader (`SecurityCheck`)**: `Spinner` + `"Running security check"` (`user.authSecurityCheck`) while ALTCHA verifies
    - **Error banner**: Red alert box with `CircleAlert` icon + error message
    - **Login mode (`mode === 'login'`)**:
      - Input `"Login or Email"` (`user.loginOrEmailLabel`), Input `"Password"` (`user.passwordLabel`)
      - Link button `"Forgot password?"` (`user.forgotPasswordLink`) -> switches to `'forgot'` mode
      - `AltchaWidget` (`components/common/AltchaWidget.tsx`: hidden honeypot + status/retry `"Retry"`)
      - Submit button: `LogIn` icon + `"Sign In"` (`user.signIn`)
      - Optional Google sign-in (`GoogleSignInSection`: `"or"` divider + `GoogleSignInButton`)
      - Optional dev-only demo fill buttons (`DemoAccountButtons`): `"Quick Demo Accounts"` heading, `"Admin (lemon)"` (`ShieldAlert` icon), `"User (user)"`
      - Mode switch link: `"Don't have an account? Register"` (`user.dontHaveAccount` + `user.register`)
    - **Register mode (`mode === 'register'`)**:
      - Inputs: `"Login"` (`user.loginLabel`), `"Username"` (`user.usernameLabel`), `"Email Address"` (`user.emailLabel`), `"Password"` (`user.passwordLabel`)
      - `LegalConsentField`: Checkbox `"I have read and accept the Terms of Service and the Rules, and I have read the Privacy Policy"` (`user.acceptLegalLabel`) with inline links opening `LegalDocModal` (`'terms'`, `'rules'`) or `/privacy-policy` in a new tab; validation error `"Please accept the Terms of Service and the Rules to create an account."` (`user.legalNotAccepted`)
      - Registration closed notice (when `!features.registrationOpen`): `"New accounts are paused at the moment. Please try again later."` (`user.registrationClosedNotice`)
      - Submit button: `UserPlus` icon + `"Create Account"` (`user.createAccount`)
      - Mode switch link: `"Already have an account? Sign In"` (`user.alreadyHaveAccount` + `user.signIn`)
    - **Forgot password mode (`mode === 'forgot'`)**:
      - Subtitle `"We will send a reset link to your email."` (`user.authResetSubtitle`), Input `"Email Address"` (`user.emailLabel`)
      - Submit button: `Mail` icon + `"Send Reset Link"` (`user.sendResetLink`)
      - Mode switch link: `"Back to Sign In"` (`user.backToSignIn`)
      - Sent state (`ForgotSentNotice`): Amber notice with `MailWarning` + `"If that email is registered, a password reset link is on its way."` (`user.forgotSentNotice`) + `"Close"` button
    - **Email verification notice (`EmailVerificationForm.tsx`)**:
      - Subtitle `"Enter the code we sent to {email}."` (`user.authVerifySubtitle`)
      - 6-digit `CodeInput` (`aria-label="Digit {n} of verification code"`)
      - Submit button `"Verify"` / `"Verifying..."` (`user.verifyEmailAction` / `user.verifying`)
      - Resend link button `"Resend code"` / `"Resend code in {seconds}s"` (`user.resendCode` / `user.resendCodeIn`)
    - **Two-factor challenge notice (`TwoFactorChallengeForm.tsx`)**:
      - Subtitle `"Enter the 6-digit code from your authenticator app."` (`twoFactor.challengeSubtitle`) or recovery subtitle `"Enter one of your recovery codes. Each one works only once."` (`twoFactor.challengeRecoverySubtitle`)
      - 6-digit `CodeInput` or text `Input` (`placeholder="XXXXX-XXXXX"`, `aria-label="Recovery code"`)
      - Submit button `"Verify"` (`twoFactor.challengeSubmit`)
      - Method toggle link `"Use a recovery code instead"` / `"Use the authenticator app instead"` (`twoFactor.useRecoveryCode` / `twoFactor.useAppCode`)
      - Back link `"Back to sign in"` (`twoFactor.backToSignIn`)
    - **Account blocked notice (`AccountBlockedNotice.tsx`)**:
      - `Ban` or `Clock` icon + banned/suspended message (`moderation.blocked.bannedBody` / `suspendedBody`), optional `"Reason: {reason}"`, appeal contact text, `"Close"` button
    - **Nested Legal Doc Preview Modal (`components/legal/LegalDocModal.tsx`)**:
      - Triggered by clicking `"Terms of Service"` or `"Rules"` in `LegalConsentField`; renders read-only `Modal` (`size="3xl" layer="top"`) with `LegalNotice` banners and `LegalSections`.

---

## /characters/[slug]

### Page & files
- **Route page**: `app/[locale]/characters/[slug]/page.tsx` (`generateMetadata`: `app.charactersPageTitle`)
- **Route loading**: `app/[locale]/characters/[slug]/loading.tsx` -> `CharacterDetailSkeleton`
- **Feature barrel**: `features/characters/index.ts`
- **Client wrapper**: `components/character-detail/CharacterDetailClient.tsx`
- **Role router**: `components/character-detail/CharacterSubpageView.tsx`
- **Role views**: `components/character-detail/SurvivorDetailView.tsx`, `components/character-detail/KillerDetailView.tsx`
- **Shared sub-components**:
  - `components/character-detail/components/CharacterTopBar.tsx`
  - `components/character-detail/components/CharacterHeroAvatar.tsx`
  - `components/character-detail/components/KillerCombatStats.tsx`
  - `components/character-detail/components/CharacterPerksSection.tsx`
  - `components/character-detail/components/KillerEquipmentSection.tsx`
  - `components/character-detail/components/SurvivorEquipmentSection.tsx`
  - `components/character-detail/components/OfferingsSection.tsx`
  - `components/character-detail/components/CategoryPicker.tsx`
  - `components/common/AccordionSection.tsx`
  - `components/DisabledBadge.tsx`
- **Helpers & types**: `components/character-detail/types.tsx`, `components/character-detail/survivorCategories.ts`
- **Skeletons**: `components/character-detail/CharactersSkeleton.tsx` (`CharacterDetailSkeleton`)
- **Modals**:
  - `components/character-detail/modals/LoreModal.tsx`
  - `components/character-detail/modals/Model3DModal.tsx`
  - `components/character-detail/modals/KillerPowerModal.tsx`
  - `components/character-detail/modals/TerrorRadiusModal.tsx`
  - `components/character-detail/modals/EquipmentDetailModal.tsx`
  - `components/PerkModal.tsx` (`components/PerkDescription.tsx`, `components/perks/PerkTypeBadges.tsx`)
  - `components/DisabledReasonModal.tsx`

### Layout elements
- **Top Navigation Bar (`CharacterTopBar.tsx`)**:
  - **Back Link**: `<Link href="/{locale}/characters?role={Survivor|Killer}">` with `ArrowLeft` icon + `"Back to Survivors"` (`characterDetail.backToSurvivors`) or `"Back to Killers"` (`characterDetail.backToKillers`)
  - **Prev / Next Same-Role Character Links** (hidden on `< sm`, visible `sm:flex`):
    - Previous Link: `ArrowLeft` icon + `{prevChar.name}` (text visible `md:inline`), `aria-label="Previous Character: {prevChar.name}"` (`characterDetail.prevCharacter`)
    - Next Link: `{nextChar.name}` + `ArrowRight` icon, `aria-label="Next Character: {nextChar.name}"` (`characterDetail.nextCharacter`)
- **Main Hero Showcase (`<section className="grid grid-cols-1 lg:grid-cols-12">`)**:
  - **Left Column — Avatar Card (`CharacterHeroAvatar.tsx`)**:
    - Clickable 3:4 portrait button (`aria-label="{character.name} - Click to Expand"` / `characterDetail.view3DModel`), opens `Model3DModal`
    - Portrait `Img` (or fallback `PersonIcon` + `{character.name}` if image fails)
    - Hover overlay: `ZoomIn` icon tile + `"Click to Expand"` (`characterDetail.view3DModel`)
    - Bottom solid strip: Chapter name (`character.chapter_name` or fallback `"Base Game"` / `characterDetail.baseGame`)
  - **Right Column — Identity, Stats & Teachable Perks**:
    - **Header**:
      - **Killer Power Tile Button** *(Killer only, when `killerPower` exists)*: Square `TileButton` with power icon `Img` (or `Zap` fallback icon), tooltip & `aria-label="{killerPower.name}"`, opens `KillerPowerModal`
      - **Character Heading (`<h1>`)**: `{character.name}`
      - **Real Name Subtitle** (when `real_name` differs from `name`): `"Real Name: {character.real_name}"` (`characterDetail.realName`)
      - **Metadata Chips (`WrapRow`)**:
        - **Read Lore Chip Button (`InfoChipButton`)**: `BookOpen` icon + `"Read Lore"` (`characterDetail.viewLore`) + `ArrowRight` icon -> opens `LoreModal`
        - **Release Date Chip (`InfoChip`)**: `Calendar` icon + localized release date (or release year / `"2016"`)
        - **DLC Type Chip (`InfoChip`)**: `"Licensed Franchise"` (`characterDetail.dlcLicensed`) or `"Original Content"` (`characterDetail.dlcOriginal`)
    - **Killer Combat Stats Bar (`KillerCombatStats.tsx`)** *(Killer only)*:
      - 3-column grid of `StatRow` surfaces:
        1. `Gauge` icon — `"MOVEMENT SPEED"` (`characterDetail.movementSpeed`): e.g. `"4.6 m/s (115%)"`
        2. `Radio` icon — `"TERROR RADIUS"` (`characterDetail.terrorRadius`): e.g. `"32 metres"`
        3. `ArrowUpDown` icon — `"HEIGHT"` (`characterDetail.height`): `"Tall"` / `"Average"` / `"Short"` (`characterDetail.heightTall` / `heightAverage` / `heightShort`)
    - **Teachable Perks Grid (`CharacterPerksSection.tsx`)** (rendered when `perks.length > 0`):
      - Grid of up to 3 teachable perk tiles (`TileButton`, `aria-label="{perk.name} - Click to inspect full mechanics"` / `characterDetail.clickToInspect`), opens `PerkModal`
      - Perk diamond icon (`Img`, greyed if `perk.is_disabled`) + perk name (`perk.name`)
      - Optional `DisabledBadge` (`TriangleAlert` button, top-right) when `perk.is_disabled` -> opens `DisabledReasonModal`
- **Equipment Section (Role-specific Accordion)**:
  - **Survivor Equipment (`SurvivorEquipmentSection.tsx`)**:
    - `AccordionSection` (`title="Survival Items"` / `characterDetail.equipmentTitleSurvivor`, persisted in `localStorage` under `lemondbd_drawer_survivor_items`, default open)
    - **Item Category Selector** (persisted under `lemondbd_survivor_item_category`, default `'medkit'`):
      - Desktop/Tablet (`sm:flex`, vertical pill `Tabs` on `md:flex-col`): `aria-label="Survivor item categories"` (`characterDetail.equipmentCategories`), tooltips with category descriptions
      - Mobile (`sm:hidden`): `CategoryPicker` dropdown button (`ChevronDown` icon) + portaled `Popover` menu with `MenuItem` rows and `Check` mark
      - **8 Categories**:
        1. `'medkit'`: `MedkitIcon` — `"Med-Kits"` (`categoryMedkit`) / `"Healing & Syringes"` (`categoryMedkitDesc`)
        2. `'toolbox'`: `Wrench` — `"Toolboxes"` (`categoryToolbox`) / `"Repairs & Sabotage"` (`categoryToolboxDesc`)
        3. `'flashlight'`: `Flashlight` — `"Flashlights"` (`categoryFlashlight`) / `"Blinding & Saves"` (`categoryFlashlightDesc`)
        4. `'key'`: `Key` — `"Keys"` (`categoryKey`) / `"Auras & Hatch"` (`categoryKeyDesc`)
        5. `'map'`: `MapIcon` — `"Maps"` (`categoryMapItem`) / `"Objectives & Totems"` (`categoryMapItemDesc`)
        6. `'fog_vial'`: `Cloud` — `"Fog Vials"` (`categoryFogVial`) / `"Mist & Concealment"` (`categoryFogVialDesc`)
        7. `'event'`: `SparkleIcon` — `"Event Items & Add-ons"` (`categoryEventItems`) / `"Limited Time & Anniversary Items"` (`categoryEventItemsDesc`)
        8. `'trial_exclusive'`: `ShieldAlert` — `"Trial Artifacts"` (`categoryTrialArtifacts`) / `"In-Trial Counter Items"` (`categoryTrialArtifactsDesc`)
    - **Left Sub-pane — Items**:
      - Heading (`hidden sm:block`): `"Items ({displayedItems.length})"` (`characterDetail.items`)
      - Rarity-styled item tiles (`TileButton`, tooltip `{item.name}`, `aria-label="Inspect item: {item.name}"` / `characterDetail.inspectItemPrefix`), opens `EquipmentDetailModal`
      - Empty state (`EmptyState` inline): `"No items found in this category matching your filter."` (`characterDetail.noItemsFound`)
    - **Right Sub-pane — Compatible Add-ons / Special Trial Rules**:
      - Normal categories (`selectedCategory !== 'trial_exclusive'`):
        - Heading: `"Compatible Add-ons ({displayedAddons.length})"` (`characterDetail.compatibleAddons`)
        - Rarity-styled add-on tiles (`TileButton`, tooltip `{displayItem.name}`, `aria-label="Inspect addon: {displayItem.name}"` / `characterDetail.inspectAddonPrefix`), opens `EquipmentDetailModal`
        - Empty text: `"No compatible add-ons found for this item type."` (`characterDetail.noCompatibleAddons`)
      - Trial Artifacts category (`selectedCategory === 'trial_exclusive'`):
        - Heading: `"Special Trial Rules"` (`characterDetail.specialTrialRules`)
        - Amber info card: `ShieldAlert` icon + `"In-Trial Killer Counters & Artifacts"` (`characterDetail.inTrialArtifactsHeading`) + 2 descriptive paragraphs (`characterDetail.trialArtifactsDesc1`, `trialArtifactsDesc2`)
  - **Killer Equipment (`KillerEquipmentSection.tsx`)**:
    - `AccordionSection` (`title="Power Add-ons"` / `characterDetail.equipmentTitleKiller`, persisted under `lemondbd_drawer_killer_addons`, default open)
    - Flex-wrap grid of killer power add-on tiles sorted by rarity (`Common` -> `Ultra Rare` -> `Event`), each a rarity-backed `TileButton` with tooltip `{displayItem.name}`, opens `EquipmentDetailModal`
    - Empty fallback: `"No specific equipment or add-ons cataloged for this character."` (`characterDetail.noEquipment`)
- **Offerings Section (`OfferingsSection.tsx`)** (rendered when `offerings.length > 0`):
  - `AccordionSection` (`title="Offerings"` / `characterDetail.offeringsTitle`, persisted under `lemondbd_drawer_offerings`, default open)
  - **Offering Category Selector** (persisted under `lemondbd_offering_category_{role}`, default `'mori'` for Killer, `'bloodpoint'` for Survivor):
    - Mobile (`sm:hidden`): `CategoryPicker` dropdown (`aria-label="Offering categories"` / `characterDetail.offeringCategories`)
    - Tablet/Desktop (`hidden sm:flex`): Horizontal centered pill `Tabs` with tooltips
    - **Killer Offering Categories (6)**:
      1. `'special'`: `SparkleIcon` — `"Special & Events"` (`categorySpecial`) / `"Anniversary & celebration offerings"` (`categorySpecialDesc`)
      2. `'mori'`: `MoriCharmIcon` — `"Memento Moris"` (`categoryMori`) / `"Execution rites"` (`categoryMoriDesc`)
      3. `'bloodpoint'`: `Coins` — `"Bloodpoints"` (`categoryBloodpoints`) / `"Score multipliers"` (`categoryBloodpointsDesc`)
      4. `'map'`: `MapIcon` — `"Realm Offerings"` (`categoryMap`) / `"Location selections"` (`categoryMapDesc`)
      5. `'shroud'`: `EyeOff` — `"Shrouds"` (`categoryShroud`) / `"Spawn positions"` (`categoryShroudDesc`)
      6. `'ward'`: `WardCharmIcon` — `"Wards"` (`categoryWard`) / `"Protection against loss"` (`categoryWardDescKiller`)
    - **Survivor Offering Categories (8)**:
      1. `'special'`: `SparkleIcon` — `"Special & Events"` (`categorySpecial`)
      2. `'bloodpoint'`: `Coins` — `"Bloodpoints"` (`categoryBloodpoints`)
      3. `'luck'`: `DiceIcon` — `"Luck Charms"` (`categoryLuck`) / `"Trial fortune"` (`categoryLuckDesc`)
      4. `'map'`: `MapIcon` — `"Realm Offerings"` (`categoryMap`)
      5. `'shroud'`: `EyeOff` — `"Shrouds"` (`categoryShroud`)
      6. `'blueprint'`: `DoorOpen` — `"Blueprints"` (`categoryBlueprint`) / `"Hatch & basement placement"` (`categoryBlueprintDesc`)
      7. `'chest'`: `Box` — `"Chests & Fog"` (`categoryChest`) / `"Chest spawns & fog density"` (`categoryChestDesc`)
      8. `'ward'`: `WardCharmIcon` — `"Wards"` (`categoryWard`) / `"Item & offering preservation"` (`categoryWardDescSurvivor`)
  - **Offering Tiles Grid**: Rarity-styled `TileButton` per offering (tooltip `{offering.name}`, `aria-label="Inspect offering: {offering.name}"` / `characterDetail.inspectOfferingPrefix`), opens `EquipmentDetailModal`
  - **Empty Category State (`EmptyState` inline)**: `"No offerings found in this category matching your active filter."` (`characterDetail.noOfferingsFound`)

### Modes / states
- **Role View Mode**: Automatically renders `SurvivorDetailView` when `character.category === 'Survivor'`, or `KillerDetailView` when `'Killer'`.
- **Loading State (`loading.tsx` / `CharacterDetailSkeleton`)**:
  - `<output aria-busy="true" aria-label="Loading Character Details...">` with `DbdSpinner` (`accent="blood"`, label `"Loading Character Details..."` / `characterDetail.loading`, sublabel `"Loading unique perks, power stats, and bio"`)
- **Not Found / Error State (`CharacterDetailClient.tsx`)**:
  - `EmptyState` (`variant="solid"`, `UserX` icon), title `"Character Not Found"` (`characterDetail.notFoundTitle`), subtitle `"The character you are looking for does not exist or could not be found."` (`characterDetail.notFoundDesc`)
  - Primary link button: `ChevronLeft` icon + `"Back to Characters"` (`characterDetail.backToCharacters`) -> `/{locale}/characters`
- **Collapsible Drawers**: Equipment and Offerings `AccordionSection` drawers toggle open/closed and persist in `localStorage`.

### Modals & drawers (file)
- **Character Lore Modal (`components/character-detail/modals/LoreModal.tsx`)**:
  - **Trigger**: Clicking `"Read Lore"` `InfoChipButton` in the hero header
  - **Shell**: `Modal` (`variant="dialog" size="2xl"`), title `"Character Lore"` (`characterDetail.loreTitle`), close button (`characterDetail.close`)
  - **Contents**: Epigraph quote `""{character.name} — Entered The Fog.""` (`characterDetail.enteredTheFog`) + full formatted lore text (`rawLoreText`)
- **Portrait Lightbox / 3D Model Modal (`components/character-detail/modals/Model3DModal.tsx`)**:
  - **Trigger**: Clicking `CharacterHeroAvatar` portrait card
  - **Shell**: `Modal` (`variant="lightbox" size="3xl" backdrop="blur"`), `aria-label="{character.name}"`
  - **Contents**: Framed full-resolution character portrait `Img` + top-right close `X` icon button (`aria-label="Close"`)
- **Killer Power Modal (`components/character-detail/modals/KillerPowerModal.tsx`)** *(Killer only)*:
  - **Trigger**: Clicking the Killer Power icon `TileButton` next to the killer's name
  - **Shell**: `Modal` (`variant="dialog" size="xl"`), title `{killerPower.name}`, close button (`characterDetail.close`)
  - **Contents**: Centered power icon tile (`Img` or `Zap` fallback), label with `BookOpen` icon + `"Special ability and combat mechanics unique to this killer."` (`characterDetail.killerPowerDesc`), and `RichText` game-formatted power description
- **Terror Radius Visualizer Modal (`components/character-detail/modals/TerrorRadiusModal.tsx`)** *(Killer only — wired in `KillerDetailView` via `isTerrorRadiusModalOpen`)*:
  - **Trigger**: `onOpenTerrorRadiusModal` callback passed to `KillerCombatStats`
  - **Shell**: `Modal` (`variant="dialog" size="2xl"`), title `"Terror Radius Visualizer"` (`characterDetail.terrorRadiusVisualizer`), close button (`characterDetail.close`)
  - **Contents**:
    - Concentric ring diagram: `"45m (Lullaby)"`, `"32m (Audible)"`, `"24m"`, `"16m"`, `"8m (Chase)"`, center killer dot, caption `"Current Base Terror Radius: {killerTerrorRadius}"` (`characterDetail.currentBaseTerrorRadius`)
    - `"Heartbeat Intensity Stages"` (`characterDetail.heartbeatStages`) 4-card grid:
      - `"Immediate Threat (0 - 8m)"` (`immediateThreat`) + `immediateChaseDesc`
      - `"Danger Zone (8 - 16m)"` (`dangerZone`) + `dangerZoneDesc`
      - `"Approaching (16 - 24m)"` (`approaching`) + `approachingDesc`
      - `"Audible Range (24 - 32m)"` (`audibleRange`) + `audibleRangeDesc`
    - `"Survivor Speed Comparison"` (`characterDetail.survivorComparison`): subtitle `"Survivor standard sprint speed is 4.0 m/s (100%)."` (`survivorComparisonDesc`), metrics row: `"Killer Base: {killerSpeed}"`, `"Survivor Sprint: 4.0 m/s (100%)"`, `"Straight Gap Close: ~{(killerTRMeters / 4.6).toFixed(1)}s straight line"`
- **Equipment / Offering Detail Modal (`components/character-detail/modals/EquipmentDetailModal.tsx`)**:
  - **Trigger**: Clicking any item, add-on, or offering tile in `SurvivorEquipmentSection`, `KillerEquipmentSection`, or `OfferingsSection`
  - **Shell**: `Modal` (`variant="dialog" size="2xl" closeButton="floating"`), close button (`characterDetail.close`)
  - **Header (`ModalIconHeader`)**:
    - Leading: Rarity-framed `ContentCropImg` of the item/add-on/offering
    - Title: `{item.name}`
    - Trailing (`TargetPicture`, shown when `item.associated_target` is set): For Survivor add-ons, circular badge with tinted item category glyph (`SURVIVOR_CATEGORY_GLYPH`) or category icon; for Killer add-ons, circular killer portrait `Img`
  - **Body**: `RichText` (`variant="game"`) rendering `item.description`
- **Perk Detail Modal (`components/PerkModal.tsx`)**:
  - **Trigger**: Clicking any teachable perk tile in `CharacterPerksSection`
  - **Shell**: `Modal` (`variant="dialog" size="2xl" closeButton="floating"`), `aria-label="{perk.name}"`, close button `aria-label="Close"` (`modal.close`)
  - **Header (`ModalIconHeader`)**:
    - Leading: `PerkIcon` diamond (`fallbackIcon`: `ImageOff`)
    - Title: `{perk.name}`
    - Subtitle (when `perk.alternate_name` exists): `"Alias: {perk.alternate_name}"` (`modal.alias`)
    - Trailing (for non-general perks with valid portrait): Circular owner character avatar `Img` (`alt="{perk.character}"`)
  - **Body**: `PerkDescription` (`RichText` game-formatted `perk.description`) + footer `PerkTypeBadges` (row of `InfoChip` pills for each known perk type from `perkTypes.labels`)
- **Disabled Reason Modal (`components/DisabledReasonModal.tsx`)**:
  - **Trigger**: Clicking `DisabledBadge` on a disabled teachable perk in `CharacterPerksSection`
  - **Contents**: Title `"Temporarily disabled"`, body `"{perk.name} was disabled temporarily. Reason: {disabled_reason}"`

---

## /perks

### Page & files
- **Route page**: `app/[locale]/perks/page.tsx` (`generateMetadata`: `app.perksVaultPageTitle` = `"LemonDBD - Dead by Daylight Perks Vault"`)
- **Route loading**: `app/[locale]/perks/loading.tsx` -> `RouteLoading` + `DbdSpinner`
- **Feature barrel**: `features/perks/index.ts`
- **Main client**: `components/perks/PerksClient.tsx`
- **Filter bar & menus**:
  - `components/PerkFilters.tsx`
  - `components/perks/PerkSearchBox.tsx`
  - `components/perks/PerkFilterMenu.tsx`
  - `components/perks/PerkFilterPanel.tsx`
  - `components/perks/PerkSortMenu.tsx`
  - `components/perks/roleOnlyMessage.ts`
- **Grid & cards**: `components/PerkCard.tsx`, `components/ui/PerkIcon.tsx`, `components/DisabledBadge.tsx`, `components/common/Pagination.tsx`
- **Skeletons**: `components/PerksSkeleton.tsx` (`PerksGridSkeleton`), `components/common/DbdSpinner.tsx`
- **Modals**: `components/PerkModal.tsx` (`components/PerkDescription.tsx`, `components/perks/PerkTypeBadges.tsx`), `components/DisabledReasonModal.tsx`

### Layout elements
- **Screen-reader Page Heading (`PerkFilters.tsx`)**: `<h1 className="sr-only">Perks</h1>` (`filters.perks`)
- **Filter Header Surface (`PerkFilters.tsx`)** (`<section aria-label="Filters">` / `filters.filtersTitle`):
  - **Role SegmentedControl** (`aria-label="Role"` / `filters.sortByRole`):
    - `'Survivor'`: `"Survivors"` (`filters.survivor`), active green (`bg-accent-green`)
    - `'Killer'`: `"Killers"` (`filters.killer`), active red (`bg-accent-red`)
  - **Perk Search Box (`PerkSearchBox.tsx`)**:
    - Pill `SearchInput` (`placeholder="Search perks, characters or types..."` / `perkTypes.searchPlaceholder`, clear `X` button `aria-label="Clear search"` / `filters.clearSearch`)
    - Supports plain text (perk name, alias, character name) and `#type` / `type:chase` syntax
    - *(Note: `PerkSearchBox` also supports a `typesInField={true}` mode with removable token chips + a `"Types"` `CustomDropdown`, used in the profile loadout picker; on `/perks` `typesInField={false}` is passed because `PerkFilterMenu` sits right beside it)*
    - **Search Autocomplete Popover (`Popover` anchored to search input)**:
      - Opens while typing when matches exist:
      - **Suggested Perk Types section**: Heading `"Perk types"` (`perkTypes.suggestionsHeading`) + `MenuItem` rows with localized type name (`perkTypes.labels[type]`) and `Badge` count; clicking or pressing `Enter` on a label match adds the type filter
      - **Suggested Perks section** (`MAX_PERK_SUGGESTIONS = 8`): `MenuItem` rows showing `{perk.name}`, optional `"Alias: {perk.alternate_name}"` (`filters.aliasLabel`), and right-aligned character name or `"General Perk"` (`modal.generalPerk`)
  - **Filters Dropdown Button (`PerkFilterMenu.tsx` + `PerkFilterPanel.tsx`)**:
    - `CustomDropdown` button with `FiltersIcon`, label `"Filters"` (`filters.filtersTitle`), and active filter count `Badge` (`tone="red"`, counts active perk types + 1 if scope/ownership is non-default)
    - **Popover Panel (`PerkFilterPanel.tsx`)**:
      - **Show / Scope Section (`ScopeSection`)**:
        - Label `"Show"` (`filters.scopeTitle`)
        - 3-way `SegmentedControl` (`aria-label="Filter by ownership"` / `filters.ownershipFilter`):
          - `'all'`: `"All"` (`filters.allPerks`)
          - `'owned'`: `"Owned"` (`filters.ownedOnly`) — **disabled when logged out (`!isLoggedIn`)**
          - `'general'`: `"General"` (`filters.generalShort`)
      - **Perk Types Checklist**:
        - Label `"Perk types"` (`perkTypes.typesHeading`)
        - 2-column grid of `Checkbox` items for every perk type available for the current role (`Generator`, `Healing`, `Chase`, `Stealth`, `Tracking`, `Exhaustion`, `Sacrifice`, `Obsession`, `Totem`, `Hooks`, `Downed`, `Items`, `Endgame`, `Entity` — `perkTypes.labels.*`), each showing live matching count (`typeCounts[type]`) and disabled if `count === 0 && !active`
      - **Reset Link Button**: `"Reset Filters"` (`filters.clear`), disabled when no filters are active
  - **Sort Dropdown Button (`PerkSortMenu.tsx`)**:
    - `CustomDropdown` with `ArrowDownUp` icon, `aria-label="Sort By"` (`filters.sortBy`):
      - `'asc'`: `"Name A-Z"` (`filters.sortByName` + `filters.orderAsc`)
      - `'desc'`: `"Name Z-A"` (`filters.sortByName` + `filters.orderDesc`)
- **Perks Vault Grid (`<section aria-label="Perks Grid">` / `filters.viewMode`)**:
  - Responsive 3/4/5-column grid (`grid-cols-3 phone-lg:grid-cols-4 sm:grid-cols-5`) with dynamically computed row height (`gridAutoRows`)
  - **Perk Card (`PerkCard.tsx`, `size="fill" showName`)**:
    - `TileButton` (`aria-label="{perk.name} - {perk.character || 'General Perk'}"`), opens `PerkModal`
    - `PerkIcon` diamond image (`drop-shadow-xl`, greyed if `perk.is_disabled` or unowned `perk.is_owned === false`)
    - **Owner Character Avatar Badge** (bottom-right circular `Img`, shown for teachable perks with a valid portrait)
    - **Unowned Lock Badge** (top-right circular badge with `LockIcon`, shown when `!perk.is_disabled && perk.is_owned === false`): tooltip `"Unowned perk"` (`modal.unownedPerk`)
    - **Disabled Badge (`DisabledBadge.tsx`)** (top-right `TriangleAlert` button, shown when `perk.is_disabled`): opens `DisabledReasonModal`
    - **Perk Name Label**: 2-line clamped centered title (`{perk.name}`)
- **Pagination Bar (`Pagination.tsx`, `variant="compact"`)**:
  - `<nav aria-label="Pagination Navigation">` (`pagination.navAriaLabel`):
  - **Left side**:
    - **Per-Page `CustomDropdown`** (`aria-label="Per page"` / `pagination.perPage`): Options `15`, `30`, `45`, `60` (`PAGE_SIZE_OPTIONS`, default `15`)
    - **Range Counter**: `"{startIdx}-{endIdx} / {totalResults}"` (`aria-label="Showing {startIdx}-{endIdx} of {totalResults} perks"`)
  - **Right side**:
    - **Previous Page Button**: `ChevronLeft` icon (`aria-label="Previous Page"` / `pagination.previous`), disabled on page 1
    - **Page Jump Input**: Numeric `Input` (`aria-label="Go to"` / `pagination.goTo`) + `"/ {totalPages}"`
    - **Next Page Button**: `ChevronRight` icon (`aria-label="Next Page"` / `pagination.next`), disabled on last page

### Modes / states
- **URL-Synced State**: Reads `?role=Survivor|Killer` and `?type=healing,chase` on load; changing perk type filters updates `?type=` via `history.replaceState`.
- **Auth-Gated Ownership State**:
  - Logged-out visitors: `"Owned"` option in `PerkFilterPanel` is disabled; all perks display as owned.
  - Logged-in users: `"Owned"` filter is enabled; unowned perks in `"All"` view render dimmed/grayscale (`opacity-40 grayscale`) with a top-right `LockIcon` badge and `"Unowned perk"` tooltip.
- **Loading States**:
  - Route-level (`app/[locale]/perks/loading.tsx`): `RouteLoading` + `DbdSpinner` (`label="Loading Perks Vault..."` / `app.loadingPerks`, `sublabel="Synchronizing survivor & killer trial perks"` / `app.loadingPerksSub`)
  - Client-level (`PerksGridSkeleton` in `PerksSkeleton.tsx`): `<output aria-busy="true" aria-label="Loading Perks Vault...">` + `DbdSpinner` (`label="Loading Perks Vault..."`)
- **Fetch Error State**:
  - Centered message `"Failed to load perks."` (`filters.loadError`) + primary `"Retry"` button (`modal.retry`)
- **Role-Only Type Conflict Empty State (`conflict` non-null when `totalResults === 0`)**:
  - `EmptyState` (`variant="solid"`, `SearchX` icon)
  - Title: `"{type} perks only exist for {role}."` (`perkTypes.roleOnlyTitle`, e.g. `"Exhaustion perks only exist for Survivors."`)
  - Action button: `"Switch to {role}"` (`perkTypes.switchRole`) -> switches role to the conflicting type's valid role
- **No Results Empty State (`perks.length === 0` without role conflict)**:
  - `EmptyState` (`variant="solid"`, `SearchX` icon)
  - Title: `"No Perks Found"` (`empty.title`), subtitle: `"Try adjusting your search terms or filter combinations."` (`empty.subtitle`)
  - Action button: `"Reset Filters"` (`app.resetFilters`) -> resets search, scope, ownership, sort order, and types

### Modals & drawers (file)
- **Perk Detail Modal (`components/PerkModal.tsx`)**:
  - **Trigger**: Clicking any `PerkCard` in the vault grid
  - **Contents**: `ModalIconHeader` (perk diamond `PerkIcon`, `{perk.name}`, optional `"Alias: {alternate_name}"`, owner character avatar `Img`), `PerkDescription` (`RichText`), and `PerkTypeBadges` (`InfoChip` pills).
- **Disabled Reason Modal (`components/DisabledReasonModal.tsx`)**:
  - **Trigger**: Clicking `DisabledBadge` (`TriangleAlert`) on a disabled `PerkCard`
  - **Contents**: Title `"Temporarily disabled"`, body `"{perk.name} was disabled temporarily. Reason: {disabled_reason}"`.
- **Filter Popover (`components/perks/PerkFilterMenu.tsx` + `PerkFilterPanel.tsx`) & Search Suggestions Popover (`components/perks/PerkSearchBox.tsx`) & Sort Popover (`components/perks/PerkSortMenu.tsx`)**:
  - Portaled `Popover` menus anchored to their respective header controls (detailed under Layout elements above).

---

## /maps

### Page & files
- **Route page**: `app/[locale]/maps/page.tsx` (`generateMetadata`: `maps.pageTitle` = `"LemonDBD - Tactical Map Command Explorer"`)
- **Route loading**: `app/[locale]/maps/loading.tsx` -> `RouteLoading` + `DbdSpinner`
- **Feature barrel**: `features/maps/index.ts`
- **Client wrapper**: `components/maps/MapsClient.tsx`
- **Main explorer**: `components/maps/MapExplorer.tsx`, `components/maps/MapCard.tsx`
- **Voice command engine**:
  - `components/maps/VoiceCommandBanner.tsx`
  - `components/maps/VoiceCommandBannerParts.tsx`
  - `components/maps/voice/VoiceBannerHeader.tsx`
  - `components/maps/voice/VoiceMicButton.tsx`
  - `components/maps/voice/VoiceStatusMessage.tsx`
  - `components/maps/voice/VoiceVariantPills.tsx`
  - `components/maps/voice/VoiceWaveform.tsx`
  - `components/maps/voice/voiceStatusConfig.ts`
  - `components/maps/voice/useVoiceSession.ts`
  - `components/maps/voice/useStartListening.ts`
- **Fullscreen & vector map tools**:
  - `components/maps/FullscreenMapEngine.tsx`
  - `components/maps/MapLegendFrame.tsx`
  - `components/maps/MapSymbolKey.tsx`
  - `components/maps/MapLandmarks.tsx`
  - `components/maps/MapLayoutView.tsx`
  - `components/maps/MapLegend.tsx`
  - `components/admin/VectorMapTestModal.tsx` (admin vector map test tool using `MapLayoutView` + `MapLegend`)
  - `components/common/ZoomControl.tsx`
- **Skeletons**: `components/maps/MapsSkeleton.tsx` (`MapsPageSkeleton`)
- **Modals**: `components/maps/FullscreenMapEngine.tsx`, `components/maps/VoiceEngineInfoModal.tsx`

### Layout elements
- **Command Deck Header Surface (`MapExplorer.tsx`)** (`<section aria-label="LemonDBD - Tactical Map Command Explorer">`):
  - **Search / Voice Mode Switcher (`SegmentedControl` in `MapsClient.tsx`)**:
    - `aria-label="Search mode"` (`maps.searchModeAria`), persisted in `localStorage` under `lemondbd_maps_search_mode`:
    - `'text'`: `Search` icon + `"Search"` (`maps.searchTextTab`), active red (`bg-accent-red`)
    - `'voice'`: `Mic` icon + `"Voice"` (`maps.searchVoiceTab`), active red (`bg-accent-red`)
  - **Text Search & Attribute Filters View (`searchMode === 'text'`)**:
    - **Map/Realm `SearchInput`**: `placeholder="Search..."` (`maps.searchPlaceholder`), `aria-label="Search map or realm"` (`maps.searchAria`), with clear `X` button when non-empty
    - **Attribute Filter Row (`data-testid="map-filters"`)**:
      1. **Layout Filter (`CustomDropdown`)**: `Compass` icon, `aria-label="Layout"` (`maps.layoutLabel`), persisted under `lemondbd_maps_filter_layout`:
         - `'__any__'`: `"Any layout"` (`maps.filterAnyLayout`, desktop) / `"Layout"` (`maps.layoutLabel`, mobile)
         - `'Outdoor'`: `"Outdoor"` (`maps.layoutOutdoor`)
         - `'Indoor'`: `"Indoor"` (`maps.layoutIndoor`)
         - `'Hybrid'`: `"Hybrid"` (`maps.layoutHybrid`)
      2. **Size Filter (`CustomDropdown`)**: `Maximize2` icon, `aria-label="Surface Area"` (`maps.surfaceArea`), persisted under `lemondbd_maps_filter_size`:
         - `'__any__'`: `"Any size"` (`maps.filterAnySize`, desktop) / `"Size"` (`maps.sizeLabel`, mobile)
         - `'small'`: `"Small"` (`maps.sizeSmall`) — sublabel `"under 9000 m²"` (`maps.sizeSmallHint`)
         - `'medium'`: `"Medium"` (`maps.sizeMedium`) — sublabel `"9000 to 9999 m²"` (`maps.sizeMediumHint`)
         - `'large'`: `"Large"` (`maps.sizeLarge`) — sublabel `"10000 m² and up"` (`maps.sizeLargeHint`)
      3. **Sort Order (`CustomDropdown`)**: `ArrowDownAZ` icon, `aria-label="Sort maps"` (`maps.sortAria`), persisted under `lemondbd_maps_sort_order`:
         - `'az'`: `"Name A to Z"` (`maps.sortAz`, desktop) / `"A-Z"` (`maps.sortAzShort`, mobile)
         - `'za'`: `"Name Z to A"` (`maps.sortZa`, desktop) / `"Z-A"` (`maps.sortZaShort`, mobile)
      4. **Clear Filters Button** (shown when layout or size filter is active): Ghost button with `X` icon + `"Clear filters"` (`maps.clearFilters`)
  - **Voice Command Banner View (`VoiceCommandBanner.tsx`, shown when `searchMode === 'voice'`)**:
    - `<section aria-label="Voice Map Navigation Engine">` (`maps.voiceEngineAria`):
    - **Engine Controls (`VoiceBannerHeader.tsx` / `VoiceEngineControls`)** (top-left on `md+`, below mic on `< md`):
      - **Engine Info Button**: `Globe` icon + `"Engine: Google"` (`voice.engineNativeBadge`, when `activeEngine === 'web-speech'`) or `Brain` icon + `"Engine: Local AI"` (`voice.engineClientBadge`, when `'client-model'`) + status dot (`bg-accent-amber animate-pulse` while downloading, else status color), `aria-label="View voice engine info"` (`voice.viewEngineInfo`) -> opens `VoiceEngineInfoModal`
      - **Sound Toggle Icon Button**: `Volume2` / `VolumeX` icon, `aria-label="Mute sound"` / `"Enable sound"` (`voice.muteSound` / `voice.enableSound`)
    - **Center Mic & Equalizer Row**:
      - Left `VoiceWaveform` (8 animated bars, `bg-accent-red` or `bg-accent-green` when matched, `hidden sm:flex`)
      - **Push-to-Talk / Toggle Mic Button (`VoiceMicButton.tsx`, `#voice-command-mic-btn`)**:
        - 64x64 rounded button (`aria-pressed={voiceStatus === 'listening'}`, `aria-label` set to current status badge)
        - Supports hold-to-talk, click-to-toggle, or holding keyboard key `V` (`maps.keyV`)
      - Right `VoiceWaveform` (8 animated bars, `bg-accent-amber` or `bg-accent-green` when matched, `hidden sm:flex`)
    - **Live Voice Status Line (`VoiceStatusMessage.tsx`)** (see Modes / states below)
    - **Disambiguation Variant Pills (`VoiceVariantPills.tsx`)** (shown when spoken query matches multiple map variations, e.g. Badham Preschool I–V):
      - Elevated `Surface` bar with label `"Variants:"` (`maps.variants`) + row of `Button` pills (`{variant}` + `ArrowRight` icon) to open the specific map
- **Realm Grid & Expandable Map Rows (`MapExplorer.tsx`)**:
  - Responsive realm grid (`grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6`):
  - **Realm Tile (`TileButton`)**:
    - Square banner tile (`aria-expanded={expanded}`, `aria-label="{Expand|Collapse} realm: {realm}"` / `maps.expandRealmAria` / `collapseRealmAria`)
    - Realm banner image (`Img`, or `ImageOff` fallback) + top gradient scrim
    - Top-centered `<h2>` realm name (`{realm}`)
    - Bottom-right `Badge`: Map count (`{realmMaps.length}`) or `"Removed from the game"` (`maps.retiredMap`) if every map in the realm is retired (retired realms render `grayscale brightness-75`)
  - **Expanded Realm Panel (`#realm-panel-{id}`)**:
    - Full-width row (`gridColumn: 1 / -1`) that animates open (`grid-template-rows: 1fr`) under the row of the expanded realm (or under every matching realm row while searching; persisted in `localStorage` under `lemondbd_maps_expanded_realm`)
    - Optional `<h3>` realm sub-heading when multiple realms in the same row are expanded simultaneously (during search)
    - **Map Card (`MapCard.tsx`, `data-testid="map-card-{map.id}"`)**:
      - `TileButton` opening `FullscreenMapEngine` for `map.id`
      - Thumbnail `Img` (3:2 in-game photo if `photo_local_path` exists, else 1:1 callout image; `ImageOff` fallback)
      - Map name (`{map.name}`)
      - Retired subtitle (shown when `map.is_retired` or variation numeral > `I`): `"Removed from the game"` (`maps.retiredMap`) + card rendered `grayscale brightness-75`

### Modes / states
- **Search Mode vs. Voice Mode (`searchMode`)**:
  - Overlaid in the same CSS grid cell (`[grid-area:1/1]`) so switching between `'text'` and `'voice'` never shifts the realm grid height.
- **Voice Recognition States (`voiceStatus` in `voiceStatusConfig.ts` & `VoiceStatusMessage.tsx`)**:
  - `'idle'`: `Mic` icon, badge `"IDLE • READY"` (`voice.idleReady`); desktop hint `"Hold V to talk, or tap the mic and say a map name"` (`voice.holdVToTalkHint` with `<kbd>V</kbd>` chip), mobile hint `"Tap the mic and say a map name"` (`voice.tapToTalkMobileHint`)
  - `'listening'`: `Volume2` bouncing icon, red button, badge `"LISTENING • SPEAK NOW"` (`voice.listeningSpeakNow`); pulsing red dot + live transcript `"“{liveTranscript}”"` (or `"Listening..."` / `"Say a map name..."` — `voice.listeningVoice` / `speakMapPrompt`) + subtitle `"Processing locally with the on-device AI model"` (`voice.localModelListeningDesc`) or `"Streaming to your browser's speech recognition service"` (`voice.webSpeechListeningDesc`)
  - `'processing'`: `RefreshCw` icon, amber button, badge `"PROCESSING AUDIO..."` (`voice.processingAudio`); amber `Spinner` + `"Transcribing: “{liveTranscript}”"` / `"Transcribing your voice..."` (`voice.transcribingPrefix` / `transcribingVoice`) + subtitle `"Running local WASM speech inference"` (`voice.localWasmInference`)
  - `'matched'`: `CheckCircle2` icon, green button, badge `"MATCHED • EXECUTING"` (`voice.matchedExecuting`); green `CheckCircle2` + `"Opening map: {matchedMapName}"` (`voice.matchedPrefix`) or `"Action: {action}"` (`voice.actionPrefix`) + `"Heard: “{liveTranscript}” ({percent}%)"` (`maps.heardLabel` + `voice.matchPercent`)
  - `'nomatch'`: `MicOff` icon, amber button, badge `"NO MATCH • TRY AGAIN"` (`voice.noMatchTryAgain`); amber `CircleAlert` + `"Heard: “{liveTranscript}” (no match found)"` (`voice.noDbdMatch`) or `"No speech detected."` (`voice.noSpeechDetected`) + subtitle `"Try saying a map name, like "The Game" or "Ormond Lake Mine"."` (`voice.trySayingPrompt`)
  - `'error'`: `CircleAlert` icon, red button, badge `"MIC ERROR • CHECK PERMISSIONS"` (`voice.micErrorCheckPermission`); red `CircleAlert` + error message (`voice.micBlocked` / `micAccessError` / `failedToInitialize`) + subtitle `"Check your browser's microphone permissions and try again."` (`voice.checkPermissionsHint`)
- **Loading States**:
  - Route-level (`app/[locale]/maps/loading.tsx`): `RouteLoading` + `DbdSpinner` (`label="Loading Tactical Maps..."` / `maps.loadingTacticalMaps`, `sublabel="Mapping tile variants, loops, and spawn coordinates"` / `maps.loadingTacticalMapsSub`)
  - Suspense fallback (`MapsPageSkeleton`): `DbdSpinner` (`label="Initializing Tactical Map Command..."` / `maps.initializingTacticalMap`)
  - Data fetch loading (`MapExplorer.tsx`): Centered text `"Loading Tactical Maps..."` (`maps.loadingTacticalMaps`)
- **Empty State (`displayedGroups.length === 0`)**:
  - Inline `EmptyState`: `"No Maps Found"` (`maps.noMapsFound`)

### Modals & drawers (file)
- **Fullscreen 2D Map Engine Modal (`components/maps/FullscreenMapEngine.tsx`, `MapLegendFrame.tsx`, `MapSymbolKey.tsx`, `MapLandmarks.tsx`, `components/common/ZoomControl.tsx`)**:
  - **Trigger**: Clicking any `MapCard`, matching a map via voice command, or opening `/maps?mapId=...` / `/maps?mapName=...`
  - **Shell**: Fullscreen `Modal` (`variant="fullscreen"`, `testId="fullscreen-map-engine"`, `aria-label="2D Fullscreen Map Engine"` / `maps.fullscreenEngineAria`, offset by `--sidebar-width` on desktop so sidebar remains accessible)
  - **Header Bar**:
    - Centered `<h2>` map title (`{activeMap.name}`)
    - Top-right close `X` icon button (`aria-label="Close"` / `modal.close`)
  - **Draggable / Collapsible Map Legend (`MapDetailsLegend` -> `MapLegendFrame.tsx` + `MapSymbolKey.tsx` + `LandmarkSquare` in `MapLandmarks.tsx`)**:
    - On mobile (`< sm`): Static strip below the header (always expanded, symbol key hidden)
    - On desktop (`sm+`): Floating `Surface` card (`data-testid="map-legend-frame"`, position & collapsed state persisted in `localStorage` under `lemondbd_map_legend_v1`):
      - **Drag Grip Button (`data-testid="map-legend-grip"`)**: 6-dot grip icon, `aria-label="Move legend (arrow keys; Home resets)"` (`maps.legendMoveAria`); supports pointer drag, arrow keys (`Shift` for fast step), `Home` or double-click to reset position
      - **Legend Title (`<h3>`)**: `"Map Legend"` (`maps.legendTitle`)
      - **Collapse Toggle Button (`data-testid="map-legend-toggle"`)**: `ChevronIcon`, `aria-label="Toggle Map Legend"` (`maps.legendToggleAria`), `aria-expanded={!state.collapsed}`
    - **Fact Rows (`<dl>`)**:
      - **Surface Area** (when `size_sq_tiles != null`): `Maximize2` icon + `"Surface Area"` (`maps.surfaceArea`) -> `"{size_sq_tiles} sqT"` (`maps.sqTilesUnit`) + `"({size_sq_meters} m²)"` (`maps.sqMetersSuffix`)
      - **Layout** (when `layout_type` is set): `Compass` icon + `"Layout"` (`maps.layoutLabel`) -> colored `"Outdoor"` / `"Indoor"` / `"Hybrid"`
      - **Shack** (when `map.is_shack` is true): Amber dashed `LandmarkSquare` (`Home` icon) + `"Shack"` (`maps.shackYes`) -> green `CheckIcon`
      - **Main Building** (when `map.is_main_building` is true): Red dashed `LandmarkSquare` (`Building2` icon) + `"Main Building"` (`maps.mainBuildingYes`) -> green `CheckIcon`
    - **Map Symbol Key (`MapSymbolKey.tsx`, `data-testid="map-symbol-key"`, visible `sm+`)**:
      - `[12]` chip -> `"12-Clock Orientation"` (`maps.legendClockTitle`)
      - Blocked area box (when map layout has `blocked` rings) -> `"Off-limits area"` (`maps.legendBlocked`)
      - Dashed square (when `map.layout` exists) -> `"16 m game tile"` (`maps.legendGameTile`)
      - `"Landmarks & Features"` (`maps.legendFeatures`) section (for each feature landmark code present on the map):
        - `C|H`: `"Cow Tree / Harvester"` (`landmarkCowTreeHarvester`)
        - `H/FB`: `"House / Fall Building"` (`landmarkHouseFallBuilding`)
        - `WT`: `"Water Tower"` (`landmarkWaterTower`)
        - `CT`: `"Courtyard"` (`landmarkCourtyard`)
        - `GARDEN`: `"Garden / Gazebo"` (`landmarkGarden`)
        - `STATUE`: `"Town Statue"` (`landmarkStatue`)
        - `H`: `"High Ground / Hill"` (`landmarkHill`)
        - `T`: `"Mine Tower"` (`landmarkTower`)
        - `P`: `"Pagoda / Platform"` (`landmarkPagoda`)
        - `UFO`: `"Crashed Shuttle"` (`landmarkShuttle`)
        - `MD`: `"Main Door (exit)"` (`landmarkMainDoor`)
        - `BD`: `"Back Door (exit)"` (`landmarkBackDoor`)
  - **Interactive Pan / Zoom Canvas**:
    - High-resolution map callout `Img` (`data-pan-target`), supports pointer drag-to-pan, mouse wheel zoom, two-finger touch pinch-to-zoom, and clicking the backdrop outside the image to close
    - Fallback when image is missing/fails: `ImageOff` icon + `"No Maps Found"` (`maps.noMapsFound`)
  - **Bottom-Right Zoom Toolbar (`ZoomControl.tsx`)**:
    - `role="toolbar" aria-label="Engine Zoom and Reset Controls"` (`maps.engineControlsAria`), steps `[25, 50, 75, 100, 150, 200, 300]`:
    - **Zoom Out Button**: `MinusIcon`, `aria-label="Zoom In"` / `"Zoom Out"` (`maps.zoomOut`)
    - **Reset / Percent Readout Button**: Shows `"Fit"` or `"{Math.round(current)}%"`, `aria-label="Real size (100%)"` (`maps.zoomReset`) -> resets to 100% and centers pan
    - **Zoom In Button**: `PlusIcon`, `aria-label="Zoom In"` (`maps.zoomIn`)
    - **Fit Button**: `FitIcon` + `"Fit"` (`maps.zoomFit`), `aria-label="Fit the whole map on screen"` (`maps.zoomFitHint`), `aria-pressed={zoom === 'fit'}`
- **Voice Engine Info Modal (`components/maps/VoiceEngineInfoModal.tsx`)**:
  - **Trigger**: Clicking the engine badge button (`"Engine: Google"` / `"Engine: Local AI"`) in `VoiceCommandBanner`
  - **Shell**: `Modal` (`variant="dialog" size="xl" layer="system"`, `testId="voice-engine-info-modal"`), title `"Voice recognition"` (`voice.howItWorksTitle`), close button (`modal.close`)
  - **Contents**:
    - **Recognition Engine Section (`voice.engine`)**:
      - 2 `SelectableCard` options:
        1. `'web-speech'`: `Globe` icon + `"Web Speech Framework"` (`voice.engineNative`), `CheckCircle2` when selected, body `"Your browser turns speech into text. Nothing to download."` (`voice.howItWorksNative`), footer `"Chrome • Edge • Safari"` (`maps.chromeEdgeSafari`); disabled when `!hasNativeWebSpeech`
        2. `'client-model'`: `Cpu` icon + `"Client-Side Speech Model"` (`voice.engineClient`), `CheckCircle2` when selected, body `"Works in every browser. A small model is downloaded once and runs on your device, so your audio never leaves it."` (`voice.howItWorksClient`)
    - **Local Model Accuracy Section (`voice.accuracyTitle` = `"Local model accuracy"`)**:
      - `Gauge` icon heading + 2 `SelectableCard` options:
        1. `'fast'`: `"Fast"` (`voice.accuracyFast`) — `"Smaller and quicker. Fine for map names."` (`voice.accuracyFastDesc`) + `"~{size} MB download"` (`voice.modelSize`)
        2. `'accurate'`: `"Accurate"` (`voice.accuracyAccurate`) — `"Larger, better with accents. Slower on older devices."` (`voice.accuracyAccurateDesc`) + `"~{size} MB download"`
    - **Local Model Download Section (`voice.modelDownloadTitle` = `"Local model"`)**:
      - `DownloadCloud` icon heading
      - Status text: `"Downloading Model: {progress}%"` (`voice.downloadProgress`), `"Model Ready in Memory"` (`voice.statusReady`), or `"Saved in your browser after the first download."` (`voice.modelCached`) + right-aligned `"{progress}%"`
      - Progress bar (`bg-accent-red`)
      - `"Preload Model"` button (`maps.preloadModel` with `RefreshCw` icon, shown when `status !== 'ready' && status !== 'downloading'`)
- **Vector Map Engine Test Modal & Tools (`components/admin/VectorMapTestModal.tsx`, `components/maps/MapLayoutView.tsx`, `components/maps/MapLegend.tsx`, `components/maps/MapLandmarks.tsx`)**:
  - **Trigger**: Admin Tools section (`"Vector Map Engine"` -> `"Open"`), or anywhere `VectorMapTestModal` / `MapLayoutView` is rendered
  - **Shell**: `Modal` (`variant="dialog" size="5xl"`, `testId="vector-map-test-modal"`), title `"Vector Map Engine"` (`admin.vectorMapTest`)
  - **Header Controls**:
    - Map `Select` dropdown: Label `"Select a map"` (`admin.vectorMapSelect`), options `"{map.name} ({map.realm})"`
    - Surface area pill: `Compass` icon + `"{size_sq_tiles} sqT ({size_sq_meters} m²)"`
    - **Floor Switcher (`SegmentedControl`)** (when `layout.floors.length > 1`, `aria-label="Floor"` / `maps.floorAria`): `"Upper floor"` (`maps.floorUpper`), `"Lower floor"` (`maps.floorLower`), or `"Floor {n}"`
    - **Legend Toggle Icon Button**: `Info` icon (`aria-label="Toggle Map Legend"` / `maps.legendToggleAria`, tooltip `"Map Legend"` / `maps.legendTitle`)
  - **SVG Vector Map Canvas (`MapLayoutView.tsx`)**:
    - Draws metre-scaled floor outline (`stroke-accent-red`), holes, blocked zones (`fill-text-muted/40`), cell grid (`layout.cell_m`), 16m dashed game tiles (`GAME_TILE_M`), named room polygons & labels, `MapLandmarks` footprints/chips (`Building2` main building, `Home` shack, feature callout codes with `<title>` tooltips), 1–12 clock callout numbers + `"MID"` (`maps.calloutMid`), and bottom `"32 m"` scale bar (`maps.metresValue`)
    - Approximate footnotes: `"Approximate scale: no measured outline is published for this map."` (`maps.layoutApprox`) / `"Landmark positions are approximate."` (`maps.landmarksApprox`)
  - **Vector Map Legend Overlay (`MapLegend.tsx`, `data-legend-panel`)**:
    - Floating top-right card (`aria-label="Map Legend"`), close `X` button (`modal.close`), core structure rows (`Building2` `"Main Building"`, `Home` `"Shack"`), clock callout explanation (`Compass` `"12-Clock Orientation"` + `maps.legendClockDesc`), and active floor `"Landmarks & Features"` code list.

---

## /randomizer

### Page & files
- **Route page**: `app/[locale]/randomizer/page.tsx` (`generateMetadata`: `app.perkRandomizerPageTitle` = `"LemonDBD - Perk Randomizer"`)
- **Route loading**: `app/[locale]/randomizer/loading.tsx` -> `RandomizerPageSkeleton`
- **Client wrapper**: `components/generator/RandomizerClient.tsx`
- **Main generator controller**: `components/generator/GeneratorPage.tsx`
- **Header & shared stage chrome**:
  - `components/generator/ModeSwitcher.tsx`
  - `components/generator/Toolbar.tsx`
  - `components/generator/shared/RoleToggle.tsx`
  - `components/generator/shared/IconToggleButton.tsx`
  - `components/generator/shared/StageFrame.tsx`
  - `components/generator/shared/StageIdle.tsx`
  - `components/generator/shared/PerkSlot.tsx`
  - `components/PerkCard.tsx`
- **Mode stages**:
  - **Instant Roll**: `components/generator/modes/InstantStage.tsx`
  - **Wheel of Fortune**: `components/generator/modes/WheelStage.tsx`, `components/generator/modes/wheel/useWheelStage.ts`, `components/generator/modes/wheel/wheelDrawing.ts`, `components/generator/modes/wheel/useEmberDrift.ts`
  - **Slot Machine**: `components/generator/modes/SlotMachineStage.tsx`, `components/generator/modes/slot-machine/SlotMachineIdle.tsx`, `components/generator/modes/slot-machine/SlotReelColumnDesktop.tsx`, `components/generator/modes/slot-machine/SlotReelRowMobile.tsx`, `components/generator/modes/slot-machine/SlotMachineComplete.tsx`, `components/generator/modes/slot-machine/useSlotMachine.ts`, `components/generator/modes/slot-machine/useReelSizing.ts`, `components/generator/modes/slot-machine/slotMachineStrip.ts`
  - **Tarot Deck**: `components/generator/modes/TarotDeckStage.tsx`, `components/generator/lib/tarotCards.ts`
  - **Loot Crate**: `components/generator/modes/LootCrateStage.tsx`
- **Generator logic & constants**: `components/generator/lib/perkPicker.ts`, `components/generator/lib/generatorStorage.ts`, `components/generator/lib/blindnessCurse.ts`, `components/generator/lib/chaosMutatorLocalization.ts`, `components/generator/lib/slotMachineRules.ts`, `constants/chaosMutators.ts`
- **Skeletons**: `components/generator/RandomizerSkeleton.tsx` (`RandomizerPageSkeleton`)
- **Modals**: `components/ChaosWheelModal.tsx`, `components/PerkModal.tsx`, `components/common/ConfirmModal.tsx`, `components/DisabledReasonModal.tsx`, `components/ScraperConfigModal.tsx` (documented in full below per scope)

### Layout elements
- **Stage Frame (`StageFrame.tsx`)**:
  - Cinematic vignette container (`dbd-cinematic-vignette`) with top header bar (`topLeft` mode switcher + `topRight` role toggle and icon toolbar) and center stage area.
- **Top-Left — Draw Mode Switcher (`ModeSwitcher.tsx`)**:
  - `aria-label="Select Draw Mode"` (`generator.modeSwitcherAriaLabel`), persisted in `localStorage`:
  - Below `xl` (`xl:hidden`): `CustomDropdown` button showing active mode label
  - `xl` and above (`hidden xl:block`): Bare horizontal `SegmentedControl` with tooltips:
    1. `'instant'`: `"Instant Roll"` (`generator.modeInstant`) — tooltip `"Draw all four perks at once, no ceremony, just the result."` (`generator.modeInstantTooltip`)
    2. `'wheel'`: `"Wheel of Fortune"` (`generator.modeWheel`) — tooltip `"Spin the page wheel, then the perk wheel, once per slot until your loadout is full."` (`generator.modeWheelTooltip`)
    3. `'slot'`: `"Slot Machine"` (`generator.modeSlot`) — tooltip `"Pull the lever and lock in reels over up to 3 cycles. A reel or two may jam broken, reroll the whole machine to clear it."` (`generator.modeSlotTooltip`)
    4. `'tarot'`: `"Tarot Deck"` (`generator.modeTarot`) — tooltip `"Shuffle the deck and flip cards to reveal your loadout, one omen at a time."` (`generator.modeTarotTooltip`)
    5. `'crate'`: `"Loot Crate"` (`generator.modeCrate`) — tooltip `"Crack open a Trial Offering for a random loadout in one go."` (`generator.modeCrateTooltip`)
- **Top-Right — Role Toggle & Action Toolbar**:
  - **Role Toggle (`RoleToggle.tsx`)**: `SegmentedControl` (`aria-label="Select Role"` / `generator.selectRole`):
    - `'Survivor'`: `"Survivor"` (`generator.survivor`), active green (`bg-accent-green`)
    - `'Killer'`: `"Killer"` (`generator.killer`), active red (`bg-accent-red`)
  - **Icon Toolbar (`Toolbar.tsx` -> 6 `IconToggleButton` chips with `Tooltip`s)**:
    1. **Page/Slot Legend Chip (informational)**: Text icon `"P/S"` (`generator.coordinateLegendIcon`), `aria-label="What P/S Means"` (`generator.coordinateLegendTooltip`), tooltip title `"Page / Slot"` (`generator.coordinateLegendTooltipTitle`), description `"Each perk is tagged with where to find it in your in-game inventory. The first number is the Page, the second is the Slot on that page: [P3/S7] means Page 3, Slot 7."` (`generator.coordinateLegendTooltipDesc`)
    2. **No-Repeat Perks Toggle**: `Repeat` icon + active count badge `"{playableCount}/{ownedCount}"` (shown when `noRepeatPerks` is on), `aria-label="Toggle No-Repeat Perks"` (`generator.noRepeatTooltip`), tooltip title `"No-Repeat Perks"` (`generator.noRepeatTooltipTitle`), description `"On: perks you already drew stay out of the pool until you reset them."` / `"Off: every draw pulls from the full pool, repeats and all."` (`noRepeatTooltipDescOn` / `noRepeatTooltipDescOff`)
    3. **Blind Mode Toggle**: `EyeOff` icon, `aria-label="Hide Perk Icons (Blind Mode)"` (`generator.blindModeTooltip`), tooltip title `"Blind Mode"` (`generator.blindModeTooltipTitle`), description `"Hides every perk icon behind a '?'. Check the page and slot number in-game to see what you drew."` (`generator.blindModeTooltipDesc`)
    4. **Chaos Mutator Button**: Shows `CurseIcon` when inactive or `{activeMutator.icon}` emoji when active, `aria-label` & tooltip title set to active mutator name or `"Chaos Mutator"` (`generator.chaosMutatorTooltip`), description set to active mutator description or `"Spin for a random Trial curse or buff to twist this loadout."` (`generator.chaosMutatorTooltipDesc`) -> opens `ChaosWheelModal`
    5. **Sound Effects Toggle**: `Volume2` / `VolumeX` icon, `aria-label="Sound On"` / `"Sound Muted"` (`generator.audioOnLabel` / `audioOffLabel`), tooltip title `"Sound Effects"` (`generator.soundTooltipTitle`), description `"On: reel ticks, thuds, and fanfare will play."` / `"Muted: every effect is silenced."` (`soundTooltipDescOn` / `soundTooltipDescOff`) — synced with global `preferences.sounds`
    6. **Reset Everything Button**: `RotateCcw` icon, `aria-label="Reset wheels, loadout slots, and memory"` (`generator.resetAllTooltip`), tooltip title `"Reset Everything"` (`generator.resetAllTooltipTitle`), description `"Clears your wheels, loadout slots, and drawn-perk memory. Cannot be undone."` (`generator.resetAllTooltipDesc`)
- **Shared Perk Slot (`PerkSlot.tsx` + `PerkCard.tsx`)**:
  - Renders in 4 states across all generator modes:
    1. **Empty Slot (`!perk`)**: Dashed card with `ImageOff` icon + `"Empty Slot"` (`generator.emptySlot`)
    2. **Curse of Blindness Obscured (`isObscured = true`, when `activeMutator.id === 'blindness'` and slot not yet clicked)**: Dashed button with pulsing `EyeOff` icon + `"Click to Reveal"` (`generator.clickToReveal`); clicking reveals the slot (`onRevealSlot(idx)`)
    3. **Blind Mode (`isBlind = true`)**: Shows top-left amber coordinate tag `"[P{page}/S{slot}]"` (`generator.coordOpenPage` / `coordSlot` / `coordClose`), `HelpCircle` icon, and `"Hidden, check in-game"` (`generator.hiddenPerkLabel`); clicking still opens `PerkModal`
    4. **Normal Filled Slot**: Renders `PerkCard` with top-left coordinate `Badge` `"[P{page}/S{slot}]"`, `PerkIcon` diamond, owner character avatar badge, perk name, and click handler opening `PerkModal` (plus `DisabledBadge` if `perk.is_disabled`).

### Modes / states
- **Mode 1: Instant Roll (`genMode === 'instant'`, `InstantStage.tsx`)**:
  - Prompt: `"Rolls all four perks at once, instantly."` (`generator.instantRollPrompt`)
  - Primary CTA (`DbdButton`): `"Roll 4-Perk Loadout"` (`generator.rollCompleteLoadout`)
  - 4-Slot Loadout Grid (`2x2` on mobile, `1x4` on `lg+`): Always mounted (`size="large"`); starts with 4 `"Empty Slot"` boxes (or restored `lastRolls.instant`), animates in 4 drawn `PerkSlot`s on click.
- **Mode 2: Wheel of Fortune (`genMode === 'wheel'`, `WheelStage.tsx`)**:
  - Prompt: `"Spin the Page Wheel, then the Perk Wheel, one slot at a time until all four are filled."` (`generator.spinOrRollPrompt`)
  - Layout: Left pair of flank `PerkSlot`s (`Slot #1`, `Slot #2`, `size="wheelFlank"`), center Wheel canvas + CTA button, right pair of flank `PerkSlot`s (`Slot #3`, `Slot #4`); active target slot is highlighted with `ring-2 ring-accent-red/60`.
  - **Interactive Wheel Canvas (`800x800` + ember particle overlay canvas `particlesCanvasRef`)**:
    - **Page Wheel Phase (`wheelPhase === 'page'`, skipped when `effectiveTotalPages === 1`)**: Thorned blood rim, alternating crimson slices with circular `"P1"`, `"P2"`, ... badges, center hub `"PAGE WHEEL"`, top red pointer triangle.
    - **Perk Wheel Phase (`wheelPhase === 'perk'`)**: Morphs after landing on a page; slices colored green (Survivor), rose/red (Killer), or dark void (if perk is penalized by `activeMutator`), each slice displaying the perk's diamond icon (or letter fallback), center hub `"PAGE {pageNumber}"`.
  - **Spin CTA (`DbdButton`)**:
    - Idle: `"Spin for Perk Slot #{activeSlotIdx + 1}"` (`generator.spinWheelButton`)
    - Spinning: `"Spinning Wheel..."` (`generator.spinningWheel`), disabled
  - **Live Screen-Reader Status (`<p aria-live="polite" className="sr-only">`)**: `"Spinning Page Wheel for Slot #{slot}..."` (`generator.spinningPageWheel`) -> `"Landed on Page {page}! Swapping to Perk Wheel..."` (`generator.landedPage`) -> `"Spinning Perk Wheel (Page {page})..."` (`generator.spinningPerkWheel`) -> `"{perk.name} [P{page}/S{slot}]"`.
- **Mode 3: Slot Machine (`genMode === 'slot'`, `SlotMachineStage.tsx`)**:
  - **Sub-state A — Idle (`phase === 'idle'`, `SlotMachineIdle.tsx`)**:
    - Prompt: `"Pull the lever and lock in perks over up to 3 cycles. Eight reels spin at once, but the machine's cursed, so a reel or two may jam broken."` (`generator.slotMachinePrompt` + `slotCursedFlavor`)
    - Clickable Lever Prop (`TileButton` with `/images/randomizer/lever.webp`)
    - CTA (`DbdButton`): `"Pull the Lever"` (`generator.slotMachineSpinButton`)
  - **Sub-state B — Spinning & Awaiting Selection (`phase === 'spinning' | 'awaiting'`)**:
    - **Cycle & Lock Status Header**: `"Cycle {cycle}/3 • {count}/4 Locked"` (`generator.slotCycleLabel` + `slotLockedCount`)
    - **8 Slot Reels** (1–2 reels randomly jam broken with red `Ban` icon and `"Jammed"` / `generator.slotJammedTitle` + `slotJammedDesc` tooltip):
      - **Desktop (`>= md`, `SlotReelColumnDesktop.tsx`)**: 8 vertical reel columns spinning upwards; each cell shows perk icon + `"[P/S]"` coordinate badge; top-right amber `LockIcon` badge when locked; bottom label `"#{id + 1}"`, `"Locked"` (`generator.slotLockedLabel`), or `"Broken"` (`generator.slotBrokenLabel`). Clicking an unlocked, non-broken reel in `'awaiting'` phase stages/unstages it (`border-accent-green`).
      - **Mobile (`< md`, `SlotReelRowMobile.tsx`)**: 8 stacked horizontal reel rows spinning left-to-right with center amber payline box; left status column (`"#1"` / `"Locked"` + `LockIcon` / `"Broken"` + `Ban`), center horizontal strip, right action `TileButton` (`Plus` icon when unstaged, green `Check` icon when staged, amber `LockIcon` badge when locked).
    - **Selection Hint & Confirm Footer** (visible in `'awaiting'` phase; rules from `slotMachineRules.ts`: Cycle 1 requires 1–2, Cycle 2 requires up to remaining so at least 2 total are locked, Cycle 3 requires exact remaining to reach 4):
      - Hint text: `"Select {min}-{max} to continue"` (`generator.slotSelectRange`), `"Select up to {max} (optional)"` (`slotSelectUpTo`), or `"Select exactly {count} to continue"` (`slotSelectExact`)
      - CTA (`DbdButton`): `"Confirm Selection"` (`generator.slotConfirmSelection`), disabled until staged count satisfies `[min, max]`
  - **Sub-state C — Complete (`phase === 'complete'`, `SlotMachineComplete.tsx`)**:
    - Heading: `"Your loadout is locked in."` (`generator.scatterComplete`)
    - 4-card result grid (`PerkSlot` `size="large"`)
    - CTA (`DbdButton`): `"Pull the Lever"` (`generator.slotMachineSpinButton`) -> starts a fresh pull immediately
- **Mode 4: Tarot Deck (`genMode === 'tarot'`, `TarotDeckStage.tsx`)**:
  - Prompt: `"Tap a card to reveal its perk. Flip all four to lock in your loadout."` (`generator.tarotTapToFlip`)
  - **Sub-state A — Unshuffled (`cards === null`)**:
    - Clickable Tarot Deck Prop (`TileButton` with `/images/randomizer/tarot.webp`)
    - CTA (`DbdButton`): `"Shuffle & Draw"` (`generator.tarotShuffleButton`)
  - **Sub-state B — Dealt Cards (`cards !== null`)**:
    - 4 3D-flipping tarot cards (`grid-cols-2 lg:grid-cols-4`):
      - **Back face (`!card.flipped`)**: Clickable card back art (`/images/tarot/{slug}-back.webp`), `aria-label="{cardName}"`
      - **Front face (`card.flipped`)**: Card face art (`/images/tarot/{slug}-face.webp`), top uppercase arcana title (`generator.tarotCardNames.*`: `"The Machinist"`, `"The Caregiver"`, `"The Chase"`, `"The Shadow"`, `"The Watcher"`, `"The Exhaustion"`, `"The Sacrifice"`, `"The Obsession"`, `"The Totems"`, `"The Hanged Man"`, `"The Fallen"`, `"The Scavenger"`, `"The Escape"`, `"The Entity"`, or `"The Tormentor"` for Killer `sacrifice`), and center `PerkSlot` (`size="tarot"`)
    - Bottom CTA (`DbdButton`): `"Shuffle & Draw"` (`generator.tarotShuffleButton`) to deal a new hand
- **Mode 5: Loot Crate (`genMode === 'crate'`, `LootCrateStage.tsx`)**:
  - **Sub-state A — Closed / Shaking (`phase === 'closed' | 'shaking'`)**:
    - Prompt: `"Crack open the Trial Offering and the Entity scatters perks for you to pick from. Each pick costs it 1-2 of the others."` (`generator.cratePrompt`)
    - Clickable Crate Prop (`motion.button` with `/images/randomizer/crate.webp`, shakes on open)
    - Closed CTA (`DbdButton`): `"Tap the Trial Offering"` (`generator.crateTapToOpen`)
    - Shaking status text: `"Cracking Open..."` (`generator.crateOpening`)
  - **Sub-state B — Scattering (`phase === 'scattering'`)**:
    - Live prompt: `"Pick one. Choosing it costs the Entity 1-2 of the others. {count}/4 locked in."` (`generator.scatterPrompt`)
    - 8–12 perks are thrown out; picking one locks it in (un-greys it) while the Entity randomly claims and removes 1–2 other unpicked perks:
    - **Mobile (`< md`)**: Top 4-slot loadout progress tray (`#1`..`#4` dashed boxes filling with compact `PerkSlot`s) + centered flex-wrap pool of remaining muted `PerkSlot`s
    - **Desktop (`>= md`)**: Full-area absolute scatter field (`scatterPointStyle`) with rotated/scaled `PerkSlot`s (muted until picked; picked perks stay in place in full color while Entity-claimed perks animate out)
  - **Sub-state C — Complete (`phase === 'complete'`)**:
    - Heading: `"Your loadout is locked in."` (`generator.scatterComplete`)
    - 4-card result grid (`PerkSlot` `size="large"`)
    - CTA (`DbdButton`): `"Crack Open Another"` (`generator.crateOpenAnother`) -> immediately shakes and scatters a new crate
- **Auth-Gated Perk Pool (`computeEligiblePool`)**:
  - Logged-in users roll only from perks where `is_owned !== false` (and `!is_disabled`).
  - Logged-out visitors roll from all non-disabled perks for the selected role.
- **Loading, Error & Empty States**:
  - Route / Suspense Loading (`RandomizerPageSkeleton`): `<output aria-busy="true" aria-label="Loading...">` + `DbdSpinner` (`label="Loading..."` / `app.loading`)
  - Fetch Error (`RandomizerClient.tsx`): `"Failed to load perks catalog."` (`generator.loadError`) + primary `"Retry"` button (`modal.retry`)
  - Zero Eligible Perks (`ownedOrAvailableCount === 0` in `GeneratorPage.tsx`): Bouncing `TriangleAlert` icon, heading `"No Perks Available"` (`generator.noPerksTitle`), subtitle `"Adjust your filter settings or unlock perks to begin rolling."` (`generator.noPerksDesc`)

### Modals & drawers (file)
- **Chaos Wheel of Curses Modal (`components/ChaosWheelModal.tsx`, mutators in `constants/chaosMutators.tsx`)**:
  - **Trigger**: Clicking the Chaos Mutator `IconToggleButton` (`CurseIcon` or active emoji) in `Toolbar.tsx`
  - **Shell**: `Modal` (`variant="dialog" size="xl"`), title `"Chaos Wheel of Curses"` (`generator.chaosWheelTitle`), close button (`modal.close`)
  - **Contents**:
    - Subtitle: `"Spin to apply a single trial Curse (an extra challenge) to your 4 perk loadout."` (`generator.chaosWheelDesc`)
    - **Canvas Wheel (`800x800`)**: Center hub `"CHAOS WHEEL"`, top red pointer, 6 role-specific slices with emoji + 2-line label (`getMutatorDisplayLines`):
      - **Survivor Mutators (6)**:
        1. `no_exhaustion`: `🚫` `"Curse of Exhaustion"` — `"Exhaustion perks have their drop chance reduced by 50% this trial."`
        2. `blindness`: `👁️` `"Curse of Blindness"` — `"Tracking perk (aura, sound and alert) drop chance is reduced by 50%, and perk icons stay hidden until revealed."`
        3. `solo_queue`: `🐺` `"Curse of Solitude"` — `"Altruism and healing perk drop chance is reduced by 50%. You walk the trial alone."`
        4. `meme_loadout`: `🤡` `"Curse of the Clown"` — `"Perks that block things have their drop chance increased by 50% for maximum trial chaos!"`
        5. `hex_boon_only`: `🔮` `"Boon Ritual"` — `"Boon and totem perks have their drop chance increased by 50% this trial!"`
        6. `negative_only`: `💀` `"Curse of Sacrifice"` — `"Severe handicap and high-drawback perks have their drop chance increased by 50%."`
      - **Killer Mutators (6)**:
        1. `no_slowdown`: `🛑` `"No Gen Slowdown"` — `"Generator regression and slowdown perks have their drop chance reduced by 50% this trial!"`
        2. `blindness`: `👁️` `"Curse of Blindness"` — `"Tracking perk (aura, sound and alert) drop chance is reduced by 50%, and perk icons stay hidden until revealed."`
        3. `chase_only`: `🩸` `"Pure Bloodlust"` — `"Chase, pallet-breaking, and aggression perks have their drop chance increased by 50%!"`
        4. `hex_roulette`: `🔮` `"Hex Totem Madness"` — `"Hex Totem perks have their drop chance increased by 50%. Risk it all on lit totems!"`
        5. `meme_loadout`: `🎪` `"Curse of the Clown"` — `"Perks that block things have their drop chance increased by 50% for maximum trial chaos!"`
        6. `negative_only`: `💀` `"Curse of Sacrifice"` (localized via `generator.chaosMutators.negative_only`, fallback `"Curse of the Entity"`) — `"Severe handicap and high-drawback perks have their drop chance increased by 50%."`
    - **Spin Button (`DbdButton`)**: `"Spin Chaos Wheel!"` (`generator.spinChaosWheel`) or `"Spinning Chaos Curses..."` (`generator.spinningCurses`) while spinning
    - **Active / Won Curse Card** (shown when `shownMutator` is non-null):
      - Emoji icon, curse name (`<h3>`), curse description (`<p>`)
      - **Clear Button (`variant="ghostDanger"`)**: `Trash2` icon + `"Clear"` (`generator.clearMutator`), tooltip & `aria-label="Remove active curse"` (`generator.clearMutatorTooltip`)
      - **Active Chip**: Green pill with `Check` icon + `"ACTIVE"` (`smashOrPass.active`)
- **Low Playable Pool Warning Modal (`components/common/ConfirmModal.tsx` in `GeneratorPage.tsx`)**:
  - **Trigger**: Automatically opens when `noRepeatPerks` is on and `totalPlayableCount` drops below `4` (`FULL_LOADOUT_SIZE`) after a draw
  - **Shell**: `ConfirmModal` (`variant="confirm" size="xs" layer="top"`):
    - Title: `"You're out of perks"` (`generator.lowPoolEmptyTitle`, when `totalPlayableCount === 0`) or `"Running low on perks"` (`generator.lowPoolTitle`, when 1–3 perks remain)
    - Message: `generator.lowPoolEmptyDesc` (0 perks), `generator.lowPoolDescOne` (1 perk), or `generator.lowPoolDescMany` (`"Only {count} perks left in the pool with No-Repeat Mode on, not enough for a full loadout of 4. Reset your drawn-perk memory to open the pool back up."`)
    - Alternative button: `"Close"` (`generator.lowPoolCloseButton`)
    - Confirm button: `RotateCcw` icon + `"Reset Drawn Perks"` (`generator.lowPoolResetButton`) -> clears only drawn-perk memory for the current role while keeping current loadout/mutator
- **Perk Detail Modal (`components/PerkModal.tsx`)**:
  - **Trigger**: Clicking any revealed `PerkSlot` / `PerkCard` in any of the 5 generator modes
  - **Contents**: `ModalIconHeader` (perk diamond, `{perk.name}`, optional `"Alias: ..."`, owner avatar), `PerkDescription`, and `PerkTypeBadges`.
- **Disabled Reason Modal (`components/DisabledReasonModal.tsx`)**:
  - **Trigger**: Clicking `DisabledBadge` on a disabled `PerkCard`
- **Database Backup / Scraper Config Modal (`components/ScraperConfigModal.tsx` & `components/scraper-config/*`)**:
  - *(Note: Lives at `components/ScraperConfigModal.tsx` and is triggered from the Admin Tools section via Export / Import / Purge database actions; inventoried here as requested by scope)*
  - **Shell**: `Modal` (`variant="dialog" size="2xl"`), title `"Database Backup & Snapshots"` (`admin.dbBackupSnapshots`), close button `aria-label="Close database modal"` (`admin.closeDbModal`)
  - **Tab Switcher (`ScraperConfigTabs.tsx`)**: `SegmentedControl` with 3 tabs:
    1. `'export'`: `Download` icon + `"Export JSON"` (`admin.exportJson`)
    2. `'import'`: `Upload` icon + `"Import JSON"` (`admin.importJson`)
    3. `'purge'`: `Trash2` icon + `"Purge"` (`admin.purge`)
  - **Tab 1 — Export (`ExportTab.tsx` + `TargetPicker.tsx`)**:
    - Optional error/success `StatusBanner` (`CircleAlert` / `CheckCircle2`)
    - `TargetPicker` heading `"Select Entities to Include in JSON Backup"` (`admin.selectBackupEntities`) + `"Select All"` / `"Deselect All"` link button (`admin.selectAll` / `deselectAll`)
    - 4 target category groups with group icon, group title, `InfoChip` `"{selected}/{total}"`, and per-group `"Select All"` / `"Deselect All"` button:
      - `"Game Content"` (`admin.groupContent`, `Database` icon): `Chapters`, `Realms`, `Item Categories`, `Map Sources`, `Survivors`, `Killers`, `Perks`, `Items & Equipment`, `Killer Add-ons`, `Item Add-ons`, `Offerings`, `Maps & Callouts`, `Map Layouts`, `Tier Lists`
      - `"Users & Accounts"` (`admin.groupUsers`, `Users` icon): `User Accounts`, `User Ownership Records`, `Player Showcases`, `Ban-Evasion List`
      - `"Community & Streaks"` (`admin.groupCommunity`, `Globe` icon): `Bug Reports`, `Changelog Posts`, `Gauntlet Runs`, `Chaos Streak Runs`, `History Streak Runs`, `ID, Please Runs`, `Page Streak Runs`, `Smash or Pass Rosters`
      - `"Configuration & System"` (`admin.groupSettings`, `Settings` icon): `Challenge Mode Toggles`, `Admin Audit Log`
    - Footer CTA button: `Download` icon + `"Download Backup ({count})"` (`admin.downloadBackup`) or `"Exporting..."` (`admin.exportingStatus`)
  - **Tab 2 — Import (`ImportTab.tsx`)**:
    - Optional error/success `StatusBanner`
    - Drag-and-drop JSON file dropzone (`FileJson` icon):
      - Empty state: `"Click or drag & drop a LemonDBD .json backup file"` (`admin.clickOrDragBackupPrefix` + `.json` + `clickOrDragBackupSuffix`)
      - Dragging state: `"Drop the .json backup file here..."` (`admin.dropFilePrompt`)
      - File selected state: Filename + remove `X` icon button (`aria-label="Remove file"` / `admin.removeFile`), `"{kb} KB, ready to restore"` (`admin.kbReadySuffix`), `"Change file"` (`admin.changeFile`)
    - **Import Strategy Radio Cards (`admin.chooseImportStrategy` = `"Choose Import Strategy"`)**:
      - `'merge'`: `ShieldCheck` icon + `"Merge & Update (Safe)"` (`admin.mergeUpdate`) — `"Upserts entities by name/slug without deleting existing data"` (`admin.mergeUpdateDesc`)
      - `'replace'`: `RotateCcw` icon + `"Wipe & Replace (Clean)"` (`admin.wipeReplace`) — `"Clears target tables first, then restores uploaded records"` (`admin.wipeReplaceDesc`)
    - **Import Results Breakdown (`importSummary`)**: Per-table chips showing `"+{created} ({updated} updated)"` and optional `"{skipped} skipped"`
    - Footer CTA button: `Upload` icon + `"Execute Import"` (`admin.executeImport`) or `"Importing..."` (`admin.importingStatus`) -> opens **Import Re-Auth `ConfirmModal`**
  - **Tab 3 — Purge (`PurgeTab.tsx` + `TargetPicker.tsx`)**:
    - Optional error/success `StatusBanner`
    - `TargetPicker` heading `"Select Target Tables to Wipe"` (`admin.selectTablesToWipe`), offering `PURGEABLE_TARGET_IDS` (all 28 targets except `users`, `admin_audit_logs`, `banned_email_hashes`; auto-selects foreign-key dependencies via `PURGE_REQUIRES`)
    - Footer CTA button: `Trash2` icon + `"Purge Selected ({count})"` (`admin.purgeSelected`) or `"Purging..."` (`admin.purgingStatus`) -> opens **Purge Re-Auth `ConfirmModal`**
  - **Nested Re-Authentication Confirm Modals (`ConfirmModal` + `ReauthFields.tsx` in `ScraperConfigModal.tsx`)**:
    - **Import Confirm Modal**: Title `"Wipe & Replace (Clean)"` or `"Merge & Update (Safe)"`, warning `"The selected tables are emptied and refilled from the backup. Data that is not in the backup is lost."` (`admin.wipeReplaceConfirm`, shown in `'replace'` mode), `ReauthFields` (Input `"Your password"` / `admin.confirmOwnPasswordLabel` with hint `"Importing or purging data needs your own password."` / `admin.reauthDatabaseHint`, plus Input `"Code from your authenticator app"` / `admin.confirmOwnTwoFactorLabel` when admin has 2FA enabled), confirm button `"Wipe & Replace (Clean)"` or `"Execute Import"`
    - **Purge Confirm Modal**: Title `"Purge"` (`admin.purge`), message `"{count} table group(s) are emptied permanently."` (`admin.purgeConfirm`), optional cascade warning `"Purging characters or perks also deletes every player's ownership of them; a killer's add-ons go with the killer, and teachable perks of purged characters become general perks."` (`admin.purgeCascadeNote`), `ReauthFields`, confirm button `"Purge"`.
