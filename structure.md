# Directory Structure

**Root:** `LemonDBD`  

```text
LemonDBD/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── extensions.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── chaos.py
│   │   │   ├── character.py
│   │   │   ├── community.py
│   │   │   ├── equipment.py
│   │   │   ├── gauntlet.py
│   │   │   ├── history.py
│   │   │   ├── map.py
│   │   │   ├── minigames.py
│   │   │   ├── page_streak.py
│   │   │   ├── perk.py
│   │   │   ├── smash_or_pass.py
│   │   │   └── user.py
│   │   ├── routes/
│   │   │   ├── others/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── builds.py
│   │   │   │   ├── custom_perks.py
│   │   │   │   ├── draft.py
│   │   │   │   ├── guesser.py
│   │   │   │   ├── killer_calc.py
│   │   │   │   ├── quests.py
│   │   │   │   └── smash_or_pass.py
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── bug_reports.py
│   │   │   ├── chaos_streak.py
│   │   │   ├── gauntlet_streak.py
│   │   │   ├── generator.py
│   │   │   ├── history_streak.py
│   │   │   ├── maps.py
│   │   │   ├── page_streak.py
│   │   │   ├── perks.py
│   │   │   ├── synergy.py
│   │   │   └── users.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── chaos.py
│   │   │   ├── character.py
│   │   │   ├── community.py
│   │   │   ├── equipment.py
│   │   │   ├── gauntlet.py
│   │   │   ├── history.py
│   │   │   ├── map.py
│   │   │   ├── minigames.py
│   │   │   ├── page_streak.py
│   │   │   ├── perk.py
│   │   │   └── user.py
│   │   ├── scrapers/
│   │   │   ├── assets/ [Contains only media across subdirectories (1 files)]
│   │   │   ├── drivers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py
│   │   │   │   ├── de.py
│   │   │   │   ├── en.py
│   │   │   │   ├── es.py
│   │   │   │   ├── fr.py
│   │   │   │   ├── it.py
│   │   │   │   ├── ja.py
│   │   │   │   └── pl.py
│   │   │   ├── __init__.py
│   │   │   ├── constants.py
│   │   │   ├── maps.py
│   │   │   ├── roster_images.py
│   │   │   ├── types.py
│   │   │   ├── utils.py
│   │   │   └── wikigg.py
│   │   ├── seeds/
│   │   │   ├── __init__.py
│   │   │   └── user_seeder.py
│   │   ├── services/
│   │   │   ├── chaos/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── constants.py
│   │   │   │   ├── roller.py
│   │   │   │   └── stats.py
│   │   │   ├── db/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── connection.py
│   │   │   │   ├── export_import.py
│   │   │   │   ├── maintenance.py
│   │   │   │   ├── raw_schema.py
│   │   │   │   └── seeders.py
│   │   │   ├── gauntlet/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── constants.py
│   │   │   │   ├── roller.py
│   │   │   │   └── stats.py
│   │   │   ├── generator/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── config_manager.py
│   │   │   │   └── drawn_manager.py
│   │   │   ├── history/
│   │   │   │   ├── __init__.py
│   │   │   │   └── roster.py
│   │   │   ├── maps/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── data.py
│   │   │   │   ├── queries.py
│   │   │   │   └── seeder.py
│   │   │   ├── others/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── build_service.py
│   │   │   │   ├── custom_perk_service.py
│   │   │   │   ├── draft_service.py
│   │   │   │   ├── guesser_service.py
│   │   │   │   ├── killer_calc_service.py
│   │   │   │   ├── quest_service.py
│   │   │   │   └── smash_or_pass_service.py
│   │   │   ├── ownership/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── characters.py
│   │   │   │   ├── perks.py
│   │   │   │   └── summary.py
│   │   │   ├── page_streak/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── helpers.py
│   │   │   │   ├── pool.py
│   │   │   │   ├── roster.py
│   │   │   │   └── runs.py
│   │   │   ├── perks/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── loader.py
│   │   │   │   ├── queries_character.py
│   │   │   │   ├── queries_equipment.py
│   │   │   │   ├── queries_map.py
│   │   │   │   ├── queries_perk.py
│   │   │   │   └── utils.py
│   │   │   ├── scraper/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── assets.py
│   │   │   │   ├── db_sync.py
│   │   │   │   ├── pipeline.py
│   │   │   │   └── state.py
│   │   │   ├── synergy/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── badges.py
│   │   │   │   ├── evaluator.py
│   │   │   │   └── rules.py
│   │   │   ├── translations/
│   │   │   │   ├── __init__.py
│   │   │   │   └── translation_service.py
│   │   │   ├── user/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── admin.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── avatar.py
│   │   │   │   └── profile.py
│   │   │   ├── chaos_service.py
│   │   │   ├── db_service.py
│   │   │   ├── gauntlet_service.py
│   │   │   ├── generator_service.py
│   │   │   ├── history_service.py
│   │   │   ├── map_service.py
│   │   │   ├── ownership_service.py
│   │   │   ├── page_streak_service.py
│   │   │   ├── perk_service.py
│   │   │   ├── scraper_service.py
│   │   │   ├── synergy_service.py
│   │   │   └── user_service.py
│   │   ├── static/ [Contains only media across subdirectories (1719 files)]
│   │   ├── translations/
│   │   │   ├── translations.json
│   │   │   └── translations.min.json
│   │   └── __init__.py
│   ├── migrations/
│   │   ├── versions/
│   │   │   ├── 549bebf174e2_initial_schema_migration.py
│   │   │   └── add_alternate_name_to_perks.py
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   ├── README
│   │   └── script.py.mako
│   ├── scripts/
│   │   ├── check_missing_perks.py
│   │   ├── migrate_killer_powers.py
│   │   ├── organize_backend.py
│   │   └── run_scrapper.py
│   ├── tests/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── test_chaos_routes.py
│   │   │   ├── test_character_detail_route.py
│   │   │   ├── test_character_slug_routes.py
│   │   │   ├── test_db_export_import.py
│   │   │   ├── test_fullscreen_maps_routes.py
│   │   │   ├── test_gauntlet_routes.py
│   │   │   ├── test_generator_routes.py
│   │   │   ├── test_history_routes.py
│   │   │   ├── test_item_routes.py
│   │   │   ├── test_page_streak_routes.py
│   │   │   └── test_scraper_routes.py
│   │   ├── scrapers/
│   │   │   ├── __init__.py
│   │   │   ├── test_character_scraper.py
│   │   │   ├── test_modular_drivers.py
│   │   │   ├── test_scraper_config.py
│   │   │   ├── test_wikigg_items_addons.py
│   │   │   └── test_wikigg_translations.py
│   │   ├── unit/
│   │   │   ├── __init__.py
│   │   │   ├── test_chaos_models.py
│   │   │   ├── test_chaos_roller.py
│   │   │   ├── test_chaos_service.py
│   │   │   ├── test_chaos_stats.py
│   │   │   ├── test_db_service.py
│   │   │   ├── test_description_cleaner.py
│   │   │   ├── test_fullscreen_maps_service.py
│   │   │   ├── test_gauntlet_service.py
│   │   │   ├── test_generator_service.py
│   │   │   ├── test_guesser.py
│   │   │   ├── test_history_models.py
│   │   │   ├── test_history_roster.py
│   │   │   ├── test_history_service.py
│   │   │   ├── test_page_streak_service.py
│   │   │   ├── test_phase1_services.py
│   │   │   ├── test_phase2_services.py
│   │   │   ├── test_phase3_services.py
│   │   │   ├── test_phase4_services.py
│   │   │   ├── test_phase5_services.py
│   │   │   ├── test_phase6_services.py
│   │   │   ├── test_sqlalchemy_models_and_seeder.py
│   │   │   └── test_user_ownership.py
│   │   ├── conftest.py
│   │   ├── test_roster_image_scraper.py
│   │   ├── test_translations_jsonb.py
│   │   └── test_translations_verification.py
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run.py
├── documentation/
│   ├── api-reference.md
│   ├── architecture.md
│   ├── deployment.md
│   └── scraper.md
├── frontend/
│   ├── public/
│   │   ├── images/ [Contains only media across subdirectories (12 files)]
│   │   ├── models/
│   │   │   └── Xenova/
│   │   │       ├── whisper-tiny/
│   │   │       │   ├── onnx/
│   │   │       │   │   ├── decoder_model_merged_quantized.onnx
│   │   │       │   │   └── encoder_model_quantized.onnx
│   │   │       │   ├── config.json
│   │   │       │   ├── generation_config.json
│   │   │       │   ├── preprocessor_config.json
│   │   │       │   ├── tokenizer.json
│   │   │       │   ├── tokenizer_config.json
│   │   │       │   └── vocab.json
│   │   │       └── whisper-tiny.en/
│   │   │           ├── onnx/
│   │   │           │   ├── decoder_model_merged_quantized.onnx
│   │   │           │   └── encoder_model_quantized.onnx
│   │   │           ├── config.json
│   │   │           ├── generation_config.json
│   │   │           ├── preprocessor_config.json
│   │   │           ├── tokenizer.json
│   │   │           ├── tokenizer_config.json
│   │   │           └── vocab.json
│   │   ├── transformers/
│   │   │   ├── ort-wasm-simd-threaded.wasm
│   │   │   ├── ort-wasm-simd.wasm
│   │   │   ├── ort-wasm-threaded.wasm
│   │   │   ├── ort-wasm.wasm
│   │   │   ├── transformers.js
│   │   │   ├── transformers.js.map
│   │   │   ├── transformers.min.js
│   │   │   └── transformers.min.js.map
│   │   └── [1 media file]
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── admin/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── builds/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── characters/
│   │   │   │   │   ├── [slug]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── guesser/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── custom-perks/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── draft/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── killer-calculator/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── maps/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── perks/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── quests/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── smash-or-pass/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── streaks/
│   │   │   │   │   ├── challenge/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── killer/
│   │   │   │   │   │   ├── chaos-streak/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── gauntlet-streak/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── history-streak/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── page-streak/
│   │   │   │   │   │   │   ├── [killer]/
│   │   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── survivor/
│   │   │   │   │   │   ├── gauntlet-streak/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── swf/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── user/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── globals.css
│   │   │   └── [1 media file]
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminBugReportsWorkbench.tsx
│   │   │   │   ├── AdminCreateUserModal.tsx
│   │   │   │   ├── AdminHeader.tsx
│   │   │   │   ├── AdminStatsGrid.tsx
│   │   │   │   └── AdminUserTable.tsx
│   │   │   ├── builds/
│   │   │   │   └── BuildVault.tsx
│   │   │   ├── character-detail/
│   │   │   │   ├── components/
│   │   │   │   │   ├── CharacterBreadcrumbs.tsx
│   │   │   │   │   ├── CharacterDlcMeta.tsx
│   │   │   │   │   ├── CharacterHeroAvatar.tsx
│   │   │   │   │   ├── CharacterPerksSection.tsx
│   │   │   │   │   ├── KillerCombatStats.tsx
│   │   │   │   │   ├── KillerEquipmentSection.tsx
│   │   │   │   │   ├── OfferingsSection.tsx
│   │   │   │   │   └── SurvivorEquipmentSection.tsx
│   │   │   │   ├── modals/
│   │   │   │   │   ├── EquipmentDetailModal.tsx
│   │   │   │   │   ├── KillerPowerModal.tsx
│   │   │   │   │   ├── LoreModal.tsx
│   │   │   │   │   ├── Model3DModal.tsx
│   │   │   │   │   └── TerrorRadiusModal.tsx
│   │   │   │   ├── CharacterSubpageView.tsx
│   │   │   │   ├── KillerDetailView.tsx
│   │   │   │   ├── SurvivorDetailView.tsx
│   │   │   │   └── types.tsx
│   │   │   ├── draft/
│   │   │   │   └── DraftRoom.tsx
│   │   │   ├── killer/
│   │   │   │   └── KillerCalculator.tsx
│   │   │   ├── maps/
│   │   │   │   ├── layouts/
│   │   │   │   │   ├── DesktopMapLayout.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── MobileMapLayout.tsx
│   │   │   │   ├── FullscreenMapEngine.tsx
│   │   │   │   ├── MapCanvas.tsx
│   │   │   │   ├── MapControls.tsx
│   │   │   │   ├── MapDirectoryList.tsx
│   │   │   │   ├── MapExplorer.tsx
│   │   │   │   ├── MapLegendDrawer.tsx
│   │   │   │   ├── TileInspectorDrawer.tsx
│   │   │   │   ├── VariantSwitcherBar.tsx
│   │   │   │   ├── VoiceCommandBanner.tsx
│   │   │   │   ├── VoiceEngineInfoModal.tsx
│   │   │   │   └── VoiceNavButton.tsx
│   │   │   ├── perk-studio/
│   │   │   │   └── CustomPerkStudio.tsx
│   │   │   ├── sidebar/
│   │   │   │   ├── BugReportModal.tsx
│   │   │   │   ├── BuyCoffeeModal.tsx
│   │   │   │   ├── FlagIcon.tsx
│   │   │   │   ├── SidebarBottomControls.tsx
│   │   │   │   ├── SidebarNavLink.tsx
│   │   │   │   ├── SidebarStatsCard.tsx
│   │   │   │   └── SidebarUserSection.tsx
│   │   │   ├── smash-or-pass/
│   │   │   │   ├── CardDisintegrationOverlay.tsx
│   │   │   │   ├── CharacterCard.tsx
│   │   │   │   ├── characterRoster.ts
│   │   │   │   ├── CharacterStatsModal.tsx
│   │   │   │   ├── editionsRegistry.ts
│   │   │   │   ├── FloatingHeartsBackground.tsx
│   │   │   │   ├── FloatingLoreScattered.tsx
│   │   │   │   ├── InteractiveDragBackground.tsx
│   │   │   │   ├── RomancePersonaModal.tsx
│   │   │   │   ├── rosterTranslations.ts
│   │   │   │   ├── SmashAnimations.tsx
│   │   │   │   ├── SmashLeaderboardModal.tsx
│   │   │   │   ├── SmashOrPassHub.tsx
│   │   │   │   └── SmashSoundEffects.ts
│   │   │   ├── streaks/
│   │   │   │   ├── chaos/
│   │   │   │   │   ├── ChaosBoard.tsx
│   │   │   │   │   ├── ChaosCheckpointModal.tsx
│   │   │   │   │   ├── ChaosHeader.tsx
│   │   │   │   │   ├── ChaosModeModal.tsx
│   │   │   │   │   ├── ChaosPerkPoolModal.tsx
│   │   │   │   │   ├── ChaosProgressBar.tsx
│   │   │   │   │   ├── ChaosRulesModal.tsx
│   │   │   │   │   ├── ChaosStatsDrawer.tsx
│   │   │   │   │   ├── KillerPickerGrid.tsx
│   │   │   │   │   ├── SlotMachineStage.tsx
│   │   │   │   │   ├── useChaosRun.ts
│   │   │   │   │   ├── useKillerPerkPool.ts
│   │   │   │   │   ├── useOwnedKillers.ts
│   │   │   │   │   └── useSlotReels.ts
│   │   │   │   ├── gauntlet/
│   │   │   │   │   ├── ActiveTargetStage.tsx
│   │   │   │   │   ├── CharacterRosterGrid.tsx
│   │   │   │   │   ├── CheckpointModal.tsx
│   │   │   │   │   ├── GauntletBoard.tsx
│   │   │   │   │   ├── GauntletFireBackground.tsx
│   │   │   │   │   ├── gauntletFlame.json
│   │   │   │   │   ├── GauntletHeader.tsx
│   │   │   │   │   ├── GauntletModeModal.tsx
│   │   │   │   │   ├── GauntletRulesModal.tsx
│   │   │   │   │   ├── GauntletStatsDrawer.tsx
│   │   │   │   │   ├── useGauntletRun.ts
│   │   │   │   │   ├── useOwnedCharacters.ts
│   │   │   │   │   └── useTargetDraw.ts
│   │   │   │   ├── history/
│   │   │   │   │   ├── HistoryBoard.tsx
│   │   │   │   │   ├── HistoryHeader.tsx
│   │   │   │   │   ├── HistoryModeModal.tsx
│   │   │   │   │   ├── HistoryNextRowPreview.tsx
│   │   │   │   │   ├── HistoryPerkModal.tsx
│   │   │   │   │   ├── HistoryPerkPoolPanel.tsx
│   │   │   │   │   ├── HistoryRowClearedBanner.tsx
│   │   │   │   │   ├── HistoryRulesModal.tsx
│   │   │   │   │   ├── HistoryStatsDrawer.tsx
│   │   │   │   │   └── useHistoryRun.ts
│   │   │   │   ├── page-streak/
│   │   │   │   │   ├── BuildBar.tsx
│   │   │   │   │   ├── KillerRosterGrid.tsx
│   │   │   │   │   ├── PageStreakRoster.tsx
│   │   │   │   │   ├── PageStreakRunView.tsx
│   │   │   │   │   ├── PerkPageGrid.tsx
│   │   │   │   │   ├── PerkTile.tsx
│   │   │   │   │   ├── RunHeader.tsx
│   │   │   │   │   ├── RunHistory.tsx
│   │   │   │   │   ├── StartRunPanel.tsx
│   │   │   │   │   ├── usePageStreakRun.ts
│   │   │   │   │   └── usePerkArtwork.ts
│   │   │   │   ├── Confetti.tsx
│   │   │   │   ├── PageStreakBoard.tsx
│   │   │   │   ├── panelColors.ts
│   │   │   │   ├── panels.ts
│   │   │   │   ├── RoleTabs.tsx
│   │   │   │   ├── StreakPanel.tsx
│   │   │   │   └── StreakPanelGrid.tsx
│   │   │   ├── swf/
│   │   │   │   └── SwfPlanner.tsx
│   │   │   ├── user/
│   │   │   │   ├── UserBugReportsList.tsx
│   │   │   │   ├── UserMetricsGrid.tsx
│   │   │   │   └── UserProfileForm.tsx
│   │   │   ├── AuthModal.tsx
│   │   │   ├── ChaosWheelModal.tsx
│   │   │   ├── CharacterConfigModal.tsx
│   │   │   ├── CharactersHub.tsx
│   │   │   ├── LemonIcon.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── PerkCard.tsx
│   │   │   ├── PerkDescription.tsx
│   │   │   ├── PerkFilters.tsx
│   │   │   ├── PerkGenerator.tsx
│   │   │   ├── PerkModal.tsx
│   │   │   ├── QuestsModal.tsx
│   │   │   ├── ScraperConfigModal.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── UserAvatar.tsx
│   │   │   └── WheelOfFortune.tsx
│   │   ├── constants/
│   │   │   ├── addonRarityIcons.ts
│   │   │   └── chaosMutators.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   ├── useMapExplorerData.ts
│   │   │   ├── useMapGestures.ts
│   │   │   └── useSidebarState.ts
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   └── get-dictionary.ts
│   │   ├── locales/
│   │   │   ├── de.json
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   ├── ja.json
│   │   │   └── pl.json
│   │   ├── services/
│   │   │   ├── chaosStreakApi.ts
│   │   │   ├── clientSpeechModel.ts
│   │   │   ├── draftApi.ts
│   │   │   ├── gauntletStreakApi.ts
│   │   │   ├── generatorApi.ts
│   │   │   ├── historyStreakApi.ts
│   │   │   ├── mapApi.ts
│   │   │   ├── pageStreakApi.ts
│   │   │   └── questApi.ts
│   │   ├── types/
│   │   │   ├── admin.ts
│   │   │   ├── chaos.ts
│   │   │   ├── chaosStreak.ts
│   │   │   ├── draft.ts
│   │   │   ├── gauntletStreak.ts
│   │   │   ├── historyStreak.ts
│   │   │   ├── map.ts
│   │   │   ├── pageStreak.ts
│   │   │   ├── perks.ts
│   │   │   ├── quest.ts
│   │   │   └── userProfile.ts
│   │   ├── utils/
│   │   │   ├── __tests__/
│   │   │   │   ├── mapHooks.test.ts
│   │   │   │   ├── mapLandmarks.test.ts
│   │   │   │   ├── mapLayouts.test.ts
│   │   │   │   ├── mapSubcomponents.test.ts
│   │   │   │   ├── mapVoiceMatcher.test.ts
│   │   │   │   ├── smashOrPass.test.ts
│   │   │   │   ├── voiceClientModel.test.ts
│   │   │   │   └── voiceComponents.test.ts
│   │   │   ├── characterUtils.ts
│   │   │   ├── mapLandmarks.ts
│   │   │   ├── mapUtils.ts
│   │   │   ├── mapVoiceMatcher.ts
│   │   │   ├── perkUtils.tsx
│   │   │   └── textFormatter.tsx
│   │   └── proxy.ts
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   └── tsconfig.tsbuildinfo
├── nginx/
│   ├── default.conf
│   └── Dockerfile
├── translations/
│   ├── characters_dump - Copy.json
│   ├── characters_dump.json
│   ├── create_translations.py
│   ├── de.json
│   ├── en.json
│   ├── es.json
│   ├── gameplay_dump.json
│   ├── hentai.py
│   ├── hentai2.py
│   ├── hentai3.py
│   ├── items_dump.json
│   ├── ja.json
│   ├── lemondbd.json
│   ├── pl.json
│   └── pl_dump.json
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── lemon2.py
├── lemon3.py
├── prompt.md
├── prompt2.md
├── response.md
└── structure.md
```
