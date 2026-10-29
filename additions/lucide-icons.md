# Current Installments of Lucide Icons in LemonDBD Frontend

> **WARNING TO ALL AI ASSISTANTS (Claude, Gemini, ChatGPT, etc.):**
> **DO NOT INTRODUCE NEW LUCIDE ICONS TO THIS REPOSITORY.**
> We are actively phasing out and quarantining `lucide-react`.
> Prefer custom Dead by Daylight SVG icons located in `src/components/icons/DbdIcons.tsx`
> or dedicated feature icons (e.g. `components/icons/smash/`).
> Any new Lucide icon imports will fail the build guard and CI checks.

---

## Executive Summary

- **Total Files with Lucide Icons**: 216
- **Total Import Statements**: 218
- **Total Unique Lucide Icons Used**: 168
- **Total Icon Usages across codebase**: 600

---

## Frequency Ranking (All Unique Icons)

| Icon Name | Occurrences | Sample Locations |
| :--- | :---: | :--- |
| `Check` | 38 | `src/components/ChaosWheelModal.tsx:5`, `src/components/character-detail/components/CategoryPicker.tsx:5`, `src/components/characters/CharacterOwnershipOverlay.tsx:4` *(+35 more)* |
| `X` | 34 | `src/components/character-detail/modals/Model3DModal.tsx:3`, `src/components/characters/hub/CharactersToolbar.tsx:4`, `src/components/common/Alert.tsx:5` *(+31 more)* |
| `Plus` | 19 | `src/components/changelog/ChangelogEditorModal.tsx:5`, `src/components/changelog/WhatsNewLauncher.tsx:5`, `src/components/generator/modes/slot-machine/SlotReelRowMobile.tsx:5` *(+16 more)* |
| `RotateCcw` | 17 | `src/components/admin/AdminUserChallengesModal.tsx:7`, `src/components/generator/GeneratorPage.tsx:6`, `src/components/generator/Toolbar.tsx:5` *(+14 more)* |
| `Trash2` | 17 | `src/components/admin/AdminToolsSection.tsx:8`, `src/components/admin/AdminUsersSection.tsx:7`, `src/components/admin/BugReportDetail.tsx:7` *(+14 more)* |
| `ChevronDown` | 15 | `src/components/admin/AdminSectionTabs.tsx:7`, `src/components/character-detail/components/CategoryPicker.tsx:5`, `src/components/common/AccordionSection.tsx:10` *(+12 more)* |
| `Flame` | 15 | `src/components/character-detail/KillerDetailView.tsx:6`, `src/components/character-detail/modals/KillerPowerModal.tsx:3`, `src/components/minigames/ChallengeRunner.tsx:8` *(+12 more)* |
| `CheckCircle2` | 13 | `src/components/admin/AdminToast.tsx:7`, `src/components/auth/ResetPasswordClient.tsx:10`, `src/components/common/ReportContentModal.tsx:5` *(+10 more)* |
| `ShieldCheck` | 11 | `src/components/about/AboutClient.tsx:4`, `src/components/admin/AdminSettingsSection.tsx:10`, `src/components/admin/AdminUsersSection.tsx:7` *(+8 more)* |
| `AlertCircle` | 10 | `src/components/auth/ResetPasswordClient.tsx:10`, `src/components/AuthModal.tsx:12`, `src/components/common/FormValidation.tsx:16` *(+7 more)* |
| `Download` | 10 | `src/components/admin/AdminToolsSection.tsx:8`, `src/components/admin/AdminUsersSection.tsx:7`, `src/components/common/ExportModal.tsx:5` *(+7 more)* |
| `TriangleAlert` | 10 | `src/components/admin/AdminToast.tsx:7`, `src/components/common/Alert.tsx:5`, `src/components/common/ExportModal.tsx:5` *(+7 more)* |
| `Upload` | 10 | `src/components/admin/AdminToolsSection.tsx:8`, `src/components/common/ImageUploadDropzone.tsx:5`, `src/components/common/ImportModal.tsx:5` *(+7 more)* |
| `User` | 9 | `src/components/character-detail/components/CharacterHeroAvatar.tsx:5`, `src/components/CharactersHub.tsx:7`, `src/components/onboarding/wizard/OnboardingAuthRequired.tsx:5` *(+6 more)* |
| `BookOpen` | 8 | `src/components/character-detail/KillerDetailView.tsx:6`, `src/components/character-detail/modals/KillerPowerModal.tsx:3`, `src/components/character-detail/SurvivorDetailView.tsx:6` *(+5 more)* |
| `Info` | 8 | `src/components/admin/VectorMapTestModal.tsx:5`, `src/components/common/ImportModal.tsx:5`, `src/components/generator/Toolbar.tsx:5` *(+5 more)* |
| `ShieldAlert` | 8 | `src/components/admin/ContentReportDetail.tsx:4`, `src/components/auth/AuthModalParts.tsx:8`, `src/components/character-detail/components/SurvivorEquipmentSection.tsx:6` *(+5 more)* |
| `Trophy` | 8 | `src/components/admin/AdminUsersSection.tsx:7`, `src/components/minigames/ChallengeRunner.tsx:8`, `src/components/minigames/hubModes.ts:5` *(+5 more)* |
| `ArrowRight` | 7 | `src/components/character-detail/components/CharacterTopBar.tsx:4`, `src/components/common/LinkPill.tsx:10`, `src/components/landing/HomePage.tsx:10` *(+4 more)* |
| `Compass` | 7 | `src/components/admin/VectorMapTestModal.tsx:5`, `src/components/maps/FullscreenMapEngine.tsx:5`, `src/components/maps/MapExplorer.tsx:8` *(+4 more)* |
| `ImageOff` | 7 | `src/components/generator/shared/PerkSlot.tsx:5`, `src/components/maps/FullscreenMapEngine.tsx:5`, `src/components/maps/MapCard.tsx:5` *(+4 more)* |
| `Eye` | 6 | `src/components/admin/SandboxedContentPreview.tsx:4`, `src/components/minigames/guessers/PerkIconGuesser.tsx:6`, `src/components/minigames/guessers/RealmGuesser.tsx:6` *(+3 more)* |
| `EyeOff` | 6 | `src/components/admin/SandboxedContentPreview.tsx:4`, `src/components/character-detail/components/OfferingsSection.tsx:5`, `src/components/generator/shared/PerkSlot.tsx:5` *(+3 more)* |
| `LucideIcon` | 6 | `src/components/admin/AdminSettingsSection.tsx:10`, `src/components/maps/voice/voiceStatusConfig.ts:2`, `src/components/minigames/MinigamesHubCards.tsx:8` *(+3 more)* |
| `Search` | 6 | `src/components/characters/hub/CharactersToolbar.tsx:4`, `src/components/common/Field.tsx:5`, `src/components/maps/MapsClient.tsx:7` *(+3 more)* |
| `AlertTriangle` | 5 | `src/components/DisabledBadge.tsx:5`, `src/components/generator/GeneratorPage.tsx:6`, `src/components/scraper-config/StatusBanner.tsx:3` *(+2 more)* |
| `Ban` | 5 | `src/components/admin/AdminAvailabilitySection.tsx:8`, `src/components/admin/ContentReportDetail.tsx:4`, `src/components/generator/modes/slot-machine/SlotReelColumnDesktop.tsx:5` *(+2 more)* |
| `Clock` | 5 | `src/components/admin/UserStandingBadge.tsx:7`, `src/components/moderation/AccountBlockedNotice.tsx:9`, `src/components/streaks/RulesModalSections.tsx:5` *(+2 more)* |
| `Copy` | 5 | `src/components/common/ContactLinks.tsx:8`, `src/components/common/ExportModal.tsx:5`, `src/components/smash-or-pass/persona/PersonaShareView.tsx:3` *(+2 more)* |
| `Gamepad2` | 5 | `src/components/minigames/MinigamesHub.tsx:14`, `src/components/Sidebar.tsx:8`, `src/components/smash-or-pass/hub/HowToPlayModal.tsx:3` *(+2 more)* |
| `Home` | 5 | `src/components/layout/ErrorPage.tsx:11`, `src/components/maps/FullscreenMapEngine.tsx:5`, `src/components/maps/MapLandmarks.tsx:10` *(+2 more)* |
| `Image` | 5 | `src/components/admin/AdminReportsSection.tsx:8`, `src/components/sidebar/BugReportModal.tsx:11`, `src/components/smash-or-pass/creator/CoverImageCropModal.tsx:6` *(+2 more)* |
| `Layers` | 5 | `src/components/admin/VectorMapTestModal.tsx:5`, `src/components/character-detail/components/OfferingsSection.tsx:5`, `src/components/minigames/hubModes.ts:5` *(+2 more)* |
| `Mail` | 5 | `src/components/admin/AdminToolsSection.tsx:8`, `src/components/auth/AuthModalParts.tsx:8`, `src/components/common/ContactLinks.tsx:8` *(+2 more)* |
| `Pencil` | 5 | `src/components/admin/AdminUsersSection.tsx:7`, `src/components/changelog/ChangelogPostItem.tsx:5`, `src/components/smash-or-pass/creator/EntityEditorParts.tsx:4` *(+2 more)* |
| `RefreshCw` | 5 | `src/components/admin/AdminHeader.tsx:6`, `src/components/admin/AdminToolsSection.tsx:8`, `src/components/changelog/ChangelogPostItem.tsx:5` *(+2 more)* |
| `SearchX` | 5 | `src/components/perks/PerksClient.tsx:21`, `src/components/smash-or-pass/creator/SmashRosterCreator.tsx:18`, `src/components/tier-lists/creator/TierListCreator.tsx:6` *(+2 more)* |
| `Share2` | 5 | `src/components/minigames/creator/MinigameCreator.tsx:12`, `src/components/minigames/MinigamesHubCards.tsx:9`, `src/components/minigames/VictoryModal.tsx:7` *(+2 more)* |
| `Skull` | 5 | `src/components/changelog/WhatsNewLauncher.tsx:5`, `src/components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx:6`, `src/components/smash-or-pass/hub/CalmVoteMark.tsx:5` *(+2 more)* |
| `Users` | 5 | `src/components/admin/AdminSectionTabs.tsx:7`, `src/components/scraper-config/scraperTargets.ts:8`, `src/components/smash-or-pass/SmashLeaderboardModal.tsx:5` *(+2 more)* |
| `Volume2` | 5 | `src/components/generator/Toolbar.tsx:5`, `src/components/maps/voice/VoiceBannerHeader.tsx:6`, `src/components/maps/voice/voiceStatusConfig.ts:3` *(+2 more)* |
| `ArrowLeft` | 4 | `src/components/character-detail/components/CharacterTopBar.tsx:4`, `src/components/smash-or-pass/persona/PersonaShareView.tsx:3`, `src/components/smash-or-pass/RomancePersonaModal.tsx:6` *(+1 more)* |
| `Calendar` | 4 | `src/components/character-detail/KillerDetailView.tsx:6`, `src/components/character-detail/SurvivorDetailView.tsx:6`, `src/components/minigames/hubModes.ts:5` *(+1 more)* |
| `ChevronLeft` | 4 | `src/components/character-detail/CharacterDetailClient.tsx:7`, `src/components/common/Pagination.tsx:5`, `src/components/Sidebar.tsx:8` *(+1 more)* |
| `ChevronRight` | 4 | `src/components/common/Pagination.tsx:5`, `src/components/Sidebar.tsx:8`, `src/components/tier-lists/TierListCards.tsx:6` *(+1 more)* |
| `ExternalLink` | 4 | `src/components/admin/AdminToolsSection.tsx:8`, `src/components/common/ImageLinkTile.tsx:5`, `src/components/common/LinkPill.tsx:10` *(+1 more)* |
| `Flag` | 4 | `src/components/admin/AdminSectionTabs.tsx:7`, `src/components/minigames/PlayTrialClient.tsx:26`, `src/components/smash-or-pass/roster-select/RosterPickerFooter.tsx:10` *(+1 more)* |
| `Maximize2` | 4 | `src/components/maps/FullscreenMapEngine.tsx:5`, `src/components/maps/MapExplorer.tsx:8`, `src/components/tier-lists/TierListScaleControl.tsx:5` *(+1 more)* |
| `Play` | 4 | `src/components/admin/AdminToolsSection.tsx:8`, `src/components/minigames/creator/MinigameCreator.tsx:12`, `src/components/minigames/guessers/AudioGuesser.tsx:9` *(+1 more)* |
| `Shield` | 4 | `src/components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx:6`, `src/components/smash-or-pass/creator/RosterTaxonomyBlock.tsx:5`, `src/components/streaks/gauntlet/boostIcons.ts:2` *(+1 more)* |
| `Building2` | 3 | `src/components/maps/FullscreenMapEngine.tsx:5`, `src/components/maps/MapLandmarks.tsx:10`, `src/components/maps/MapLegend.tsx:4` |
| `CheckCircle` | 3 | `src/components/admin/ContentReportDetail.tsx:4`, `src/components/admin/UserStandingBadge.tsx:7`, `src/components/user/UserBugReportsList.tsx:7` |
| `Coins` | 3 | `src/components/character-detail/components/OfferingsSection.tsx:5`, `src/components/streaks/gauntlet/LemonTokenPanel.tsx:5`, `src/components/streaks/gauntlet/TokenRollModal.tsx:5` |
| `FileJson` | 3 | `src/components/admin/SandboxedContentPreview.tsx:4`, `src/components/scraper-config/ImportTab.tsx:4`, `src/components/tier-lists/TierListHub.tsx:8` |
| `Gauge` | 3 | `src/components/admin/AdminSettingsSection.tsx:10`, `src/components/character-detail/components/KillerCombatStats.tsx:3`, `src/components/maps/VoiceEngineInfoModal.tsx:7` |
| `Globe` | 3 | `src/components/maps/voice/VoiceBannerHeader.tsx:6`, `src/components/maps/VoiceEngineInfoModal.tsx:7`, `src/components/scraper-config/scraperTargets.ts:8` |
| `HelpCircle` | 3 | `src/components/PerkCard.tsx:8`, `src/components/streaks/gauntlet/ActiveTargetStageParts.tsx:7`, `src/components/user/UserBugReportsList.tsx:7` |
| `History` | 3 | `src/components/smash-or-pass/creator/SmashRosterCreator.tsx:18`, `src/components/streaks/ChallengePanel.tsx:5`, `src/components/tier-lists/creator/TierListCreator.tsx:6` |
| `ImagePlus` | 3 | `src/components/common/ImageUploadDropzone.tsx:5`, `src/components/common/ScoreboardCheckModal.tsx:10`, `src/components/tier-lists/creator/ItemSources.tsx:6` |
| `Link2` | 3 | `src/components/admin/AdminSettingsSection.tsx:10`, `src/components/common/ExportModal.tsx:5`, `src/components/common/RichTextEditor.tsx:12` |
| `MailWarning` | 3 | `src/components/auth/AuthModalParts.tsx:8`, `src/components/characters/hub/VerificationNotice.tsx:4`, `src/components/streaks/StreaksLayoutShell.tsx:7` |
| `MapPin` | 3 | `src/components/admin/AdminToolsSection.tsx:8`, `src/components/minigames/guessers/RealmGuesser.tsx:6`, `src/components/minigames/hubModes.ts:5` |
| `ScrollText` | 3 | `src/components/about/AboutClient.tsx:4`, `src/components/admin/AdminAuditSection.tsx:6`, `src/components/admin/AdminSectionTabs.tsx:7` |
| `UserPlus` | 3 | `src/components/admin/AdminUserFormModal.tsx:8`, `src/components/admin/AdminUsersSection.tsx:7`, `src/components/auth/AuthModalParts.tsx:8` |
| `VolumeX` | 3 | `src/components/generator/Toolbar.tsx:5`, `src/components/maps/voice/VoiceBannerHeader.tsx:6`, `src/components/minigames/guessers/AudioGuesser.tsx:9` |
| `XCircle` | 3 | `src/components/admin/UserStandingBadge.tsx:7`, `src/components/minigames/ChallengeRunner.tsx:8`, `src/components/user/UserBugReportsList.tsx:7` |
| `Zap` | 3 | `src/components/minigames/hubModes.ts:5`, `src/components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx:6`, `src/components/smash-or-pass/SmashAnimations.tsx:6` |
| `ZoomIn` | 3 | `src/components/character-detail/components/CharacterHeroAvatar.tsx:5`, `src/components/maps/FullscreenMapEngine.tsx:5`, `src/components/smash-or-pass/creator/CoverImageCropModal.tsx:6` |
| `ArrowDownToLine` | 2 | `src/components/tier-lists/TierPool.tsx:7`, `src/components/tier-lists/TierRow.tsx:7` |
| `ArrowUp` | 2 | `src/components/minigames/guessers/ClassicCharacterGuesser.tsx:5`, `src/components/smash-or-pass/TactileKeycaps.tsx:5` |
| `ArrowUpDown` | 2 | `src/components/character-detail/components/KillerCombatStats.tsx:3`, `src/components/smash-or-pass/SmashLeaderboardModal.tsx:5` |
| `Bookmark` | 2 | `src/components/character-detail/KillerDetailView.tsx:6`, `src/components/character-detail/SurvivorDetailView.tsx:6` |
| `Ellipsis` | 2 | `src/components/common/ActionMenu.tsx:6`, `src/components/tier-lists/TierListEditor.tsx:7` |
| `GripVertical` | 2 | `src/components/changelog/ChangelogPostItem.tsx:5`, `src/components/tier-lists/creator/LadderEditor.tsx:5` |
| `Laptop` | 2 | `src/components/maps/VoiceEngineInfoModal.tsx:7`, `src/components/sidebar/SidebarBottomControls.tsx:8` |
| `LayoutList` | 2 | `src/components/Sidebar.tsx:8`, `src/components/tier-lists/TierListHub.tsx:8` |
| `ListOrdered` | 2 | `src/components/common/RichTextEditor.tsx:12`, `src/components/tier-lists/creator/LadderEditor.tsx:5` |
| `LogIn` | 2 | `src/components/auth/AuthModalParts.tsx:8`, `src/components/sidebar/SidebarUserSection.tsx:8` |
| `LogOut` | 2 | `src/components/sidebar/SidebarUserSection.tsx:8`, `src/components/user/SignOutEverywhereSection.tsx:8` |
| `Map` | 2 | `src/components/character-detail/components/OfferingsSection.tsx:5`, `src/components/character-detail/components/SurvivorEquipmentSection.tsx:6` |
| `Megaphone` | 2 | `src/components/admin/AdminSettingsSection.tsx:10`, `src/components/changelog/WhatsNewLauncher.tsx:5` |
| `Mic` | 2 | `src/components/maps/MapsClient.tsx:7`, `src/components/maps/voice/voiceStatusConfig.ts:3` |
| `Quote` | 2 | `src/components/minigames/guessers/QuoteLoreGuesser.tsx:6`, `src/components/smash-or-pass/CharacterStatsModal.tsx:5` |
| `Save` | 2 | `src/components/admin/AdminUserFormModal.tsx:8`, `src/components/minigames/creator/MinigameCreator.tsx:12` |
| `Settings` | 2 | `src/components/scraper-config/scraperTargets.ts:8`, `src/components/Sidebar.tsx:8` |
| `Snowflake` | 2 | `src/components/streaks/FreezeBadge.tsx:5`, `src/components/streaks/RulesModalSections.tsx:5` |
| `Square` | 2 | `src/components/scraper-config/ExportTab.tsx:4`, `src/components/scraper-config/PurgeTab.tsx:4` |
| `Swords` | 2 | `src/components/streaks/ChallengeCompletionHistoryDrawer.tsx:5`, `src/components/streaks/gauntlet/GauntletModeModal.tsx:7` |
| `ThumbsDown` | 2 | `src/components/smash-or-pass/CharacterStatsModal.tsx:5`, `src/components/smash-or-pass/SmashLeaderboardParts.tsx:4` |
| `UserSearch` | 2 | `src/components/admin/BugReportDetail.tsx:7`, `src/components/admin/ContentReportDetail.tsx:4` |
| `UserX` | 2 | `src/components/admin/ContentReportDetail.tsx:4`, `src/components/character-detail/CharacterDetailClient.tsx:7` |
| `Wrench` | 2 | `src/components/admin/AdminSectionTabs.tsx:7`, `src/components/character-detail/components/SurvivorEquipmentSection.tsx:6` |
| `ZoomOut` | 2 | `src/components/maps/FullscreenMapEngine.tsx:5`, `src/components/smash-or-pass/creator/CoverImageCropModal.tsx:6` |
| `Activity` | 1 | `src/components/character-detail/components/KillerCombatStats.tsx:3` |
| `AlignCenter` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `AlignJustify` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `AlignLeft` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `AlignRight` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `ArrowDown` | 1 | `src/components/minigames/guessers/ClassicCharacterGuesser.tsx:5` |
| `ArrowDownAZ` | 1 | `src/components/maps/MapExplorer.tsx:8` |
| `ArrowDownUp` | 1 | `src/components/perks/PerkSortMenu.tsx:6` |
| `BarChart2` | 1 | `src/components/streaks/ChallengePanel.tsx:5` |
| `Bold` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `Box` | 1 | `src/components/character-detail/components/OfferingsSection.tsx:5` |
| `Brain` | 1 | `src/components/maps/voice/VoiceBannerHeader.tsx:6` |
| `Camera` | 1 | `src/components/user/CampfireHeader.tsx:7` |
| `CheckSquare` | 1 | `src/components/scraper-config/ExportTab.tsx:4` |
| `ChevronsLeft` | 1 | `src/components/common/Pagination.tsx:5` |
| `ChevronsRight` | 1 | `src/components/common/Pagination.tsx:5` |
| `ChevronUp` | 1 | `src/components/minigames/creator/RoundEditorCard.tsx:9` |
| `Circle` | 1 | `src/components/streaks/chaos/ChaosPerkPoolModal.tsx:7` |
| `CircleAlert` | 1 | `src/components/common/ImportModal.tsx:5` |
| `CircleSlash` | 1 | `src/components/common/ScoreboardCheckModal.tsx:10` |
| `Citrus` | 1 | `src/components/sidebar/SidebarBottomControls.tsx:8` |
| `Clapperboard` | 1 | `src/components/streaks/ChallengePanel.tsx:5` |
| `ClipboardPaste` | 1 | `src/components/tier-lists/creator/ItemSources.tsx:6` |
| `Cloud` | 1 | `src/components/character-detail/components/SurvivorEquipmentSection.tsx:6` |
| `Cpu` | 1 | `src/components/maps/VoiceEngineInfoModal.tsx:7` |
| `Crop` | 1 | `src/components/smash-or-pass/creator/RosterBasicsSection.tsx:4` |
| `Crosshair` | 1 | `src/components/streaks/gauntlet/boostIcons.ts:2` |
| `Database` | 1 | `src/components/admin/AdminToolsSection.tsx:8` |
| `Disc3` | 1 | `src/components/minigames/guessers/AudioGuesser.tsx:9` |
| `DoorOpen` | 1 | `src/components/admin/AdminSettingsSection.tsx:10` |
| `DownloadCloud` | 1 | `src/components/maps/VoiceEngineInfoModal.tsx:7` |
| `Eraser` | 1 | `src/components/tier-lists/TierRow.tsx:7` |
| `FileText` | 1 | `src/components/about/AboutClient.tsx:4` |
| `Flashlight` | 1 | `src/components/character-detail/components/SurvivorEquipmentSection.tsx:6` |
| `Gavel` | 1 | `src/components/admin/AdminUsersSection.tsx:7` |
| `Heading3` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `Highlighter` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `Hourglass` | 1 | `src/components/admin/AdminSettingsSection.tsx:10` |
| `Inbox` | 1 | `src/components/admin/AdminQueue.tsx:8` |
| `Infinity` | 1 | `src/components/streaks/id-please/IdPleaseProgress.tsx:5` |
| `Italic` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `Key` | 1 | `src/components/character-detail/components/SurvivorEquipmentSection.tsx:6` |
| `KeyRound` | 1 | `src/components/admin/AdminSettingsSection.tsx:10` |
| `Library` | 1 | `src/components/Sidebar.tsx:8` |
| `LineChart` | 1 | `src/components/admin/AdminToolsSection.tsx:8` |
| `Link` | 1 | `src/components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx:6` |
| `List` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `Menu` | 1 | `src/components/Sidebar.tsx:8` |
| `MessageSquare` | 1 | `src/components/admin/AdminToolsSection.tsx:8` |
| `MicOff` | 1 | `src/components/maps/voice/voiceStatusConfig.ts:3` |
| `Minus` | 1 | `src/components/tier-lists/TierListScaleControl.tsx:5` |
| `Moon` | 1 | `src/components/sidebar/SidebarBottomControls.tsx:8` |
| `MousePointerClick` | 1 | `src/components/tier-lists/TierListEditor.tsx:7` |
| `OctagonAlert` | 1 | `src/components/layout/SiteBanner.tsx:8` |
| `Package` | 1 | `src/components/minigames/guessers/AddonGuesser.tsx:5` |
| `Palette` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `Pause` | 1 | `src/components/minigames/guessers/AudioGuesser.tsx:9` |
| `Percent` | 1 | `src/components/streaks/StreakStatsDrawer.tsx:5` |
| `Pipette` | 1 | `src/components/tier-lists/TierColorPicker.tsx:7` |
| `Plug` | 1 | `src/components/admin/AdminSettingsSection.tsx:10` |
| `Power` | 1 | `src/components/admin/AdminSectionTabs.tsx:7` |
| `Radio` | 1 | `src/components/character-detail/components/KillerCombatStats.tsx:3` |
| `Repeat` | 1 | `src/components/generator/Toolbar.tsx:5` |
| `Scale` | 1 | `src/components/admin/AdminSettingsSection.tsx:10` |
| `ScanText` | 1 | `src/components/admin/AdminToolsSection.tsx:8` |
| `Send` | 1 | `src/components/admin/BugReportDetail.tsx:7` |
| `Settings2` | 1 | `src/components/admin/AdminSectionTabs.tsx:7` |
| `ShieldOff` | 1 | `src/components/admin/AdminUsersSection.tsx:7` |
| `Shuffle` | 1 | `src/components/streaks/gauntlet/boostIcons.ts:2` |
| `SlidersHorizontal` | 1 | `src/components/PerkFilters.tsx:9` |
| `Star` | 1 | `src/components/streaks/gauntlet/ActiveTargetStageParts.tsx:7` |
| `Sun` | 1 | `src/components/sidebar/SidebarBottomControls.tsx:8` |
| `Underline` | 1 | `src/components/common/RichTextEditor.tsx:12` |
| `UserCheck` | 1 | `src/components/sidebar/BugReportModal.tsx:11` |
| `UsersRound` | 1 | `src/components/streaks/gauntlet/GauntletModeModal.tsx:7` |

