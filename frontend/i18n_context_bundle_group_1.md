# i18n Context Bundle (Existing Locales + Target Code Snippets)

> Instructions for AI:
> 1. Review existing translation keys in SECTION 1 to reuse keys or follow structure.
> 2. Replace hardcoded strings in SECTION 2 using `useTranslations` hooks or `t('key')`.
> 3. Output updated locale files or targeted line edits matching `lemon2.py` formatting.

# =====================================================================
# SECTION 1: EXISTING EN LOCALE DICTIONARIES (FOR REFERENCE)
# =====================================================================

### src/locales/en/admin.ts
```typescript
export default {
  "killSwitches": "Kill Switches",
  "challengeStats": "Challenge Stats",
  "auditLog": "Audit Log",
  "deleteUserTitle": "Delete user?",
  "deleteBugReportTitle": "Delete bug report?",
  "loadingAuditLog": "Loading audit log...",
  "noAuditLogs": "No admin actions logged yet.",
  "thAdmin": "Admin",
  "thAction": "Action",
  "thTarget": "Target",
  "thReason": "Reason",
  "thWhen": "When",
  "searchTicketsPlaceholder": "Search tickets / reporter...",
  "filterLabel": "Filter:",
  "statusAll": "All Statuses",
  "statusPending": "Pending Review",
  "statusInProgress": "In Progress",
  "statusResolved": "Resolved",
  "statusRejected": "Rejected / Closed",
  "createUserUsernamePlaceholder": "e.g. killer_master",
  "createUserEmailPlaceholder": "e.g. master@lemondbd.com",
  "createUserPasswordPlaceholder": "Minimum 3 characters",
  "roleStandard": "Standard User (Player)",
  "roleAdministrator": "Administrator (Full Control)",
  "createAccount": "Create Account",
  "exportBackupTitle": "Export Database JSON Backup",
  "export": "Export",
  "importBackupTitle": "Restore Database JSON Backup",
  "import": "Import",
  "pgAdminTitle": "Open pgAdmin Web Management (PostgreSQL DB Manager)",
  "pgAdmin": "pgAdmin (DB)",
  "runScraperTitle": "Execute Data Scraper and Database Seed",
  "refreshTitle": "Refresh metrics",
  "refresh": "Refresh",
  "analyticsTitle": "Open the Umami analytics dashboard (page views, feature usage)",
  "analytics": "Analytics",
  "reasonPlaceholder": "e.g. power is bugged, temporarily disabled while we fix it",
  "totalUsers": "Total Users",
  "admins": "Admins",
  "privilegedAccounts": "Privileged accounts",
  "characters": "Characters",
  "perks": "Perks",
  "databaseTeachables": "Database teachables",
  "database": "Database",
  "online": "ONLINE",
  "relationalStore": "Relational Store",
  "searchUserPlaceholder": "Search username / email...",
  "allRoles": "All Roles",
  "standardUsers": "Standard Users",
  "createUser": "Create User",
  "thId": "ID",
  "thUser": "User",
  "thEmail": "Email",
  "thRole": "Role",
  "thOwnedChars": "Owned Chars",
  "thUnlockedPerks": "Unlocked Perks",
  "thStatus": "Status",
  "thActions": "Actions",
  "closeDbModal": "Close database modal",
  "openPgAdmin": "Open pgAdmin Web Management Interface",
  "launchPgAdmin": "Launch pgAdmin",
  "exportJson": "Export JSON",
  "importJson": "Import JSON",
  "purgeReset": "Purge & Reset",
  "jsonFormatNotice": "Accepts full or partial JSON database exports",
  "mergeUpdate": "Merge & Update (Safe)",
  "wipeReplace": "Wipe & Replace (Clean)",
  "wipeReplaceConfirm": "Wipe & Replace database?",
  "purgeConfirm": "Purge selected tables?"
};
```

### src/locales/en/app.ts
```typescript
export default {
  "title": "LemonDBD",
  "syncWiki": "Sync Wiki Data",
  "syncing": "Syncing Data...",
  "perksVaultTitle": "Perks Vault & Codex",
  "perksVaultSubtitle": "Complete catalog of Dead by Daylight Survivor and Killer teachables, general perks, and aliases.",
  "perksVaultPageTitle": "LemonDBD - Dead by Daylight Perks Vault",
  "perkRandomizerPageTitle": "LemonDBD - Perk Randomizer",
  "loadingPerks": "Loading Perks Vault...",
  "resetFilters": "Reset Filters",
  "adminPageTitle": "LemonDBD - Admin Control Center",
  "buildsPageTitle": "LemonDBD - Community Builds",
  "guesserPageTitle": "LemonDBD - Minigames & Guesser",
  "charactersPageTitle": "LemonDBD - Characters & Teachables",
  "customPerksPageTitle": "LemonDBD - Custom Perk Studio",
  "draftPageTitle": "LemonDBD - Draft Mode",
  "killerCalculatorPageTitle": "LemonDBD - Killer Calculator",
  "mapsPageTitle": "LemonDBD - Tactical Map Command Explorer",
  "questsPageTitle": "LemonDBD - Quests & Trials",
  "resetPasswordPageTitle": "LemonDBD - Reset Password",
  "smashOrPassPageTitle": "LemonDBD - Smash or Pass | Dead by Daylight Romance",
  "streaksPageTitle": "LemonDBD - Challenges",
  "swfPageTitle": "LemonDBD - SWF Team Planner",
  "userPageTitle": "LemonDBD - User Profile",
  "homePageTitle": "LemonDBD - Dead by Daylight Companion"
};
```

### src/locales/en/builds.ts
```typescript
export default {
  "title": "Community Build Vault",
  "subtitle": "Discover, share, and vote on competitive, meme, and thematic builds.",
  "submitBuild": "Submit Build",
  "searchPlaceholder": "Search by title, description, character, author, or perk...",
  "copy": "Copy",
  "copied": "Copied",
  "share": "Share",
  "copyLoadout": "Copy loadout text",
  "shareCard": "Shareable Build Card & QR Code",
  "submitTitle": "Submit Custom Build",
  "submitSubtitle": "Share your custom loadout with the community",
  "buildTitle": "Build Title *",
  "buildTitlePlaceholder": "e.g. Enduring Spirit Nurse",
  "description": "Description",
  "descriptionPlaceholder": "Briefly explain the strategy or perk interactions...",
  "role": "Role *",
  "survivor": "Survivor",
  "killer": "Killer",
  "category": "Category *",
  "targetCharacter": "Target Character",
  "targetCharacterPlaceholder": "e.g. Huntress or Meg",
  "authorName": "Author Name",
  "authorNamePlaceholder": "Your username",
  "loadoutPerks": "Loadout Perks (4 Slots) *",
  "shareModalTitle": "Share Build Card",
  "shareModalSubtitle": "Scan QR code or copy link to share",
  "qrAlt": "Build QR Code",
  "scanMobile": "Scan with mobile device",
  "linkCopied": "Link Copied!",
  "copyShareLink": "Copy Share Link",
  "otzdarva": "Otzdarva Recommended",
  "meta": "Meta",
  "meme": "Meme",
  "stealth": "Stealth",
  "chase": "Chase"
};
```

### src/locales/en/card.ts
```typescript
export default {
  "general": "General Perk",
  "viewDetails": "Inspect Perk",
  "vaultTotal": "Vault Total",
  "ownedPerks": "Owned Perks"
};
```

