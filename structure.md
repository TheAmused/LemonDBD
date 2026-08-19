# Directory Structure

**Root:** `LemonDBD`  

```text
LemonDBD/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── others/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── builds.py
│   │   │   │   ├── custom_perks.py
│   │   │   │   ├── draft.py
│   │   │   │   ├── guesser.py
│   │   │   │   ├── killer_calc.py
│   │   │   │   └── quests.py
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── bug_reports.py
│   │   │   ├── gauntlet_streak.py
│   │   │   ├── generator.py
│   │   │   ├── maps.py
│   │   │   ├── page_streak.py
│   │   │   ├── perks.py
│   │   │   ├── synergy.py
│   │   │   └── users.py
│   │   ├── scrapers/
│   │   │   ├── assets/ [Contains only media across subdirectories (1 files)]
│   │   │   ├── __init__.py
│   │   │   ├── maps.py
│   │   │   ├── types.py
│   │   │   ├── utils.py
│   │   │   └── wikigg.py
│   │   ├── seeds/
│   │   │   ├── __init__.py
│   │   │   └── user_seeder.py
│   │   ├── services/
│   │   │   ├── others/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── build_service.py
│   │   │   │   ├── custom_perk_service.py
│   │   │   │   ├── draft_service.py
│   │   │   │   ├── guesser_service.py
│   │   │   │   ├── killer_calc_service.py
│   │   │   │   └── quest_service.py
│   │   │   ├── db_service.py
│   │   │   ├── gauntlet_service.py
│   │   │   ├── generator_service.py
│   │   │   ├── map_service.py
│   │   │   ├── ownership_service.py
│   │   │   ├── page_streak_service.py
│   │   │   ├── perk_service.py
│   │   │   ├── scraper_service.py
│   │   │   ├── synergy_service.py
│   │   │   └── user_service.py
│   │   ├── static/ [Contains only media across subdirectories (2281 files)]
│   │   ├── utils/
│   │   │   └── auth_helper.py
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── extensions.py
│   │   └── models.py
│   ├── data/
│   │   ├── lemon_dbd.db
│   │   ├── maps.json
│   │   └── scraper_config.json
│   ├── migrations/
│   │   ├── versions/
│   │   │   ├── 549bebf174e2_initial_schema_migration.py
│   │   │   └── add_alternate_name_to_perks.py
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   ├── README
│   │   └── script.py.mako
│   ├── tests/
│   │   ├── test_character_detail_route.py
│   │   ├── test_character_scraper.py
│   │   ├── test_character_slug_routes.py
│   │   ├── test_db_service.py
│   │   ├── test_description_cleaner.py
│   │   ├── test_fullscreen_maps_routes.py
│   │   ├── test_fullscreen_maps_service.py
│   │   ├── test_gauntlet_routes.py
│   │   ├── test_gauntlet_service.py
│   │   ├── test_generator_routes.py
│   │   ├── test_generator_service.py
│   │   ├── test_guesser.py
│   │   ├── test_item_routes.py
│   │   ├── test_page_streak_routes.py
│   │   ├── test_page_streak_service.py
│   │   ├── test_phase1_services.py
│   │   ├── test_phase2_services.py
│   │   ├── test_phase3_services.py
│   │   ├── test_phase4_services.py
│   │   ├── test_phase5_services.py
│   │   ├── test_phase6_services.py
│   │   ├── test_scraper_config.py
│   │   ├── test_scraper_routes.py
│   │   ├── test_sqlalchemy_models_and_seeder.py
│   │   ├── test_user_ownership.py
│   │   └── test_wikigg_items_addons.py
│   ├── .dockerignore
│   ├── check_missing_perks.py
│   ├── Dockerfile
│   ├── migrate_killer_powers.py
│   ├── requirements.txt
│   ├── run.py
│   └── run_scrapper.py
├── documentation/
│   ├── api-reference.md
│   ├── architecture.md
│   ├── deployment.md
│   └── scraper.md
├── frontend/
│   ├── public/
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
│   │   └── transformers/
│   │       ├── ort-wasm-simd-threaded.wasm
│   │       ├── ort-wasm-simd.wasm
│   │       ├── ort-wasm-threaded.wasm
│   │       ├── ort-wasm.wasm
│   │       ├── transformers.js
│   │       ├── transformers.js.map
│   │       ├── transformers.min.js
│   │       └── transformers.min.js.map
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
│   │   │   │   ├── quests/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── streaks/
│   │   │   │   │   ├── killer/
│   │   │   │   │   │   ├── gauntlet-streak/
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
│   │   │   ├── streaks/
│   │   │   │   ├── gauntlet/
│   │   │   │   │   ├── ActiveTargetStage.tsx
│   │   │   │   │   ├── CharacterRosterGrid.tsx
│   │   │   │   │   ├── GauntletBoard.tsx
│   │   │   │   │   ├── GauntletHeader.tsx
│   │   │   │   │   ├── GauntletRulesModal.tsx
│   │   │   │   │   ├── GauntletStatsDrawer.tsx
│   │   │   │   │   ├── useGauntletRun.ts
│   │   │   │   │   └── useOwnedCharacters.ts
│   │   │   │   ├── page-streak/
│   │   │   │   │   ├── BuildBar.tsx
│   │   │   │   │   ├── Confetti.tsx
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
│   │   │   │   ├── PageStreakBoard.tsx
│   │   │   │   ├── panels.ts
│   │   │   │   ├── RoleTabs.tsx
│   │   │   │   ├── StreakPanel.tsx
│   │   │   │   └── StreakPanelGrid.tsx
│   │   │   ├── swf/
│   │   │   │   └── SwfPlanner.tsx
│   │   │   ├── AuthModal.tsx
│   │   │   ├── BugReportModal.tsx
│   │   │   ├── BuyCoffeeModal.tsx
│   │   │   ├── ChaosWheelModal.tsx
│   │   │   ├── CharacterConfigModal.tsx
│   │   │   ├── CharactersHub.tsx
│   │   │   ├── LemonIcon.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── PerkCard.tsx
│   │   │   ├── PerkFilters.tsx
│   │   │   ├── PerkGenerator.tsx
│   │   │   ├── PerkModal.tsx
│   │   │   ├── QuestsModal.tsx
│   │   │   ├── ScraperConfigModal.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── UserAvatar.tsx
│   │   │   └── WheelOfFortune.tsx
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
│   │   │   ├── clientSpeechModel.ts
│   │   │   ├── draftApi.ts
│   │   │   ├── gauntletStreakApi.ts
│   │   │   ├── generatorApi.ts
│   │   │   ├── mapApi.ts
│   │   │   ├── pageStreakApi.ts
│   │   │   └── questApi.ts
│   │   ├── types/
│   │   │   ├── draft.ts
│   │   │   ├── gauntletStreak.ts
│   │   │   ├── map.ts
│   │   │   ├── pageStreak.ts
│   │   │   └── quest.ts
│   │   ├── utils/
│   │   │   ├── __tests__/
│   │   │   │   ├── mapHooks.test.ts
│   │   │   │   ├── mapLandmarks.test.ts
│   │   │   │   ├── mapLayouts.test.ts
│   │   │   │   ├── mapSubcomponents.test.ts
│   │   │   │   ├── mapVoiceMatcher.test.ts
│   │   │   │   ├── voiceClientModel.test.ts
│   │   │   │   └── voiceComponents.test.ts
│   │   │   ├── mapLandmarks.ts
│   │   │   ├── mapUtils.ts
│   │   │   └── mapVoiceMatcher.ts
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
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
└── structure.md
```