---

## Complete Installment Manifest by Section

### Admin Components (17 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/admin/AdminAuditSection.tsx` | 6 | `ScrollText` |
| `src/components/admin/AdminAvailabilitySection.tsx` | 8 | `Ban` |
| `src/components/admin/AdminHeader.tsx` | 6 | `RefreshCw` |
| `src/components/admin/AdminQueue.tsx` | 8 | `Inbox` |
| `src/components/admin/AdminReportsSection.tsx` | 8 | `Image` |
| `src/components/admin/AdminSectionTabs.tsx` | 7 | `ChevronDown`, `Flag`, `Power`, `ScrollText`, `Settings2`, `Users`, `Wrench` |
| `src/components/admin/AdminSettingsSection.tsx` | 10 | `DoorOpen`, `Gauge`, `Hourglass`, `KeyRound`, `Link2`, `Megaphone`, `Plug`, `Scale`, `ShieldCheck`, `LucideIcon` |
| `src/components/admin/AdminToast.tsx` | 7 | `CheckCircle2`, `TriangleAlert` |
| `src/components/admin/AdminToolsSection.tsx` | 8 | `Database`, `Download`, `ExternalLink`, `LineChart`, `Mail`, `MapPin`, `MessageSquare`, `Play`, `RefreshCw`, `ScanText`, `Trash2`, `Upload` |
| `src/components/admin/AdminUserChallengesModal.tsx` | 7 | `RotateCcw` |
| `src/components/admin/AdminUserFormModal.tsx` | 8 | `Save`, `UserPlus` |
| `src/components/admin/AdminUsersSection.tsx` | 7 | `Download`, `Gavel`, `Pencil`, `ShieldCheck`, `ShieldOff`, `Trash2`, `Trophy`, `UserPlus` |
| `src/components/admin/BugReportDetail.tsx` | 7 | `Send`, `Trash2`, `UserSearch` |
| `src/components/admin/ContentReportDetail.tsx` | 4 | `Ban`, `CheckCircle`, `ShieldAlert`, `UserSearch`, `UserX` |
| `src/components/admin/SandboxedContentPreview.tsx` | 4 | `EyeOff`, `Eye`, `FileJson` |
| `src/components/admin/UserStandingBadge.tsx` | 7 | `CheckCircle`, `Clock`, `XCircle` |
| `src/components/admin/VectorMapTestModal.tsx` | 5 | `Compass`, `Info`, `Layers` |