### src/locales/en/characterDetail.ts
```typescript
export default {
  "backToCharacters": "Back to Characters",
  "roleSurvivor": "Survivor",
  "roleKiller": "Killer",
  "realName": "Real Name",
  "codePrefix": "Release Code",
  "characterOverview": "Character Dossier",
  "teachablePerks": "Teachable Perks",
  "teachablePerksDesc": "Signature unique perks originating from this character. Unlock them to share across all {role}s in the Bloodweb.",
  "noPerks": "No teachable perks cataloged for this character.",
  "loreTitle": "Character Lore & Bio",
  "lorePlaceholder": "The Entity is still gathering the archived memories and background lore for {name}. Check back soon as the archives expand.",
  "dlcTitle": "DLC & Chapter Information",
  "dlcChapter": "Chapter",
  "dlcType": "Release Classification",
  "dlcReleaseYear": "Release Year",
  "dlcLicense": "Licensing",
  "dlcOriginal": "Original Content",
  "dlcLicensed": "Licensed Franchise",
  "dlcBaseGame": "Base Game",
  "dlcFreeUpdate": "Free Update",
  "dlcParagraph": "Standalone Paragraph",
  "dlcAssociatedWith": "DLC Counterparts",
  "equipmentTitleSurvivor": "Survival Items & Equipment",
  "equipmentDescSurvivor": "Explore tools and tactical gear usable by survivors to repair, heal, escape, and counter killer powers.",
  "equipmentTitleKiller": "Power Add-ons & Equipment",
  "equipmentDescKiller": "Explore specialized add-ons that augment and transform this Killer's unique special power.",
  "noEquipment": "No specific equipment or add-ons cataloged for this character.",
  "fullModelTitle": "Character Model Showcase",
  "fullModelPlaceholder": "Full 3D Character Model View (Slot Reserved)",
  "fullModelNotice": "High-fidelity 3D model viewport slot. Currently displaying full portrait render.",
  "modelModePortrait": "Portrait View",
  "modelModeFull": "Full Body Showcase",
  "markAsOwned": "Mark as Owned",
  "markAsUnowned": "Mark as Unowned",
  "ownedBadge": "In Your Collection",
  "unownedBadge": "Not In Collection",
  "prevCharacter": "Previous Character",
  "nextCharacter": "Next Character",
  "allCharacters": "Characters Hub",
  "searchEquipment": "Filter add-ons / items...",
  "inspectPerk": "Inspect Perk",
  "allRarities": "All Rarities",
  "loading": "Loading Character Details...",
  "notFoundTitle": "Character Not Found",
  "notFoundDesc": "The character you are looking for does not exist or could not be found.",
  "killerPower": "Killer Power",
  "viewKillerPower": "View Power Mechanics",
  "killerPowerDesc": "Special ability and combat mechanics unique to this killer.",
  "movementSpeed": "Movement Speed",
  "terrorRadius": "Terror Radius",
  "height": "Height",
  "terrorRadiusVisualizer": "Terror Radius Visualizer",
  "terrorRadiusVisualizerDesc": "Interactive range map showing heartbeat propagation and survivor escape distance.",
  "heartbeatStages": "Heartbeat Intensity Stages",
  "immediateThreat": "Immediate Threat (0 - 8m)",
  "dangerZone": "Danger Zone (8 - 16m)",
  "approaching": "Approaching (16 - 24m)",
  "audibleRange": "Audible Range (24 - 32m)",
  "survivorComparison": "Survivor Speed Comparison",
  "survivorComparisonDesc": "Survivor standard sprint speed is 4.0 m/s (100%).",
  "viewLore": "Read Lore & Bio",
  "view3DModel": "Click to View Full 3D Model",
  "loreModalTitle": "The Entity's Archives — Codex Lore",
  "equipmentDetails": "Equipment Details",
  "close": "Close",
  "baseGame": "Base Game",
  "heightTall": "Tall",
  "heightAverage": "Average",
  "heightShort": "Short",
  "offeringsTitle": "Offerings & Sacrificial Rites",
  "offeringsDescSurvivor": "Explore realm reagents, luck charms, shrouds, and blueprints burned before a Trial.",
  "offeringsDescKiller": "Explore Memento Moris, wards, dark shrouds, and hooks burned to empower the Entity.",
  "allOfferings": "All Offerings",
  "categoryMori": "Memento Moris",
  "categorySpecial": "Special & Events",
  "categoryBloodpoints": "Bloodpoints",
  "categoryMap": "Realm Offerings",
  "categoryLuck": "Luck Charms",
  "categoryShroud": "Shrouds",
  "categoryWard": "Wards",
  "categoryBlueprint": "Blueprints",
  "categoryChest": "Chests & Fog",
  "searchOfferings": "Filter offerings...",
  "noMatchingOfferings": "No offerings match the active filters.",
  "clickToInspect": "Click to inspect full mechanics",
  "rarityCommon": "Common",
  "rarityUncommon": "Uncommon",
  "rarityRare": "Rare",
  "rarityVeryRare": "Very Rare",
  "rarityUltraRare": "Ultra Rare",
  "rarityEvent": "Event",
  "raritySpecial": "Special",
  "combatAttributes": "Combat Attributes & Threat Scale",
  "clickTerrorRadiusVisualizer": "Click Terror Radius for visualizer",
  "clickOutsideToClose": "Esc or click outside to close",
  "acousticRange": "Acoustic Range",
  "entityArchives": "The Entity's Archives",
  "codex": "Codex",
  "enteredTheFog": "Entered The Fog.",
  "currentBaseTerrorRadius": "Current Base Terror Radius",
  "lullaby": "Lullaby",
  "audible": "Audible",
  "chase": "Chase",
  "killerBase": "Killer Base",
  "survivorSprint": "Survivor Sprint",
  "straightGapClose": "Straight Gap Close",
  "straightLine": "straight line",
  "sortRarityLowToHigh": "Rarity: Low → High",
  "sortRarityHighToLow": "Rarity: High → Low",
  "sortNameAsc": "Name: A → Z",
  "clickOfferingForDetails": "Click offering for details",
  "clickAddonForDetails": "Click add-on for details",
  "clickItemForDetails": "Click item for details",
  "clickToInspectPerk": "Click to inspect full perk values",
  "killerPerk": "Killer Perk",
  "survivorPerk": "Survivor Perk",
  "unownedPerk": "Unowned perk",
  "immediateChaseDesc": "Max heartbeat tempo, aggressive percussion, and direct visual red stain engagement.",
  "dangerZoneDesc": "Rapid heavy thumping heartbeat; killer is actively maneuvering around loops.",
  "approachingDesc": "Rhythmic steady pulse indicating proximity to survivor objectives.",
  "audibleRangeDesc": "Initial faint audio cues signaling presence within the trial quadrant.",
  "generalPerk": "General Perk",
  "alias": "Alias",
  "interactiveViewer": "Interactive Viewer",
  "breadcrumbs": "Breadcrumb Navigation",
  "highRes3dModelView": "High-Res 3D Model View",
  "interactive3dMeshEngineWip": "Interactive 3D Mesh Engine (WIP)",
  "configRosterDesc": "Click character avatar buttons to toggle them in your Perk Randomizer pool.",
  "hubSubtitle": "Explore Dead by Daylight Survivors & Killers. View character details, unique teachable perks, power add-ons, and equipment.",
  "hubNoMatchingCharacters": "No characters match your current filter or search query.",
  "togglePerkOwnershipHelp": "Click a perk to toggle whether you own it.",
  "changesSaved": "Changes saved"
};
```

### src/locales/en/draft.ts
```typescript
export default {
  "draftTitle": "Competitive Draft Room",
  "draftSubtitle": "Strategic 1v1 Perk Banning & Picking Engine",
  "roomCode": "Room Code",
  "createRoom": "Create Draft Room",
  "joinRoom": "Join Room",
  "roomCodePlaceholder": "Enter Room Code (e.g. AB12CD)",
  "loadingRoom": "Loading Draft Room...",
  "roomNotFound": "Draft room not found or expired.",
  "copyRoomLink": "Copy Room Invite Link",
  "linkCopied": "Invite Link Copied to Clipboard!",
  "spectatorMode": "Spectating Draft Room",
  "currentTurn": "Current Turn",
  "survivorTurn": "Survivor's Turn",
  "killerTurn": "Killer's Turn",
  "phaseBan": "Ban Phase",
  "phasePick": "Pick Phase",
  "phaseCompleted": "Draft Completed",
  "bannedPerks": "Banned Perks",
  "pickedPerks": "Picked Perks",
  "banAction": "Ban Perk",
  "pickAction": "Pick Perk",
  "selectPerkToBan": "Select a Perk to Ban",
  "selectPerkToPick": "Select a Perk to Pick",
  "waitingForOpponent": "Waiting for opponent's action..."
};
```

### src/locales/en/empty.ts
```typescript
export default {
  "title": "No Perks Found",
  "subtitle": "Try adjusting your search terms or filter combinations.",
  "loading": "Loading Perks..."
};
```

### src/locales/en/filters.ts
```typescript
export default {
  "searchPlaceholder": "Search by perk title or description...",
  "category": "Category",
  "allCategories": "All Roles",
  "survivor": "Survivors",
  "killer": "Killers",
  "character": "Character",
  "allCharacters": "All Characters",
  "sortBy": "Sort By",
  "sortName": "Perk Name",
  "sortCharacter": "Character",
  "sortCategory": "Role",
  "order": "Order",
  "asc": "Ascending (A-Z)",
  "desc": "Descending (Z-A)",
  "clear": "Reset Filters",
  "generatorTab": "Perk Randomizer",
  "perks": "Perks",
  "allPerks": "All Perks",
  "generalOnly": "General Only",
  "everyPerk": "Every Perk",
  "ownedOnly": "Owned Only",
  "filterByCharacter": "Filter by character...",
  "generalPerksOnly": "General Perks Only",
  "sortByName": "Perk Name",
  "sortByCharacter": "Character",
  "sortByRole": "Role",
  "orderAsc": "Ascending (A-Z)",
  "orderDesc": "Descending (Z-A)"
};
```