### Auth (2 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/auth/AuthModalParts.tsx` | 8 | `Mail`, `LogIn`, `UserPlus`, `ShieldAlert`, `MailWarning` |
| `src/components/auth/ResetPasswordClient.tsx` | 10 | `CheckCircle2`, `AlertCircle` |

### Changelog (3 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/changelog/ChangelogEditorModal.tsx` | 5 | `Plus` |
| `src/components/changelog/ChangelogPostItem.tsx` | 5 | `GripVertical`, `Pencil`, `RefreshCw`, `Trash2` |
| `src/components/changelog/WhatsNewLauncher.tsx` | 5 | `Megaphone`, `Plus`, `Skull` |

### Character Detail (11 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/character-detail/CharacterDetailClient.tsx` | 7 | `ChevronLeft`, `UserX` |
| `src/components/character-detail/components/CategoryPicker.tsx` | 5 | `Check`, `ChevronDown` |
| `src/components/character-detail/components/CharacterHeroAvatar.tsx` | 5 | `User`, `ZoomIn` |
| `src/components/character-detail/components/CharacterTopBar.tsx` | 4 | `ArrowLeft`, `ArrowRight` |
| `src/components/character-detail/components/KillerCombatStats.tsx` | 3 | `Activity`, `Gauge`, `Radio`, `ArrowUpDown` |
| `src/components/character-detail/components/OfferingsSection.tsx` | 5 | `Coins`, `Map`, `EyeOff`, `Layers`, `Box` |
| `src/components/character-detail/components/SurvivorEquipmentSection.tsx` | 6 | `ShieldAlert`, `Wrench`, `Flashlight`, `Key`, `Map`, `Cloud` |
| `src/components/character-detail/KillerDetailView.tsx` | 6 | `BookOpen`, `Flame`, `Bookmark`, `Calendar`, `ShieldCheck` |
| `src/components/character-detail/modals/KillerPowerModal.tsx` | 3 | `BookOpen`, `Flame` |
| `src/components/character-detail/modals/Model3DModal.tsx` | 3 | `X` |
| `src/components/character-detail/SurvivorDetailView.tsx` | 6 | `BookOpen`, `Bookmark`, `Calendar`, `ShieldCheck` |