### src/locales/en/generator.ts
```typescript
export default {
  "title": "Perk Loadout Generator",
  "subtitle": "Roll random perks based on in-game inventory coordinates [Page/Slot].",
  "modeInstant": "Instant Roll",
  "modeWheel": "Wheel of Fortune",
  "configTitle": "Inventory & Wheel Settings",
  "totalPages": "Total Pages",
  "perksPerPage": "Perks per Page",
  "lastPagePerks": "Last Page Perks",
  "spinDuration": "Spin Duration (sec)",
  "resetDefaults": "Reset to Defaults",
  "rollButton": "Roll New Loadout",
  "spinWheels": "Spin Wheel for Slot #{slot}",
  "spinning": "Spinning Wheel...",
  "pageWheelTitle": "Page Wheel",
  "perkWheelTitle": "Perk Wheel",
  "selectedPage": "Selected Page: {page}",
  "slotBadge": "Page {page} / Slot {slot}",
  "noRepeat": "No-Repeat Perks",
  "drawnBadge": "Drawn: {drawn} / {total}",
  "resetDrawn": "Reset Used Perks",
  "titleSuffix": "Perk Randomizer",
  "pageLabel": "Page",
  "pagesLabel": "Pages",
  "playableLabel": "Playable",
  "subtitleOwned": "Rolling from your unlocked and owned perks.",
  "subtitleAll": "Rolling from the complete Dead by Daylight perk vault.",
  "survivor": "Survivor",
  "killer": "Killer",
  "perksButtonLabel": "Perks",
  "noRepeatLabel": "No-Repeat",
  "resetAllLabel": "Reset All",
  "noPerksTitle": "No Perks Available",
  "noPerksDesc": "Adjust your filter settings or unlock perks to begin rolling.",
  "configureCharacters": "Configure Characters",
  "activeLoadoutTitle": "Active Random Loadout",
  "slotFocus": "Slot #{slot}",
  "emptySlot": "Empty Slot",
  "spinOrRollPrompt": "Spin the wheel or click roll to draw your perk",
  "cursedBlindness": "Cursed Blindness",
  "clickToReveal": "Click to Reveal",
  "rollCompleteLoadout": "Roll 4-Perk Loadout",
  "selectRole": "Select Role",
  "generatorMode": "Generator Mode",
  "resetAllTooltip": "Reset wheels, loadout slots, and memory",
  "clearSlotTooltip": "Clear slot"
};
```

### src/locales/en/guesser.ts
```typescript
export default {
  "navLink": "Guesser",
  "title": "DBD Knowledge Guesser",
  "subtitle": "Test your mastery of survivors, killers, powers, and perks.",
  "selectMode": "Select a Game Mode",
  "currentStreak": "Current Streak",
  "bestStreak": "Best Streak",
  "accuracy": "Accuracy",
  "totalGuesses": "Total Guesses",
  "play": "Play",
  "playing": "Playing",
  "correct": "Correct!",
  "incorrect": "Incorrect!",
  "next": "Next Question",
  "back": "Back to modes",
  "loading": "Loading Game...",
  "modeCharacterTitle": "Character Guesser",
  "modeCharacterDesc": "Identify survivors, killers, and powers based on descriptions and real names.",
  "modePerkDescTitle": "Perk Description Guesser",
  "modePerkDescDesc": "Guess the perk from its text. Words are progressively scratched out at higher streaks!",
  "modePerkNameToIconTitle": "Name to Icon Guesser",
  "modePerkNameToIconDesc": "Pick the right perk icon. Icons rotate, gray out, and crop at higher streaks!",
  "modePerkIconToNameTitle": "Icon to Name Guesser",
  "modePerkIconToNameDesc": "Guess the perk name from its icon. Adaptive distortion applies to icons!",
  "modeMapTitle": "Map Guesser",
  "modeMapDesc": "Test your visual recognition of realms, seeds, tiles, and generator loops.",
  "modeMemesTitle": "DBD Meme Guesser",
  "modeMemesDesc": "Guess the jokes and names from popular Dead by Daylight community memes.",
  "reset": "Reset Streak",
  "streakResetSuccess": "Streak reset successfully",
  "soundOn": "Sound On",
  "soundOff": "Sound Off",
  "best": "Best:",
  "streak": "Streak",
  "wip": "WIP",
  "charAvatarHint": "Character avatar hint",
  "redacted": "Redacted (High Streak)",
  "blurred": "Blurred (Medium Streak)",
  "distortedPerkIcon": "Distorted perk icon hint",
  "perkIconChoice": "Perk Icon Choice",
  "escReturn": "Esc: Return",
  "spaceContinue": "Space: Continue"
};
```

### src/locales/en/index.ts
```typescript
import app from './app';
import landing from './landing';
import generator from './generator';
import stats from './stats';
import filters from './filters';
import pagination from './pagination';
import card from './card';
import modal from './modal';
import empty from './empty';
import guesser from './guesser';
import voice from './voice';
import characterDetail from './characterDetail';
import sidebar from './sidebar';
import smashOrPass from './smashOrPass';
import user from './user';
import swf from './swf';
import draft from './draft';
import streaks from './streaks';
import builds from './builds';
import admin from './admin';
import maps from './maps';

const en = {
  app,
  landing,
  generator,
  stats,
  filters,
  pagination,
  card,
  modal,
  empty,
  guesser,
  voice,
  characterDetail,
  sidebar,
  smashOrPass,
  user,
  swf,
  draft,
  streaks,
  builds,
  admin,
  maps,
};

export default en;

```

### src/locales/en/landing.ts
```typescript
export default {
  "welcomeBadge": "Dead by Daylight Companion",
  "welcomeTitle": "Welcome to LemonDBD",
  "welcomeSubtitle": "Your dedicated Dead by Daylight database, interactive map explorer, perk randomizer, and player companion.",
  "enterButton": "Enter Perks Vault",
  "characterOverview": "Character Overview"
};
```