### Characters (4 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/characters/CharacterOwnershipOverlay.tsx` | 4 | `Check` |
| `src/components/characters/hub/CharactersToolbar.tsx` | 4 | `Search`, `X` |
| `src/components/characters/hub/VerificationNotice.tsx` | 4 | `MailWarning` |
| `src/components/characters/PerksTogglePopup.tsx` | 5 | `Check` |

### Common / Shared Primitives (24 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/common/AccordionSection.tsx` | 10 | `ChevronDown` |
| `src/components/common/ActionMenu.tsx` | 6 | `Ellipsis` |
| `src/components/common/Alert.tsx` | 5 | `TriangleAlert`, `X` |
| `src/components/common/AltchaWidget.tsx` | 5 | `ShieldCheck`, `ShieldAlert` |
| `src/components/common/BlockCard.tsx` | 15 | `ChevronDown` |
| `src/components/common/ColorSwatch.tsx` | 5 | `Check` |
| `src/components/common/ContactLinks.tsx` | 8 | `Check`, `Copy`, `Mail` |
| `src/components/common/ContentRemovedNotice.tsx` | 3 | `ShieldAlert`, `X` |
| `src/components/common/CustomDropdown.tsx` | 5 | `ChevronDown`, `Check` |
| `src/components/common/DisclosureButton.tsx` | 6 | `ChevronDown` |
| `src/components/common/ExportModal.tsx` | 5 | `Check`, `Copy`, `Download`, `Link2`, `TriangleAlert` |
| `src/components/common/Field.tsx` | 5 | `Search`, `X` |
| `src/components/common/FormValidation.tsx` | 16 | `AlertCircle` |
| `src/components/common/ImageLinkTile.tsx` | 5 | `ExternalLink` |
| `src/components/common/ImageUploadDropzone.tsx` | 5 | `Check`, `ImagePlus`, `Trash2`, `Upload` |
| `src/components/common/ImportModal.tsx` | 5 | `CircleAlert`, `Info`, `Upload` |
| `src/components/common/LinkPill.tsx` | 10 | `ArrowRight`, `ExternalLink` |
| `src/components/common/Modal.tsx` | 41 | `X` |
| `src/components/common/Pagination.tsx` | 5 | `ChevronLeft`, `ChevronRight`, `ChevronsLeft`, `ChevronsRight` |
| `src/components/common/ReportContentModal.tsx` | 5 | `AlertCircle`, `CheckCircle2`, `ShieldAlert` |
| `src/components/common/RichTextEditor.tsx` | 12 | `Bold`, `Italic`, `Underline`, `List`, `ListOrdered`, `Link2`, `Heading3`, `Palette`, `Highlighter`, `AlignLeft`, `AlignCenter`, `AlignRight`, `AlignJustify` |
| `src/components/common/ScoreboardCheckModal.tsx` | 10 | `Check`, `CircleSlash`, `ImagePlus`, `TriangleAlert`, `X` |
| `src/components/common/SuccessState.tsx` | 6 | `CheckCircle2` |
| `src/components/common/Toast.tsx` | 6 | `X` |