### src/locales/en/maps.ts
```typescript
export default {
  "searchPlaceholder": "Search map or realm...",
  "searchAria": "Search map or realm",
  "clearSearchAria": "Clear search input",
  "providerAria": "Map Provider Source",
  "providerToggleAria": "Map Provider Toggle",
  "allSources": "All Sources",
  "all": "All",
  "realmFiltersAria": "Realm Filters",
  "realmPillsAria": "Realm Pills",
  "launch2DEngine": "Launch 2D Interactive Engine",
  "twoDEngine": "2D Engine",
  "launchFullscreenEngine": "Launch Fullscreen Engine",
  "popoutAria": "Popout Map Image in New Window",
  "popout": "Popout",
  "dragPanScrollZoom": "Drag to pan • Scroll to zoom",
  "mapControlsAria": "Map view zoom and navigation controls",
  "zoomIn": "Zoom In",
  "zoomInAria": "Zoom In",
  "zoomOut": "Zoom Out",
  "zoomOutAria": "Zoom Out",
  "fitToScreen": "Fit to Screen",
  "set100Zoom": "Set 100% Zoom",
  "set150Zoom": "Set 150% Zoom",
  "set200Zoom": "Set 200% Zoom",
  "resetView": "Reset View",
  "resetZoomPan": "Reset Zoom & Pan",
  "resetPanZoom": "Reset Pan & Zoom",
  "resetPanAndZoomAria": "Reset Pan and Zoom",
  "fullscreenMode": "Fullscreen Interactive Mode",
  "fullscreenAria": "Fullscreen Interactive Mode",
  "popoutInWindow": "Popout Map in Window",
  "loadingDirectory": "Loading map directory",
  "noMapsFound": "No Maps Found",
  "isometricScheme": "Isometric Scheme (Steam Guide)",
  "clockCalloutScheme": "12-Clock Callout Map System",
  "sectorLegendAria": "Map Sector Legend",
  "directoryAndLegendsAria": "Map Directory and Legends",
  "closeBottomSheetAria": "Close Bottom Sheet",
  "mapVariantsAria": "Map Realm Variants",
  "mapVariants": "Map Variants:",
  "variants": "Variants:",
  "variant": "Variant:",
  "floor": "Floor:",
  "mapVariantSelectorAria": "Map Variant Selector",
  "floorSelectorAria": "Floor Selector",
  "renderingLayout": "Rendering Tactical Map Layout...",
  "layerTogglesAria": "Map Layer Toggles",
  "engineControlsAria": "Engine Zoom and Reset Controls",
  "fullscreenEngineAria": "2D Fullscreen Map Engine",
  "voiceEngineAria": "Voice Map Navigation Engine",
  "palletPresent": "Standard Pallet Present",
  "godPallet": "God Pallet",
  "godPalletDesc": "Forces killer to break pallet. Safe 100% loop reset.",
  "safePallet": "Safe Pallet",
  "safePalletDesc": "High safety margin. Difficult for killer to mindgame without breaking.",
  "mindgamePallet": "Mindgameable Pallet",
  "mindgamePalletDesc": "Medium safety. Watch out for red stain hiding and double-backs.",
  "unsafePallet": "Death Trap / Unsafe Pallet",
  "unsafePalletDesc": "Low wall / short loop. Pre-drop & stun, or abandon immediately!",
  "closeInspectorAria": "Close Inspector",
  "allowedDirections": "Allowed Directions:",
  "fastVault": "Fast Vault (0.5s):",
  "mediumVault": "Medium Vault (0.9s):",
  "locationNote": "Location Note:",
  "inspectorTitle": "LemonDBD Interactive Realm Inspector",
  "pallets": "Pallets",
  "windows": "Windows",
  "totems": "Totems",
  "gens": "Gens",
  "gatesHatch": "Gates & Hatch",
  "tiles": "Tiles",
  "callouts": "Callouts",
  "chromeEdgeSafari": "Chrome • Edge • Safari",
  "universalPrivateInBrowser": "Universal • Private • In-Browser",
  "preloadModel": "Preload Model",
  "pageTitle": "LemonDBD - Tactical Map Command Explorer",
  "initializingTacticalMap": "Initializing Tactical Map Command...",
  "loadingTacticalMaps": "Loading Tactical Maps...",
  "tacticalEngineVersion": "LemonDBD Tactical Engine v2.0",
  "mapDirectory": "Map Directory",
  "fit": "Fit",
  "noMapsAdjustFilter": "Try adjusting your search query or selected realm filter.",
  "centerLandmarkObjective": "Center Landmark / Objective",
  "palletSafetyAssessment": "Pallet Safety Assessment",
  "fastVaultMomentumNote": "Requires running straight at window with at least 2.5m momentum.",
  "mediumVaultAngledNote": "Triggers on angled approach. High risk of killer hit!",
  "survivorLoopingTipsTitle": "Survivor Looping Pathing Tips",
  "survivorLoopingTipsDefault": "Hug high walls tightly to minimize loop distance. Watch killer red stain over low obstacles and keep camera focused behind you while pathing.",
  "killerMindgameCounterTitle": "Killer Mindgame Counterplay",
  "killerMindgameCounterDefault": "Killers will attempt to hide red stain by moonwalking backward around high walls or faking window vault angles to force premature pallet drops.",
  "sourceHensClock": "Hens333 (12-Clock)",
  "sourceSamoelIsometric": "SamoelColt (Isometric)",
  "detectedBrowser": "Detected Browser",
  "activeRecognitionEngine": "Active Recognition Engine"
};
```

### src/locales/en/modal.ts
```typescript
export default {
  "close": "Close",
  "character": "Associated Character",
  "role": "Role",
  "copySlug": "Copy Identifier",
  "slugCopied": "Copied to Clipboard!",
  "perkDescription": "Perk Description",
  "generalPerk": "General Perk",
  "alias": "Alias",
  "clickToInspectPerk": "Click to inspect perk",
  "clickToInspect": "Click to inspect full mechanics",
  "killerPerk": "Killer Perk",
  "survivorPerk": "Survivor Perk",
  "unownedPerk": "Unowned perk",
  "equipment": "Equipment",
  "clickOutsideToClose": "Esc or click outside to close",
  "temporarilyDisabled": "Temporarily disabled",
  "whyDisabled": "Why is {item} disabled?",
  "wasDisabledTemporarily": "{item} was disabled temporarily.",
  "reasonLabel": "Reason"
};

```

### src/locales/en/pagination.ts
```typescript
export default {
  "showing": "Showing",
  "of": "of",
  "results": "perks",
  "perPage": "Per page",
  "page": "Page",
  "previous": "Previous Page",
  "next": "Next Page",
  "firstPage": "First Page",
  "lastPage": "Last Page",
  "goTo": "Go to",
  "navAriaLabel": "Pagination Navigation"
};
```

### src/locales/en/sidebar.ts
```typescript
export default {
  "perks": "Perks",
  "challenges": "Challenges",
  "mapExplorer": "Map Explorer",
  "characters": "Characters",
  "smashOrPass": "Smash or Pass",
  "trophies": "Trophies",
  "draftRoom": "🏆 Draft Room",
  "swfPlanner": "👥 SWF Planner",
  "killerCalc": "🎯 Killer Calc",
  "buildVault": "🔥 Build Vault",
  "perkStudio": "🎨 Perk Studio",
  "quests": "📜 Quests",
  "navigation": "Navigation",
  "perkRandomizer": "Perk Randomizer",
  "others": "Others",
  "admin": "ADMIN",
  "adminControlCenter": "Admin Control Center",
  "soon": "Soon",
  "signIn": "Sign In / Register",
  "signOut": "Sign Out",
  "emailNotVerified": "Email not verified. Verify now",
  "reportBug": "Report Bug",
  "buyCoffee": "Buy Coffee",
  "switchLanguage": "Switch Language",
  "toggleTheme": "Toggle Dark Mode",
  "collapseSidebar": "Collapse Navigation Sidebar",
  "expandSidebar": "Expand Navigation Sidebar",
  "bugReportModalTitle": "Report an Issue / Bug",
  "bugReportModalSubtitle": "Help improve LemonDBD with bug reports or feedback",
  "bugCategoryPerks": "Perks & Teachable Data",
  "bugCategoryCharacters": "Characters & Killer Powers",
  "bugCategoryMaps": "Map Explorer & Callouts",
  "bugCategoryChallenges": "Perk Randomizer & Challenges",
  "bugCategoryDraftSwf": "Draft Room & SWF Planner",
  "bugCategoryUiTranslations": "UI, Design & Translations",
  "bugCategoryOther": "Other Gameplay Glitch",
  "bugTitleLabel": "Issue Title",
  "bugTitlePlaceholder": "e.g., Perk description typo, wrong power cooldown...",
  "bugCategoryLabel": "Category",
  "bugDescriptionLabel": "Detailed Description",
  "bugDescriptionPlaceholder": "Describe the bug, steps to reproduce, or expected behavior...",
  "bugGuestEmailLabel": "Email (Optional, for resolution updates)",
  "bugGuestEmailPlaceholder": "you@example.com",
  "bugLoggedInAs": "Logged in as",
  "bugScreenshotsLabel": "Attach Screenshots (Max 3, 2MB each)",
  "bugUploadImage": "Upload Image",
  "bugSecurityVerification": "Security Verification",
  "bugSubmitButton": "Submit Bug Report",
  "bugSubmitting": "Submitting...",
  "bugSuccessMessage": "Bug report submitted successfully! Thank you for helping improve LemonDBD.",
  "bugErrorMessage": "Failed to submit report. Please try again.",
  "bugCloseButton": "Close",
  "bugAltchaVerifying": "Verifying security challenge...",
  "bugAltchaVerified": "Security challenge passed",
  "coffeeTitle": "Support LemonDBD",
  "coffeeSubtitle": "Direct support from the player community",
  "coffeeFuelNotice": "Entity Fuel Notice",
  "coffeeDonationMessage": "Fuel the Entity with caffeine to keep LemonDBD database servers and live scrapers running 24/7!",
  "coffeeBuyMeCoffeeTagline": "Quick 1-click coffee & support",
  "coffeeKofiTagline": "0% fee donations & one-time tips",
  "coffeePatreonTagline": "Monthly supporter perks & early features",
  "coffeeVisit": "Visit",
  "coffeeFooterNotice": "Free forever & community powered",
  "coffeeClose": "Close",
  "homeAria": "LemonDBD Home",
  "navAria": "Main Navigation",
  "openDrawer": "Open Navigation Drawer",
  "closeDrawer": "Close Navigation Drawer",
  "claimed": "Claimed"
};
```

### src/locales/en/smashOrPass.ts
```typescript
export default {
  "title": "Smash or Pass",
  "selectRoster": "SELECT ROSTER",
  "dwellHint": "Grab and spin. Dwell 1s in center to select.",
  "active": "ACTIVE",
  "dwellActive": "Active ({seconds}s)",
  "subtitle": "Rate Dead by Daylight candidates, discover your Trial Romance Archetype, and vote.",
  "smash": "Smash",
  "pass": "Pass",
  "superSmash": "Super Smash",
  "leaderboard": "Hall of Fame",
  "leaderboardSubtitle": "Official community voting statistics across all Killers & Survivors",
  "search": "Search candidates or leaderboard...",
  "close": "Close",
  "shuffle": "Shuffle",
  "undo": "Undo",
  "mySmashes": "Your Smashes",
  "stats": "Dossier & Stats",
  "reset": "Reset Deck",
  "keybindings": "Keybindings",
  "hint": "Use Arrow Keys or Swipe to Vote",
  "godTier": "God Tier",
  "fatalAttraction": "Fatal Attraction",
  "friendzone": "Friendzone",
  "eldritchVoid": "Eldritch Void",
  "chaosRating": "Chaos Rating",
  "dangerLevel": "Danger Level",
  "archetype": "Archetype",
  "compatibilityScore": "Compatibility Score",
  "communitySmashRate": "Community Smash Rate",
  "totalVotes": "Total Votes",
  "traits": "Compatibility Traits",
  "all": "All",
  "allRoles": "All Roles",
  "survivors": "Survivors",
  "killers": "Killers",
  "allGenders": "All Genders",
  "female": "Female",
  "femaleOnly": "Female Only",
  "male": "Male",
  "maleOnly": "Male Only",
  "monsters": "Monsters & Eldritch",
  "rosters": {
    "canon": {
      "name": "Dead by Daylight: Fog Canon",
      "desc": "The complete 98-character roster of all official Killers and Survivors."
    },
    "hoy": {
      "name": "Hooked on You: Island Romance",
      "desc": "Tropical paradise dating sim edition with beach outfits and sunny vibes."
    },
    "legendary": {
      "name": "Legendary Skins & Collabs",
      "desc": "Iconic legendary skins and crossover collabs from gaming history."
    },
    "cyberpunk": {
      "name": "Cyberpunk Fog 2077 Edition",
      "desc": "High-tech neon augmented champions fighting in a dystopian fog."
    },
    "anime": {
      "name": "Fog Anime / Manga Aesthetic",
      "desc": "Stylized anime aesthetic adaptations of your favorite Fog characters."
    },
    "gothic": {
      "name": "Victorian & Gothic Eldritch Legends",
      "desc": "Dark fantasy, Bloodborne aesthetics, and Victorian eldritch horrors."
    },
    "hooked_on_you": {
      "name": "Hooked on You: Island Romance",
      "desc": "Tropical paradise dating sim edition with beach outfits and sunny vibes."
    },
    "legendary_cosplay": {
      "name": "Legendary Skins & Collabs",
      "desc": "Iconic legendary skins and crossover collabs from gaming history."
    },
    "cyberpunk_2077": {
      "name": "Cyberpunk Fog 2077 Edition",
      "desc": "High-tech neon augmented champions fighting in a dystopian fog."
    },
    "anime_manga": {
      "name": "Fog Anime / Manga Aesthetic",
      "desc": "Stylized anime aesthetic adaptations of your favorite Fog characters."
    },
    "gothic_eldritch": {
      "name": "Victorian & Gothic Eldritch Legends",
      "desc": "Dark fantasy, Bloodborne aesthetics, and Victorian eldritch horrors."
    }
  },
  "controls": {
    "pass": "Pass",
    "smash": "Smash",
    "superSmash": "Super Smash",
    "stats": "Dossier & Stats",
    "reset": "Reset Deck",
    "keybindings": "Keybindings",
    "hint": "Use Arrow Keys or Swipe to Vote",
    "arrowLeft": "Pass (Left Arrow)",
    "arrowRight": "Smash (Right Arrow)",
    "arrowUp": "Stats (Up Arrow)",
    "arrowDown": "Super Smash (Down Arrow)",
    "keyR": "Reset (R Key)"
  },
  "tiers": {
    "godTier": "God Tier",
    "fatalAttraction": "Fatal Attraction",
    "friendzone": "Friendzone",
    "eldritchVoid": "Eldritch Void"
  },
  "statsDetail": {
    "chaosRating": "Chaos Rating",
    "dangerLevel": "Danger Level",
    "archetype": "Archetype",
    "compatibilityScore": "Compatibility Score",
    "communitySmashRate": "Community Smash Rate",
    "totalVotes": "Total Votes",
    "traits": "Compatibility Traits",
    "smashCount": "Smashes",
    "passCount": "Passes",
    "superSmashCount": "Super Smashes",
    "rank": "Rank",
    "quote": "Quote"
  },
  "filters": {
    "all": "All",
    "allRoles": "All Roles",
    "survivors": "Survivors",
    "killers": "Killers",
    "allGenders": "All Genders",
    "female": "Female",
    "femaleOnly": "Female Only",
    "male": "Male",
    "maleOnly": "Male Only",
    "monsters": "Monsters & Eldritch"
  },
  "modals": {
    "statsTitle": "Candidate Dossier",
    "leaderboardTitle": "Hall of Fame",
    "leaderboardSubtitle": "Official community voting statistics across all Killers & Survivors",
    "personaTitle": "Trial Romance Archetype",
    "personaSubtitle": "Your psychological compatibility report based on your voting tendencies",
    "resetConfirmTitle": "Reset All Votes?",
    "resetConfirmDesc": "This will rewind all your votes in this session and reshuffle the candidate deck.",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "close": "Close"
  },
  "notifications": {
    "voteRecorded": "Vote recorded!",
    "deckReset": "Deck has been reset.",
    "rateLimit": "Voting too fast! Please slow down.",
    "errorLoading": "Failed to load candidate feed.",
    "errorVoting": "Failed to record vote."
  },
  "empty": {
    "title": "Deck Completed!",
    "subtitle": "You have evaluated all available candidates in this roster.",
    "resetAction": "Reset & Vote Again",
    "viewLeaderboard": "View Leaderboard",
    "switchRoster": "Choose Another Roster"
  },
  "loreLabels": {
    "trialClassification": "Trial Classification",
    "datingArchetype": "Dating Archetype",
    "greenFlag": "Trial Green Flag",
    "redFlag": "Trial Warning",
    "identityProfile": "Identity Profile",
    "signatureQuote": "Signature Quote",
    "trialWarning": "Trial Warning",
    "female": "Female",
    "male": "Male",
    "monster": "Eldritch / Monster"
  },
  "hud": {
    "left": "left",
    "smash": "Smash",
    "pass": "Pass",
    "smashRate": "Rate",
    "bgm": "BGM",
    "archetype": "Archetype",
    "hallOfFame": "Hall of Fame",
    "howToPlay": "How to Play",
    "shuffle": "Shuffle"
  },
  "howToPlayModal": {
    "title": "How to Play Smash or Pass",
    "swipeTitle": "Swipe or Drag Cards",
    "swipeDesc": "Drag card Right to Smash 💋 or drag Left to Pass ✖.",
    "iconsTitle": "On-Card Action Icons",
    "iconsDesc": "Click Flip (top-left icon) to read bio, traits, green/red flags, and community memes. Click Zoom for high-res portrait art.",
    "keycapsTitle": "Tactile Keyboard Keycaps",
    "atmosphereTitle": "Atmospheric Background & Music",
    "atmosphereDesc": "Hover over background text elements to inspect quotes and lore with glowing effects. Toggle BGM (B key) for dark synth ambience!",
    "letsPlay": "Got It, Let's Play!"
  },
  "personaArchetypes": {
    "eldritchDevotee": {
      "title": "The Eldritch Devotee",
      "subtitle": "Incomprehensible horrors and ancient beings are your true love language.",
      "desc": "Why settle for mortal romance when the cosmic void is calling? You embrace tentacles, teeth, and cosmic mystery."
    },
    "redStainAddict": {
      "title": "The Red Stain Addict",
      "subtitle": "Danger is your turn-on, and terror radiuses make your heart flutter.",
      "desc": "Mori animations are just aggressive cuddles in your book. You are drawn to power, menace, and dark charisma."
    },
    "campfireSoulmate": {
      "title": "The Campfire Soulmate",
      "subtitle": "Wholesome teamwork and altruistic healing melt your heart.",
      "desc": "You seek companionship, genuine smiles, and someone who will unhook you before opening the exit gate."
    },
    "entitysParamour": {
      "title": "The Entity’s Paramour",
      "subtitle": "You see beauty, charm, and romance in almost every single soul in the Fog.",
      "desc": "High standards? Never heard of them. Your heart is an endless sanctuary for all survivors and killers alike."
    },
    "coldHeartedPragmatist": {
      "title": "The Cold-Hearted Pragmatist",
      "subtitle": "Extremely selective, immune to charms, focused solely on survival.",
      "desc": "Very few can pass your stringent dating checklist. You need perfection, flawless perks, and zero red flags."
    },
    "fogRomantic": {
      "title": "The Fog Romantic",
      "subtitle": "A balanced soul seeking passion and adrenaline across the trials.",
      "desc": "You believe that even within the infinite trials of the Entity, a true spark of romance can always be found."
    }
  },
  "tooltips": {
    "mute": "Mute sound FX (M)",
    "unmute": "Unmute sound FX (M)",
    "playBgm": "Play dark ambience BGM (B)",
    "pauseBgm": "Pause dark ambience BGM (B)",
    "resetAllVotes": "Reset all my votes",
    "howToPlay": "How to play & keybindings",
    "shuffle": "Shuffle remaining candidates"
  }
};
```