### Maps (12 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/maps/FullscreenMapEngine.tsx` | 5 | `X`, `ZoomIn`, `ZoomOut`, `RotateCcw`, `ImageOff`, `Compass`, `Home`, `Building2`, `Maximize2` |
| `src/components/maps/MapCard.tsx` | 5 | `ImageOff` |
| `src/components/maps/MapExplorer.tsx` | 8 | `ImageOff`, `Compass`, `Maximize2`, `ArrowDownAZ`, `X` |
| `src/components/maps/MapLandmarks.tsx` | 10 | `Building2`, `Home` |
| `src/components/maps/MapLegend.tsx` | 4 | `X`, `Building2`, `Home`, `Compass` |
| `src/components/maps/MapsClient.tsx` | 7 | `Search`, `Mic` |
| `src/components/maps/voice/VoiceBannerHeader.tsx` | 6 | `Brain`, `Globe`, `Volume2`, `VolumeX` |
| `src/components/maps/voice/voiceStatusConfig.ts` | 2 | `LucideIcon` |
| `src/components/maps/voice/voiceStatusConfig.ts` | 3 | `AlertCircle`, `CheckCircle2`, `Mic`, `MicOff`, `RefreshCw`, `Volume2` |
| `src/components/maps/voice/VoiceStatusMessage.tsx` | 5 | `AlertCircle`, `CheckCircle2` |
| `src/components/maps/voice/VoiceVariantPills.tsx` | 5 | `ArrowRight` |
| `src/components/maps/VoiceEngineInfoModal.tsx` | 7 | `Cpu`, `Globe`, `ShieldCheck`, `CheckCircle2`, `RefreshCw`, `Info`, `Laptop`, `DownloadCloud`, `Gauge` |

### Mini-games (21 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/minigames/ChallengeRunner.tsx` | 8 | `Trophy`, `ArrowRight`, `CheckCircle2`, `XCircle`, `Flame` |
| `src/components/minigames/CharacterAutocomplete.tsx` | 8 | `Search`, `ChevronDown` |
| `src/components/minigames/creator/MinigameCreator.tsx` | 12 | `Plus`, `Save`, `Play`, `Download`, `Share2`, `ShieldCheck`, `Check`, `AlertCircle` |
| `src/components/minigames/creator/RoundEditorCard.tsx` | 9 | `ChevronUp`, `ChevronDown`, `Trash2` |
| `src/components/minigames/guessers/AddonGuesser.tsx` | 5 | `Package`, `Check`, `X` |
| `src/components/minigames/guessers/AudioGuesser.tsx` | 9 | `Volume2`, `VolumeX`, `Play`, `Pause`, `Check`, `X`, `Disc3` |
| `src/components/minigames/guessers/ClassicCharacterGuesser.tsx` | 5 | `ArrowUp`, `ArrowDown`, `Check` |
| `src/components/minigames/guessers/ClassicPerkGuesser.tsx` | 5 | `Check` |
| `src/components/minigames/guessers/EmojiRiddleGuesser.tsx` | 5 | `Check`, `X` |
| `src/components/minigames/guessers/KillerPowerGuesser.tsx` | 5 | `Flame`, `Check`, `X` |
| `src/components/minigames/guessers/PerkIconGuesser.tsx` | 6 | `Eye`, `Check`, `X`, `ShieldAlert` |
| `src/components/minigames/guessers/PixelAvatarGuesser.tsx` | 7 | `Check`, `X`, `ShieldAlert` |
| `src/components/minigames/guessers/QuoteLoreGuesser.tsx` | 6 | `Quote`, `BookOpen`, `Check`, `X` |
| `src/components/minigames/guessers/RealmGuesser.tsx` | 6 | `MapPin`, `Eye`, `Check`, `X` |
| `src/components/minigames/guessers/SolvedOverlay.tsx` | 4 | `Check` |
| `src/components/minigames/hubModes.ts` | 5 | `Calendar`, `Trophy`, `Layers`, `MapPin`, `Zap`, `Volume2`, `Eye`, `BookOpen`, `Plus` |
| `src/components/minigames/MinigamesHub.tsx` | 14 | `Gamepad2`, `Flame`, `Plus`, `Upload`, `AlertCircle`, `X` |
| `src/components/minigames/MinigamesHubCards.tsx` | 8 | `LucideIcon` |
| `src/components/minigames/MinigamesHubCards.tsx` | 9 | `Play`, `Share2`, `Download`, `Trash2`, `Check` |
| `src/components/minigames/PlayTrialClient.tsx` | 26 | `Flag` |
| `src/components/minigames/VictoryModal.tsx` | 7 | `Share2`, `Check`, `RotateCcw`, `Home` |

### Perks (2 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/perks/PerksClient.tsx` | 21 | `SearchX` |
| `src/components/perks/PerkSortMenu.tsx` | 6 | `ArrowDownUp` |

### Randomizer / Generator (5 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/generator/GeneratorPage.tsx` | 6 | `AlertTriangle`, `RotateCcw` |
| `src/components/generator/modes/slot-machine/SlotReelColumnDesktop.tsx` | 5 | `Ban` |
| `src/components/generator/modes/slot-machine/SlotReelRowMobile.tsx` | 5 | `Ban`, `Check`, `Plus` |
| `src/components/generator/shared/PerkSlot.tsx` | 5 | `ImageOff`, `EyeOff` |
| `src/components/generator/Toolbar.tsx` | 5 | `Repeat`, `Volume2`, `VolumeX`, `RotateCcw`, `EyeOff`, `Info` |