### src/locales/en/stats.ts
```typescript
export default {
  "vaultStats": "Vault Statistics",
  "totalPerks": "Total Perks",
  "characters": "Characters",
  "survivors": "Survivors",
  "killers": "Killers",
  "ratio": "Role Distribution",
  "totalXpClaimed": "Total XP Claimed",
  "completed": "Completed",
  "streak": "Streak",
  "win": "beaten",
  "vaultTotal": "Vault Total",
  "ownedPerks": "Owned Perks"
};
```

### src/locales/en/streaks.ts
```typescript
export default {
  "streaksTitle": "Challenge & Streak Hub",
  "backToKillerStreaks": "Back to killer streaks",
  "backToKillers": "Back to killers",
  "rules": "Rules",
  "stats": "Statistics",
  "perkPool": "Perk Pool",
  "resetRun": "Reset Run",
  "resetRunTitle": "Reset this run?",
  "chooseDifficulty": "Choose a difficulty",
  "chooseMode": "Choose a mode",
  "chooseGauntletMode": "Choose a Gauntlet Mode",
  "runProgress": "Run progress",
  "pullTheLever": "Pull the lever!",
  "challengeStarted": "Challenge started.",
  "readyForGauntlet": "Ready for the Gauntlet?",
  "winMatch": "WIN MATCH",
  "loseMatch": "LOSE MATCH",
  "anyPerkYouLike": "Any perk you like",
  "perksUnlocked": "Perks unlocked",
  "noNewPerks": "No new perks this time.",
  "noPerksUnlockedYet": "No perks unlocked yet.",
  "everyPerkUnlocked": "Every perk is unlocked.",
  "loadingStreak": "Loading streak…",
  "yourBuild": "Your build",
  "attempt": "attempt",
  "layoutFrozen": "layout frozen",
  "streakRoleTabs": "Streak Role Tabs",
  "matchSummary": "Match summary and historical performance",
  "temporarilyDisabled": "This challenge was disabled temporarily.",
  "pageStreak": "Page streak",
  "loadingKillers": "Loading your killers...",
  "retry": "Retry",
  "loadingRoster": "Loading roster…",
  "resetRunPrompt": "Reset the run if you want to go through it again.",
  "chaosRulesTitle": "Chaos Streak Rules",
  "chaosRulesSubtitle": "How the draw, the pick, and the checkpoints work",
  "chaosStreak": "Chaos Streak",
  "original": "Original",
  "lemonVersion": "Lemon version",
  "comingSoon": "Coming soon.",
  "yourOwnTeachablePerks": "your own teachable perks",
  "threeKillsOrMore": "3 kills or more",
  "escape": "escape",
  "checkpoint": "checkpoint",
  "historyRulesTitle": "History Streak Rules",
  "historyRulesSubtitle": "How the roadmap, rows, and perk pool work",
  "historyStreak": "History Streak",
  "pageStreakRulesTitle": "Page Streak Rules",
  "pageStreakRulesSubtitle": "How pages, builds, and the perk pool work",
  "perksCount": "perks",
  "pagesCount": "pages",
  "lastPage": "last page",
  "devSkipWinTitle": "Dev only: win with every remaining killer to reach the completion screen",
  "startStreak": "Start streak",
  "starting": "Starting…",
  "gameCancelled": "Game cancelled:",
  "hackers": "Hackers:",
  "crashServerFailure": "Crash or server failure:",
  "noDodging": "No dodging:",
  "chaosConcept": "Chaos Concept",
  "chaosConceptDesc": "Pull the lever to draw 4 random perks from every unlocked killer perk you own, plus 2 addon rarity requirements. Nothing repeats until the whole pool has been drawn once. Then you pick which of your remaining killers plays the round, accept the pick, and play the trial with that build as your guide.",
  "anythingLessLoss": "Anything less is a loss.",
  "chaosAddonRequirement": "You must play the killer with addons matching the 2 drawn rarities.",
  "chaosWinRun": "Win with every killer you own on this difficulty and the run is complete.",
  "poolLockedNotice": "The pool is locked in for the run you're on. New killers or perks you unlock mid-run won't join until you reset, lose back to zero, or complete it.",
  "rosterLockedNotice": "The roster is locked in for the run you're on. New characters you unlock mid-run won't join until you reset, lose back to zero, or complete it.",
  "inactivityLossNotice": "An in-progress run untouched for 90 days automatically counts as a loss.",
  "difficultyAndCheckpoints": "Difficulty & Checkpoints",
  "difficultyCheckpointsDesc": "Losing after a checkpoint only falls back to that checkpoint, not to zero, though every killer cleared since then goes back into the pool.",
  "exceptionsAndClarifications": "Exceptions & Clarifications",
  "exceptions": "Exceptions",
  "clarifications": "Clarifications",
  "gameCancelledDesc": "someone left while the lobby was loading and the match never started. No reroll, replay the same build.",
  "hackersDesc": "obvious cheaters void the match. No reroll, replay the same build.",
  "crashServerFailureDesc": "not a loss. No reroll, replay the same build.",
  "noDodgingDesc": "play whatever lobby you get, no matter the items.",
  "startGame": "START GAME",
  "target": "TARGET",
  "activeGauntletTarget": "Active Gauntlet Target",
  "yourBuildForMatch": "Your build for this match",
  "pickTheseInGame": "Pick these in-game. Nothing to confirm here.",
  "noTeachablePerks": "No teachable perks on record for this character.",
  "rosterProgress": "Roster Progress",
  "rosterProgressDesc": "Complete matches with each owned character to master the roster.",
  "checkpointBanked": "Checkpoint banked",
  "checkpointLoseFallback": "Lose from here and you fall back to",
  "notToZero": ", not to zero.",
  "keepGoing": "Keep going",
  "gauntletComplete": "Gauntlet complete!",
  "startNewRun": "Start a new run",
  "gauntlet": "Gauntlet",
  "current": "Current",
  "best": "Best",
  "checkpointHeader": "Checkpoint",
  "gauntletConcept": "Gauntlet Concept",
  "youOnlyEverRun": "You only ever run",
  "trialOnlyCountsWinOn": "A trial only counts as won on",
  "trialOnlyCountsWinIf": "A trial only counts as won if you",
  "exitGatesOrHatch": ", through the exit gates or the hatch. Anything else is a loss.",
  "every10WinsBanks": "Every 10 wins banks a",
  "progressiveTierRestrictions": "Progressive Tier Restrictions",
  "historyStreakComplete": "History Streak complete!",
  "pickYourKiller": "Pick your killer",
  "acceptPick": "ACCEPT PICK",
  "killersBeaten": "Killers beaten",
  "checkpointRow": "Checkpoint row",
  "concept": "Concept",
  "historyConceptDesc1": "Your owned killers, sorted by release order, are grouped into rows of 5. Only the current row is playable. Beat every killer in it to unlock the next.",
  "historyConceptDesc2": "You start with every General perk unlocked. Beating a killer adds their own teachable perks to your pool. Addons and builds play no role here, pick a killer and play.",
  "historyConceptHint": "For the full experience try to play killers in order from the oldest to newest. 🙂",
  "modes": "Modes",
  "mediumMode": "Medium",
  "hellMode": "Hell",
  "hellModeDesc": "No checkpoints. One loss resets the whole run, every row and every unlocked perk.",
  "pageStreakConceptDesc1": "Pick a killer. Every perk that killer's teachables have unlocked for you gets split into pages. Build the strongest loadout you can from the current page, then report whether the match was a win or a loss.",
  "pageStreakConceptDesc2": "A win advances you to the next page. A loss sends you back to page 1 and starts a new attempt, current page included, though your page history is kept.",
  "pageStreakLayoutFrozenNotice": "The page layout is locked in when you start the run. New perks you unlock mid-run won't reshuffle it until you reset.",
  "progress": "Progress",
  "pageStreakCurrentDesc": "Pages cleared so far on this attempt. Drops back to 0 on a loss.",
  "pageStreakBestDesc": "The furthest page you've ever reached on this killer, across every attempt.",
  "pageStreakStartPanelDesc": "You start on page 1. A win moves you to the next page, a loss sends you back to the beginning. The page layout is frozen for the whole attempt.",
  "disabled": "Disabled",
  "winRate": "Win Rate",
  "matches": "Matches",
  "wins": "Wins",
  "losses": "Losses",
  "recentMatchHistory": "Recent Match History",
  "noMatchesLogged": "No matches logged yet. Complete your first match!",
  "autoLossInactive": "Auto-loss, run was inactive"
};
```