### Root Components (26 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/about/AboutClient.tsx` | 4 | `FileText`, `ScrollText`, `ShieldCheck` |
| `src/components/AuthModal.tsx` | 12 | `AlertCircle` |
| `src/components/ChaosWheelModal.tsx` | 5 | `Check`, `Trash2` |
| `src/components/CharactersHub.tsx` | 7 | `User` |
| `src/components/DisabledBadge.tsx` | 5 | `AlertTriangle` |
| `src/components/landing/HomePage.tsx` | 10 | `ArrowRight` |
| `src/components/layout/ErrorPage.tsx` | 11 | `Home`, `RotateCcw` |
| `src/components/layout/SiteBanner.tsx` | 8 | `Info`, `OctagonAlert`, `TriangleAlert`, `X` |
| `src/components/moderation/AccountBlockedNotice.tsx` | 9 | `Ban`, `Clock` |
| `src/components/moderation/WarningDialog.tsx` | 9 | `TriangleAlert` |
| `src/components/onboarding/CharacterOnboardingWizard.tsx` | 5 | `Info` |
| `src/components/onboarding/wizard/ChapterCard.tsx` | 4 | `ChevronDown` |
| `src/components/onboarding/wizard/ChapterToolbar.tsx` | 4 | `Check`, `Search`, `X` |
| `src/components/onboarding/wizard/OnboardingAuthRequired.tsx` | 5 | `User` |
| `src/components/PerkCard.tsx` | 8 | `HelpCircle` |
| `src/components/PerkFilters.tsx` | 9 | `SlidersHorizontal` |
| `src/components/PerkModal.tsx` | 5 | `ImageOff` |
| `src/components/scraper-config/ExportTab.tsx` | 4 | `CheckSquare`, `Download`, `Square` |
| `src/components/scraper-config/ImportTab.tsx` | 4 | `FileJson`, `RotateCcw`, `ShieldCheck`, `Upload`, `X` |
| `src/components/scraper-config/PurgeTab.tsx` | 4 | `Square`, `Trash2` |
| `src/components/scraper-config/ScraperConfigTabs.tsx` | 4 | `Download`, `Trash2`, `Upload` |
| `src/components/scraper-config/scraperTargets.ts` | 8 | `Globe`, `Layers`, `Settings`, `Users` |
| `src/components/scraper-config/StatusBanner.tsx` | 3 | `AlertTriangle`, `CheckCircle2` |
| `src/components/scraper-config/TargetPicker.tsx` | 4 | `LucideIcon` |
| `src/components/Sidebar.tsx` | 8 | `Menu`, `X`, `ChevronLeft`, `ChevronRight`, `Info`, `LayoutList`, `Gamepad2`, `Settings`, `Library` |
| `src/components/ui/PerkIcon.tsx` | 4 | `ImageOff` |

### Sidebar & Navigation (5 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/sidebar/BardInsultsModal.tsx` | 9 | `Check` |
| `src/components/sidebar/BugReportModal.tsx` | 11 | `Upload`, `Image`, `Trash2`, `UserCheck`, `Mail` |
| `src/components/sidebar/BuyCoffeeModal.tsx` | 5 | `ExternalLink` |
| `src/components/sidebar/SidebarBottomControls.tsx` | 8 | `Sun`, `Moon`, `Laptop`, `Citrus` |
| `src/components/sidebar/SidebarUserSection.tsx` | 8 | `LogIn`, `LogOut` |

### Smash or Pass (22 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/smash-or-pass/CharacterCard.tsx` | 5 | `X` |
| `src/components/smash-or-pass/CharacterStatsModal.tsx` | 5 | `Flame`, `Quote`, `ThumbsDown` |
| `src/components/smash-or-pass/creator/CoverImageCropModal.tsx` | 6 | `ZoomIn`, `ZoomOut`, `RotateCcw`, `Check`, `Upload`, `AlertCircle`, `Image` |
| `src/components/smash-or-pass/creator/EntityEditor.tsx` | 10 | `ChevronDown`, `Trash2`, `Image` |
| `src/components/smash-or-pass/creator/EntityEditorParts.tsx` | 4 | `Pencil`, `X`, `Plus` |
| `src/components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx` | 6 | `Plus`, `Trash2`, `ChevronDown`, `Flame`, `Skull`, `Zap`, `Shield`, `Compass`, `Link` |
| `src/components/smash-or-pass/creator/RosterBasicsSection.tsx` | 4 | `Crop` |
| `src/components/smash-or-pass/creator/RosterTaxonomyBlock.tsx` | 5 | `Plus`, `X`, `Shield`, `User` |
| `src/components/smash-or-pass/creator/SmashRosterCreator.tsx` | 18 | `History`, `Plus`, `SearchX` |
| `src/components/smash-or-pass/creator/SmashRosterCreatorParts.tsx` | 4 | `TriangleAlert` |
| `src/components/smash-or-pass/hub/CalmVoteMark.tsx` | 5 | `Skull` |
| `src/components/smash-or-pass/hub/DeckFinished.tsx` | 5 | `RotateCcw` |
| `src/components/smash-or-pass/hub/HowToPlayModal.tsx` | 3 | `Gamepad2` |
| `src/components/smash-or-pass/hub/HubHeader.tsx` | 4 | `ChevronDown` |
| `src/components/smash-or-pass/persona/PersonaBreakdown.tsx` | 3 | `Compass`, `Gamepad2`, `RotateCcw`, `Share2` |
| `src/components/smash-or-pass/persona/PersonaShareView.tsx` | 3 | `ArrowLeft`, `Check`, `Copy`, `Share2` |
| `src/components/smash-or-pass/RomancePersonaModal.tsx` | 6 | `Compass`, `ArrowRight`, `ArrowLeft` |
| `src/components/smash-or-pass/roster-select/RosterPickerFooter.tsx` | 10 | `Flag` |
| `src/components/smash-or-pass/SmashAnimations.tsx` | 6 | `Flame`, `Skull`, `Zap` |
| `src/components/smash-or-pass/SmashLeaderboardModal.tsx` | 5 | `Skull`, `Search`, `ArrowUpDown`, `X`, `Flame`, `Layers`, `User`, `Users` |
| `src/components/smash-or-pass/SmashLeaderboardParts.tsx` | 4 | `ThumbsDown` |
| `src/components/smash-or-pass/TactileKeycaps.tsx` | 5 | `ArrowLeft`, `ArrowRight`, `ArrowUp`, `RotateCcw` |