### src/locales/en/swf.ts
```typescript
export default {
  "engineBadge": "SWF Squad Team Engine",
  "pageTitle": "4-Player Team Loadout Planner",
  "pageSubtitle": "Coordinate survivor roles, eliminate perk redundancy, and maximize team synergy for Survive With Friends squads.",
  "shareLoadout": "Share Squad Loadout",
  "copiedToast": "Squad Loadout URL copied to clipboard! Share it with your teammates.",
  "redundancyDetector": "Team Perk Redundancy Detector",
  "optimal": "Optimal",
  "redundantPerksCount": "{count} Redundant Perk(s)",
  "duplicateWarning": "Duplicate perks detected! Stacking identical perks across teammates may decrease overall team versatility.",
  "equippedBy": "Equipped by",
  "zeroRedundancy": "Zero Team Redundancy: All 16 team perk slots are unique!",
  "survivor": "Survivor",
  "perkLoadout": "4 Perk Loadout",
  "roleChaser": "Chaser",
  "roleChaserDesc": "Leads chases, drops pallets, and draws killer aggression.",
  "roleGenRusher": "Gen Rusher",
  "roleGenRusherDesc": "Focuses on repairing generators rapidly with speed perks.",
  "roleMedic": "Medic",
  "roleMedicDesc": "Keeps team healthy and resets injuries swiftly.",
  "roleUnhooker": "Unhooker",
  "roleUnhookerDesc": "Specializes in safe unhooks and endgame rescues.",
  "slot": "Slot",
  "removePerk": "Remove Perk",
  "synergyRating": "Synergy Rating",
  "analyzing": "Analyzing...",
  "synergyLabel": "Synergy",
  "conflictLabel": "Conflict",
  "selectPerkTitle": "Select Perk for Survivor {id} (Slot {slot})",
  "choosePerkVault": "Choose from Survivor perk vault",
  "searchPlaceholder": "Search survivor perks...",
  "loadingPerks": "Loading survivor perks...",
  "noPerksFound": "No matching perks found."
};
```

### src/locales/en/user.ts
```typescript
export default {
  "profileTitle": "User Profile & Account",
  "profileSubtitle": "Manage your profile, tracked stats, character ownership, and bug reports.",
  "tabOverview": "Account Overview",
  "tabBugReports": "My Bug Reports",
  "memberSince": "Member since",
  "roleAdmin": "Administrator",
  "roleUser": "Standard Player",
  "changeAvatar": "Change Avatar",
  "removeAvatar": "Remove Avatar",
  "statusPending": "Pending",
  "statusInProgress": "In Progress",
  "statusResolved": "Resolved",
  "statusClosed": "Closed",
  "bugReportsTitle": "Your Submitted Bug Reports",
  "bugReportsSubtitle": "Track investigation status, feedback, and fixes for your tickets.",
  "reportNewBug": "Report New Bug",
  "loadingReports": "Loading your reported tickets...",
  "noReportsTitle": "No Bug Reports Submitted",
  "noReportsSubtitle": "You have not reported any glitches yet. If you spot incorrect perk numbers or map callout issues, report them!",
  "submitBugReport": "Submit a Bug Report",
  "reportedOn": "Reported on",
  "attachments": "Attachments",
  "devResponse": "Developer Response",
  "saveChanges": "Save Changes",
  "currentPassword": "Current Password",
  "newPassword": "New Password",
  "confirmPassword": "Confirm New Password",
  "passwordPlaceholder": "Leave blank to keep current",
  "confirmPasswordPlaceholder": "Repeat new password",
  "adminBadge": "Administrator badge",
  "forgotSentNotice": "If that email is registered, a password reset link is on its way.",
  "usernameOrEmailPlaceholder": "Enter username or email",
  "emailPlaceholder": "yourname@domain.com",
  "signIn": "Sign In",
  "createAccount": "Create Account",
  "sendResetLink": "Send Reset Link",
  "adminDemo": "Admin (lemon)",
  "userDemo": "User (user)",
  "verifyEmailRequired": "Verify your email to manage your character collection."
};
```

### src/locales/en/voice.ts
```typescript
export default {
  "engine": "Recognition Engine",
  "engineSubtitle": "Multi-engine architecture with automatic browser fallback",
  "engineNative": "Web Speech Framework",
  "engineNativeDesc": "Google / Apple Cloud Speech",
  "engineClient": "Client-Side Speech Model",
  "engineClientDesc": "In-Browser Local Speech AI",
  "engineClientBadge": "Local AI Model",
  "engineNativeBadge": "Google / Web Speech API",
  "browserSupported": "Supported on Google Chrome, Microsoft Edge, and Safari.",
  "browserFallbackNeeded": "Firefox and other browsers do not embed Google Speech services natively.",
  "howItWorksTitle": "Voice Recognition Engine & Compatibility",
  "howItWorksNative": "On Chrome, Edge, and Safari, speech is transcribed in real-time using the native Google / Apple Web Speech Framework with 0MB download overhead.",
  "howItWorksClient": "On Firefox, Brave, and other browsers, LemonDBD automatically downloads a lightweight client-side speech model (~39MB) into browser memory. Audio is processed 100% locally on your device with complete privacy.",
  "whyNeededTitle": "Why is a Client-Side Fallback Needed?",
  "whyNeededText": "Mozilla Firefox, Brave, and other privacy-focused browsers do not include Google's proprietary Web Speech API server connector. The client-side fallback downloads an AI speech model in the background so you can navigate maps with voice on any browser!",
  "statusIdle": "IDLE • READY",
  "statusListening": "LISTENING • SPEAK NOW",
  "statusProcessing": "PROCESSING AUDIO...",
  "statusDownloading": "DOWNLOADING MODEL",
  "statusReady": "Model Ready in Memory",
  "downloadProgress": "Downloading Model: {progress}%",
  "modelCached": "Model is stored in local CacheStorage for instant zero-lag loads.",
  "toggleModel": "Switch Engine",
  "useClientModel": "Force Local Client Model",
  "useNativeEngine": "Use Native Web Speech API",
  "privacyNotice": "Privacy Note: Local client-side model processes all voice commands entirely offline inside your browser.",
  "holdOrPress": "Hold [V] or Click Mic",
  "micBlocked": "Microphone blocked. Please grant mic permissions."
};
```

# =====================================================================
# SECTION 2: SOURCE CODE TARGETS REQUIRING TRANSLATION
# =====================================================================

## Group 1: App Pages & Route Layouts

### src/app/[locale]/builds/page.tsx
- Flagged line numbers: `[70]`

#### `src/app/[locale]/builds/page.tsx:67-73`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }
```

### src/app/[locale]/characters/guesser/page.tsx
- Flagged line numbers: `[657, 772, 837, 902, 967, 1032, 1095, 1138, 1149, 1205, 1264, 1274, 1417]`

#### `src/app/[locale]/characters/guesser/page.tsx:654-660`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }
```

#### `src/app/[locale]/characters/guesser/page.tsx:769-775`
```tsx
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                      Identity Mode
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
```

#### `src/app/[locale]/characters/guesser/page.tsx:834-840`
```tsx
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                      Redacted Mode
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
```

#### `src/app/[locale]/characters/guesser/page.tsx:899-905`
```tsx
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      Visual Choice
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
```

#### `src/app/[locale]/characters/guesser/page.tsx:964-970`
```tsx
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                      Distortion Mode
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
```

#### `src/app/[locale]/characters/guesser/page.tsx:1029-1035`
```tsx
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/20 uppercase tracking-wider">
                      Community Jokes
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
```

#### `src/app/[locale]/characters/guesser/page.tsx:1092-1098`
```tsx
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-500 border border-slate-700 uppercase tracking-wider">
                        Realms & Seeds
                      </span>
                      <span className="px-2 py-0.5 rounded bg-violet-600/10 text-[9px] font-bold text-violet-400 border border-violet-500/20">
                        {dict.guesser?.wip || 'WIP'}
```

#### `src/app/[locale]/characters/guesser/page.tsx:1135-1141`
```tsx
              </div>

              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                The entity is currently reconstructing mapping protocols for seeds, jungle gym vaults, loops, and totem spawning tiles. This module will allow players to guess spawn locations and structures in real-time. Check back later!
              </p>

              <div className="w-full bg-slate-950/80 rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
```

#### `src/app/[locale]/characters/guesser/page.tsx:1146-1152`
```tsx
                onClick={() => setActiveMode('dashboard')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700/80 hover:bg-slate-700 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
```

#### `src/app/[locale]/characters/guesser/page.tsx:1202-1208`
```tsx
                          <Sparkles className="h-8 w-8 text-pink-500 dark:text-pink-400 animate-pulse relative z-10" />
                        </div>
                        <span className="text-[11px] font-semibold text-pink-700 dark:text-pink-400 uppercase tracking-wider bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">
                          Meme Mode
                        </span>
                      </div>
                    )}
```

#### `src/app/[locale]/characters/guesser/page.tsx:1261-1267`
```tsx
                        <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
                          {currentQuestion.difficultyEffects.grayscale && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                              Grayscale
                            </span>
                          )}
                          {currentQuestion.difficultyEffects.rotate > 0 && (
```

#### `src/app/[locale]/characters/guesser/page.tsx:1271-1277`
```tsx
                          )}
                          {currentQuestion.difficultyEffects.scale > 1 && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                              Cropped Zoom
                            </span>
                          )}
                        </div>
```

#### `src/app/[locale]/characters/guesser/page.tsx:1414-1420`
```tsx
                    >
                      <span>{dict.guesser?.next || 'Next Question'}</span>
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-black bg-violet-700/60 rounded text-violet-100 uppercase">
                        Space
                      </kbd>
                    </button>
                  </div>
```

### src/app/[locale]/characters/page.tsx
- Flagged line numbers: `[66]`

#### `src/app/[locale]/characters/page.tsx:63-69`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-400 flex items-center justify-center font-mono text-xs">
        Loading Characters Hub...
      </div>
    );
  }
```

### src/app/[locale]/custom-perks/page.tsx
- Flagged line numbers: `[70]`

#### `src/app/[locale]/custom-perks/page.tsx:67-73`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono">
        Loading...
      </div>
    );
  }
```

### src/app/[locale]/draft/page.tsx
- Flagged line numbers: `[77]`

#### `src/app/[locale]/draft/page.tsx:74-80`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }
```

### src/app/[locale]/killer-calculator/page.tsx
- Flagged line numbers: `[70]`

#### `src/app/[locale]/killer-calculator/page.tsx:67-73`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }
```

### src/app/[locale]/maps/page.tsx
- Flagged line numbers: `[55, 95, 161]`

#### `src/app/[locale]/maps/page.tsx:52-58`
```tsx
  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    document.title = 'LemonDBD - Tactical Map Command Explorer';
    getDictionary(locale)
      .then((d) => setDict(d as PerkDictionary))
      .catch((err: unknown) => console.error('Failed to load maps dictionary:', err));
```

#### `src/app/[locale]/maps/page.tsx:92-98`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
        Initializing Tactical Map Command...
      </div>
    );
  }
```

#### `src/app/[locale]/maps/page.tsx:158-164`
```tsx
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
          Loading Tactical Maps...
        </div>
      }
    >
```

### src/app/[locale]/page.tsx
- Flagged line numbers: `[92]`

#### `src/app/[locale]/page.tsx:89-95`
```tsx
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading LemonDBD...
        </div>
      }
    >
```

### src/app/[locale]/perks/page.tsx
- Flagged line numbers: `[465]`

#### `src/app/[locale]/perks/page.tsx:462-468`
```tsx
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading...
        </div>
      }
    >
```

### src/app/[locale]/quests/page.tsx
- Flagged line numbers: `[43, 111, 162, 165, 169, 231, 242, 261]`

#### `src/app/[locale]/quests/page.tsx:40-46`
```tsx
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - Quests & Trials';
    getDictionary(locale).then(setDict);
    loadQuests();
  }, [locale]);
```

#### `src/app/[locale]/quests/page.tsx:108-114`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono">
        Loading Quests...
      </div>
    );
  }
```

#### `src/app/[locale]/quests/page.tsx:159-172`
```tsx
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight sm:text-3xl">
                      Trial Quests & Milestones
                    </h1>
                    <span className="rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                      XP System
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                    Complete daily and weekly trials to earn XP, level up your status, and unlock achievements.
                  </p>
                </div>
              </div>
```

#### `src/app/[locale]/quests/page.tsx:228-234`
```tsx
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Daily Quests
          </button>
          <button
            onClick={() => setFilterCategory('weekly')}
```

#### `src/app/[locale]/quests/page.tsx:239-245`
```tsx
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
            Weekly Quests
          </button>
        </div>

```

#### `src/app/[locale]/quests/page.tsx:258-264`
```tsx
                {dict?.empty?.title || 'No Quests Found'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                No quests available in this category right now. Check back soon for new trial objectives!
              </p>
            </div>
          ) : (
```

### src/app/[locale]/reset-password/page.tsx
- Flagged line numbers: `[36]`

#### `src/app/[locale]/reset-password/page.tsx:33-39`
```tsx
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'LemonDBD - Reset Password';
    getDictionary(locale).then(setDict);
  }, [locale]);

```

### src/app/[locale]/smash-or-pass/page.tsx
- Flagged line numbers: `[32, 65]`

#### `src/app/[locale]/smash-or-pass/page.tsx:29-35`
```tsx
  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    document.title = 'LemonDBD - Smash or Pass | Dead by Daylight Romance';
    getDictionary(locale).then(setDict);
  }, [locale]);

```

#### `src/app/[locale]/smash-or-pass/page.tsx:62-68`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-400 flex items-center justify-center font-mono text-xs">
        Loading Smash or Pass...
      </div>
    );
  }
```

### src/app/[locale]/streaks/layout.tsx
- Flagged line numbers: `[36, 85, 138, 147, 156, 159, 168]`

#### `src/app/[locale]/streaks/layout.tsx:33-39`
```tsx
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - Challenges';
    getDictionary(locale)
      .then(setDict)
      .catch((err) => console.error('Failed to load streaks dictionary:', err));
```

#### `src/app/[locale]/streaks/layout.tsx:82-88`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }
```

#### `src/app/[locale]/streaks/layout.tsx:135-141`
```tsx
              <MailWarning className="h-5 w-5 text-amber-500/70" />
            </div>
            <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
              Verify your email to track challenges
            </h2>
            <button
              onClick={() => {
```

#### `src/app/[locale]/streaks/layout.tsx:144-150`
```tsx
              }}
              className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-900/30 hover:bg-amber-500 transition-colors cursor-pointer"
            >
              Verify email
            </button>
          </div>
        ) : (
```

#### `src/app/[locale]/streaks/layout.tsx:153-162`
```tsx
              <Lock className="h-5 w-5 text-orange-500/70" />
            </div>
            <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
              Log in to track your challenges
            </h2>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
              Challenges use the killers and perks you own, so we need to know who you are first.
            </p>
            <button
              onClick={() => {
```

#### `src/app/[locale]/streaks/layout.tsx:165-171`
```tsx
              }}
              className="mt-5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-900/30 hover:bg-orange-500 transition-colors"
            >
              Log in
            </button>
          </div>
        )}
```

### src/app/[locale]/swf/page.tsx
- Flagged line numbers: `[30, 68]`

#### `src/app/[locale]/swf/page.tsx:27-33`
```tsx
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - SWF Team Planner';
    getDictionary(locale).then(setDict);
  }, [locale]);

```

#### `src/app/[locale]/swf/page.tsx:65-71`
```tsx
  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading SWF Planner...
      </div>
    );
  }
```

### src/app/[locale]/user/page.tsx
- Flagged line numbers: `[55, 191, 194, 209, 339, 402]`

#### `src/app/[locale]/user/page.tsx:52-58`
```tsx
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    document.title = 'LemonDBD - User Profile';
    getDictionary(currentLocale).then(setDict);
  }, [currentLocale]);

```

#### `src/app/[locale]/user/page.tsx:188-197`
```tsx
            <LemonIcon className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider font-mono text-slate-100">
            Authentication Required
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please sign in or create an account to view your LemonDBD profile, manage your teachables, and track game challenges.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button
```

#### `src/app/[locale]/user/page.tsx:206-212`
```tsx
              href={`/${currentLocale}`}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors py-1"
            >
              Return to Home
            </Link>
          </div>
        </div>
```

#### `src/app/[locale]/user/page.tsx:336-342`
```tsx
                </div>

                <p className="text-xs text-slate-400 pt-0.5">
                  Active Player & LemonDBD Community Member
                </p>

                {user.role === 'admin' && (
```

#### `src/app/[locale]/user/page.tsx:399-405`
```tsx

                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl shadow-xl space-y-4 w-full">
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-100 pb-2 border-b border-slate-800">
                    Quick Shortcuts
                  </h2>

                  <div className="space-y-2">
```