### Streaks & Challenges (35 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/streaks/CelebrationBadge.tsx` | 2 | `Trophy` |
| `src/components/streaks/ChallengeCompletionHistoryDrawer.tsx` | 5 | `RotateCcw`, `Users`, `Swords` |
| `src/components/streaks/ChallengeIntroModalShell.tsx` | 8 | `BookOpen`, `ChevronLeft` |
| `src/components/streaks/ChallengeModeGate.tsx` | 5 | `AlertTriangle` |
| `src/components/streaks/ChallengePanel.tsx` | 5 | `BarChart2`, `BookOpen`, `ChevronDown`, `History`, `RotateCcw`, `Clapperboard` |
| `src/components/streaks/ChallengeProgress.tsx` | 5 | `Trophy` |
| `src/components/streaks/chaos/ChaosHeader.tsx` | 6 | `Flame` |
| `src/components/streaks/chaos/ChaosPerkPoolModal.tsx` | 7 | `CheckCircle2`, `Circle` |
| `src/components/streaks/chaos/KillerPickerGrid.tsx` | 5 | `Check` |
| `src/components/streaks/CheckpointCelebrationModal.tsx` | 5 | `Trophy` |
| `src/components/streaks/FreezeBadge.tsx` | 5 | `Snowflake` |
| `src/components/streaks/gauntlet/ActiveTargetStageParts.tsx` | 7 | `User`, `Star`, `HelpCircle` |
| `src/components/streaks/gauntlet/boostIcons.ts` | 2 | `Crosshair`, `Shuffle`, `Plus`, `Shield`, `LucideIcon` |
| `src/components/streaks/gauntlet/CharacterRosterGrid.tsx` | 7 | `Check`, `User`, `ShieldCheck` |
| `src/components/streaks/gauntlet/GauntletHeader.tsx` | 5 | `Flame` |
| `src/components/streaks/gauntlet/GauntletModeModal.tsx` | 7 | `Swords`, `User`, `Users`, `UsersRound` |
| `src/components/streaks/gauntlet/LemonTokenPanel.tsx` | 5 | `Coins` |
| `src/components/streaks/gauntlet/ShieldPromptModal.tsx` | 5 | `Shield` |
| `src/components/streaks/gauntlet/TokenRollModal.tsx` | 5 | `Coins` |
| `src/components/streaks/history/HistoryHeader.tsx` | 7 | `Flame` |
| `src/components/streaks/history/HistoryPerkPoolPanel.tsx` | 6 | `CheckCircle2`, `X` |
| `src/components/streaks/id-please/IdPleaseBoard.tsx` | 5 | `CheckCircle2`, `Trophy` |
| `src/components/streaks/id-please/IdPleaseHeader.tsx` | 5 | `Flame` |
| `src/components/streaks/id-please/IdPleaseProgress.tsx` | 5 | `Infinity`, `Trophy` |
| `src/components/streaks/page-streak/BuildPanel.tsx` | 6 | `Plus` |
| `src/components/streaks/page-streak/KillerRosterGrid.tsx` | 6 | `Check` |
| `src/components/streaks/page-streak/PageStreakModeModal.tsx` | 6 | `BookOpen` |
| `src/components/streaks/page-streak/RunHeader.tsx` | 6 | `Flame` |
| `src/components/streaks/PageStreakBoard.tsx` | 4 | `RotateCcw` |
| `src/components/streaks/RulesModalSections.tsx` | 5 | `Clock`, `Snowflake` |
| `src/components/streaks/RulesModalShell.tsx` | 6 | `LucideIcon` |
| `src/components/streaks/StreakMatchRow.tsx` | 5 | `Clock` |
| `src/components/streaks/StreakPanel.tsx` | 7 | `AlertTriangle` |
| `src/components/streaks/StreaksLayoutShell.tsx` | 7 | `MailWarning` |
| `src/components/streaks/StreakStatsDrawer.tsx` | 5 | `Percent` |

### Tests (1 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/__tests__/unit/streaks/streakSharedComponents.test.ts` | 6 | `Flame` |

### Tier Lists (15 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/tier-lists/creator/CreatorItems.tsx` | 5 | `Pencil`, `Trash2`, `X` |
| `src/components/tier-lists/creator/ItemSources.tsx` | 6 | `Check`, `ClipboardPaste`, `Gamepad2`, `ImagePlus`, `Plus`, `Upload` |
| `src/components/tier-lists/creator/LadderEditor.tsx` | 5 | `GripVertical`, `ListOrdered`, `Plus`, `X` |
| `src/components/tier-lists/creator/TierItemEditModal.tsx` | 5 | `Check`, `ImageOff` |
| `src/components/tier-lists/creator/TierListCreator.tsx` | 6 | `History`, `SearchX` |
| `src/components/tier-lists/creator/TierListCreatorParts.tsx` | 4 | `TriangleAlert` |
| `src/components/tier-lists/CustomTierListView.tsx` | 6 | `SearchX` |
| `src/components/tier-lists/OfficialTierListView.tsx` | 7 | `RotateCcw`, `SearchX`, `TriangleAlert` |
| `src/components/tier-lists/TierColorPicker.tsx` | 7 | `Check`, `Pipette` |
| `src/components/tier-lists/TierListCards.tsx` | 6 | `ChevronRight`, `Info`, `Trash2` |
| `src/components/tier-lists/TierListEditor.tsx` | 7 | `Download`, `Ellipsis`, `Eye`, `EyeOff`, `Flag`, `MousePointerClick`, `Pencil`, `RotateCcw`, `Trash2`, `Upload` |
| `src/components/tier-lists/TierListHub.tsx` | 8 | `FileJson`, `LayoutList`, `Plus`, `RotateCcw`, `TriangleAlert` |
| `src/components/tier-lists/TierListScaleControl.tsx` | 5 | `Maximize2`, `Minus`, `Plus` |
| `src/components/tier-lists/TierPool.tsx` | 7 | `ArrowDownToLine`, `ChevronDown`, `X` |
| `src/components/tier-lists/TierRow.tsx` | 7 | `ArrowDownToLine`, `Eraser` |

### User Profile & Settings (13 files)

| File Path | Line | Imported Icons |
| :--- | :---: | :--- |
| `src/components/user/CampfireHeader.tsx` | 7 | `ChevronRight`, `Camera`, `Calendar` |
| `src/components/user/DeleteAccountSection.tsx` | 7 | `Trash2` |
| `src/components/user/DownloadDataSection.tsx` | 9 | `Download` |
| `src/components/user/PerkDiamondSlot.tsx` | 3 | `Plus`, `X` |
| `src/components/user/RecoveryCodesPanel.tsx` | 8 | `Check`, `Copy`, `Download` |
| `src/components/user/ShowcasePerkModal.tsx` | 7 | `Check` |
| `src/components/user/SignOutEverywhereSection.tsx` | 8 | `LogOut` |
| `src/components/user/TwoFactorSection.tsx` | 7 | `ShieldCheck` |
| `src/components/user/TwoFactorSetupModal.tsx` | 8 | `Check`, `Copy` |
| `src/components/user/UserBugReportsDrawer.tsx` | 5 | `Plus` |
| `src/components/user/UserBugReportsList.tsx` | 7 | `Plus`, `Clock`, `CheckCircle`, `XCircle`, `HelpCircle`, `Image`, `ChevronDown`, `X`, `Maximize2` |
| `src/components/user/UserProfileClient.tsx` | 19 | `User` |
| `src/components/user/UserProfileForm.tsx` | 6 | `Mail`, `Eye`, `EyeOff`, `CheckCircle2`, `AlertCircle` |

