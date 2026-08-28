# Directory Structure

**Root:** `LemonDBD`  

```text
LemonDBD/
├── .claude/
│   └── skills/
│       └── goal-sloc/
│           ├── references/
│           │   ├── flutter-sloc-reference.md
│           │   ├── minimal-tools.md
│           │   └── preflight-checklist.md
│           └── SKILL.md
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── extensions.py
│   │   │   ├── json_provider.py
│   │   │   ├── limiter.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
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
│   │   │   ├── admin_control.py
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
│   │   │   ├── rosters/
│   │   │   │   ├── anime_manga.json
│   │   │   │   ├── canon.json
│   │   │   │   ├── cyberpunk_2077.json
│   │   │   │   ├── gothic_eldritch.json
│   │   │   │   ├── hooked_on_you.json
│   │   │   │   └── legendary_cosplay.json
│   │   │   ├── __init__.py
│   │   │   ├── smash_roster_seeder.py
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
│   │   │   │   ├── roster.py
│   │   │   │   └── stats.py
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
│   │   │   │   ├── runs.py
│   │   │   │   └── stats.py
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
│   │   │   ├── admin_control_service.py
│   │   │   ├── altcha_service.py
│   │   │   ├── chaos_service.py
│   │   │   ├── db_service.py
│   │   │   ├── gauntlet_service.py
│   │   │   ├── generator_service.py
│   │   │   ├── history_service.py
│   │   │   ├── mail_service.py
│   │   │   ├── map_service.py
│   │   │   ├── ownership_service.py
│   │   │   ├── page_streak_service.py
│   │   │   ├── perk_service.py
│   │   │   ├── scraper_service.py
│   │   │   ├── streak_cleanup_service.py
│   │   │   ├── streak_stats.py
│   │   │   ├── synergy_service.py
│   │   │   └── user_service.py
│   │   ├── static/ [Contains only media across subdirectories (1824 files)]
│   │   ├── translations/
│   │   │   ├── translations.json
│   │   │   └── translations.min.json
│   │   ├── __init__.py
│   │   └── fix_missing_translations.py
│   ├── instance/
│   │   └── dev.db
│   ├── migrations/
│   │   ├── versions/
│   │   │   ├── 549bebf174e2_initial_schema_migration.py
│   │   │   ├── add_alternate_name_to_perks.py
│   │   │   ├── admin_character_kill_switch_001.py
│   │   │   ├── admin_perk_kill_switch_001.py
│   │   │   ├── email_verification_reset_001.py
│   │   │   ├── freeze_challenge_pools_001.py
│   │   │   └── inactivity_loss_flag_001.py
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   ├── README
│   │   └── script.py.mako
│   ├── scripts/
│   │   ├── check_missing_perks.py
│   │   ├── migrate_killer_powers.py
│   │   ├── organize_backend.py
│   │   ├── run_scrapper.py
│   │   └── run_seed_smash.py
│   ├── tests/
│   │   ├── live/
│   │   │   ├── api/
│   │   │   │   ├── test_live_admin_api.py
│   │   │   │   ├── test_live_minigames_api.py
│   │   │   │   ├── test_live_perks_api.py
│   │   │   │   ├── test_live_streaks_api.py
│   │   │   │   └── test_live_user_ownership_api.py
│   │   │   ├── services/
│   │   │   │   └── test_live_services_integration.py
│   │   │   ├── workflows/
│   │   │   │   ├── test_admin_governance_lifecycle_workflow.py
│   │   │   │   ├── test_admin_killswitch_workflow.py
│   │   │   │   ├── test_admin_multimode_killswitch_workflow.py
│   │   │   │   ├── test_admin_system_metrics_workflow.py
│   │   │   │   ├── test_auth_ownership_workflow.py
│   │   │   │   ├── test_bug_report_resolution_workflow.py
│   │   │   │   ├── test_chaos_streak_blind_reveal_workflow.py
│   │   │   │   ├── test_chaos_streak_workflow.py
│   │   │   │   ├── test_character_catalog_and_filtering_workflow.py
│   │   │   │   ├── test_character_perks_addons_equipment_workflow.py
│   │   │   │   ├── test_character_power_and_addons_workflow.py
│   │   │   │   ├── test_gauntlet_multiround_progression_workflow.py
│   │   │   │   ├── test_generator_exclusion_pool_workflow.py
│   │   │   │   ├── test_generator_lock_and_redraw_workflow.py
│   │   │   │   ├── test_history_streak_guessing_workflow.py
│   │   │   │   ├── test_interactive_map_navigation_workflow.py
│   │   │   │   ├── test_jwt_security_and_session_validation_workflow.py
│   │   │   │   ├── test_map_landmarks_and_seeds_workflow.py
│   │   │   │   ├── test_page_streak_multipage_progression_workflow.py
│   │   │   │   ├── test_perk_detail_and_teachables_workflow.py
│   │   │   │   ├── test_perks_polish_localization_workflow.py
│   │   │   │   ├── test_smash_or_pass_session_voting_workflow.py
│   │   │   │   ├── test_smash_or_pass_tournament_workflow.py
│   │   │   │   ├── test_streaks_and_challenge_governance_workflow.py
│   │   │   │   ├── test_user_ownership_bulk_cascades_workflow.py
│   │   │   │   └── test_user_profile_lifecycle_workflow.py
│   │   │   ├── conftest.py
│   │   │   └── test_live_smoke.py
│   │   ├── unit/
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── test_chaos_routes.py
│   │   │   │   ├── test_character_detail_route.py
│   │   │   │   ├── test_character_slug_routes.py
│   │   │   │   ├── test_db_export_import.py
│   │   │   │   ├── test_fullscreen_maps_routes.py
│   │   │   │   ├── test_gauntlet_routes.py
│   │   │   │   ├── test_generator_routes.py
│   │   │   │   ├── test_history_routes.py
│   │   │   │   ├── test_item_routes.py
│   │   │   │   ├── test_page_streak_routes.py
│   │   │   │   └── test_scraper_routes.py
│   │   │   ├── scrapers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── test_character_scraper.py
│   │   │   │   ├── test_modular_drivers.py
│   │   │   │   ├── test_roster_image_scraper.py
│   │   │   │   ├── test_scraper_config.py
│   │   │   │   ├── test_wikigg_items_addons.py
│   │   │   │   └── test_wikigg_translations.py
│   │   │   ├── __init__.py
│   │   │   ├── conftest.py
│   │   │   ├── test_altcha_service.py
│   │   │   ├── test_chaos_models.py
│   │   │   ├── test_chaos_roller.py
│   │   │   ├── test_chaos_service.py
│   │   │   ├── test_chaos_stats.py
│   │   │   ├── test_db_pool_config.py
│   │   │   ├── test_db_service.py
│   │   │   ├── test_description_cleaner.py
│   │   │   ├── test_fullscreen_maps_service.py
│   │   │   ├── test_gauntlet_service.py
│   │   │   ├── test_generator_service.py
│   │   │   ├── test_guesser.py
│   │   │   ├── test_gunicorn_config.py
│   │   │   ├── test_history_models.py
│   │   │   ├── test_history_roster.py
│   │   │   ├── test_history_service.py
│   │   │   ├── test_json_provider.py
│   │   │   ├── test_page_streak_service.py
│   │   │   ├── test_phase1_services.py
│   │   │   ├── test_phase2_services.py
│   │   │   ├── test_phase3_services.py
│   │   │   ├── test_phase4_services.py
│   │   │   ├── test_phase5_services.py
│   │   │   ├── test_phase6_services.py
│   │   │   ├── test_scheduler_config.py
│   │   │   ├── test_security_guards.py
│   │   │   ├── test_smash_api.py
│   │   │   ├── test_smash_models.py
│   │   │   ├── test_smash_seeder_service.py
│   │   │   ├── test_sqlalchemy_models_and_seeder.py
│   │   │   ├── test_streak_cleanup_service.py
│   │   │   ├── test_translations_jsonb.py
│   │   │   ├── test_translations_verification.py
│   │   │   └── test_user_ownership.py
│   │   └── conftest.py
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── gunicorn.conf.py
│   ├── pytest.ini
│   ├── requirements.txt
│   └── run.py
├── docker/
│   ├── crowdsec/
│   │   └── acquis.yaml
│   ├── pgadmin/
│   │   └── servers.json
│   └── postgres-init/
│       └── 01-init-umami.sql
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
│   ├── scripts/
│   │   └── check-hardcoded-strings.ts
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── live/
│   │   │   │   ├── adminGovernanceWorkflowLive.test.ts
│   │   │   │   ├── adminMultiModeKillswitchWorkflowLive.test.ts
│   │   │   │   ├── adminSystemMetricsWorkflowLive.test.ts
│   │   │   │   ├── apiClientLive.test.ts
│   │   │   │   ├── authAndOwnershipLive.test.ts
│   │   │   │   ├── bugReportsWorkflowLive.test.ts
│   │   │   │   ├── challengesAndStreaksWorkflowLive.test.ts
│   │   │   │   ├── chaosStreakBlindRevealWorkflowLive.test.ts
│   │   │   │   ├── characterCatalogAndFilteringWorkflowLive.test.ts
│   │   │   │   ├── characterPowerAndAddonsWorkflowLive.test.ts
│   │   │   │   ├── gauntletMultiRoundProgressionWorkflowLive.test.ts
│   │   │   │   ├── generatorExclusionPoolWorkflowLive.test.ts
│   │   │   │   ├── generatorLockAndRedrawWorkflowLive.test.ts
│   │   │   │   ├── historyStreakGuessingWorkflowLive.test.ts
│   │   │   │   ├── interactiveMapNavigationWorkflowLive.test.ts
│   │   │   │   ├── jwtSecurityAndSessionValidationWorkflowLive.test.ts
│   │   │   │   ├── mapLandmarksAndSeedsWorkflowLive.test.ts
│   │   │   │   ├── pageStreakMultiPageProgressionWorkflowLive.test.ts
│   │   │   │   ├── perkDetailAndTeachablesWorkflowLive.test.ts
│   │   │   │   ├── perksAndAddonsBrowserLive.test.ts
│   │   │   │   ├── perksPolishLocalizationWorkflowLive.test.ts
│   │   │   │   ├── smashOrPassLive.test.ts
│   │   │   │   ├── smashOrPassSessionVotingWorkflowLive.test.ts
│   │   │   │   ├── streakFlowsLive.test.ts
│   │   │   │   ├── userOwnershipBulkCascadesWorkflowLive.test.ts
│   │   │   │   └── userProfileWorkflowLive.test.ts
│   │   │   └── unit/
│   │   │       ├── altcha.test.ts
│   │   │       ├── i18nTranslations.test.ts
│   │   │       ├── mapHooks.test.ts
│   │   │       ├── mapLandmarks.test.ts
│   │   │       ├── mapLayouts.test.ts
│   │   │       ├── mapSubcomponents.test.ts
│   │   │       ├── mapVoiceMatcher.test.ts
│   │   │       ├── next_config.test.ts
│   │   │       ├── perkAudio.test.ts
│   │   │       ├── perkUtils.test.ts
│   │   │       ├── servicesApi.test.ts
│   │   │       ├── smashOrPass.test.ts
│   │   │       ├── voiceClientModel.test.ts
│   │   │       └── voiceComponents.test.ts
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
│   │   │   │   ├── reset-password/
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
│   │   │   │   ├── AdminAuditLogView.tsx
│   │   │   │   ├── AdminBugReportsWorkbench.tsx
│   │   │   │   ├── AdminChallengeControl.tsx
│   │   │   │   ├── AdminChallengeStats.tsx
│   │   │   │   ├── AdminCreateUserModal.tsx
│   │   │   │   ├── AdminHeader.tsx
│   │   │   │   ├── AdminReasonModal.tsx
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
│   │   │   │   │   ├── SurvivorEquipmentSection.tsx
│   │   │   │   │   └── UnifiedHoverModal.tsx
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
│   │   │   ├── common/
│   │   │   │   ├── AltchaWidget.tsx
│   │   │   │   └── UnifiedHoverModal.tsx
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
│   │   │   │   ├── CharacterStatsModal.tsx
│   │   │   │   ├── FloatingHeartsBackground.tsx
│   │   │   │   ├── FloatingLoreScattered.tsx
│   │   │   │   ├── InteractiveDragBackground.tsx
│   │   │   │   ├── RomancePersonaModal.tsx
│   │   │   │   ├── RosterSelectModal.tsx
│   │   │   │   ├── SmashAnimations.tsx
│   │   │   │   ├── SmashLeaderboardModal.tsx
│   │   │   │   ├── SmashOrPassHub.tsx
│   │   │   │   ├── SmashSoundEffects.ts
│   │   │   │   └── TactileKeycaps.tsx
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
│   │   │   │   │   ├── PageStreakRulesModal.tsx
│   │   │   │   │   ├── PageStreakRunView.tsx
│   │   │   │   │   ├── PageStreakStatsDrawer.tsx
│   │   │   │   │   ├── PerkPageGrid.tsx
│   │   │   │   │   ├── PerkTile.tsx
│   │   │   │   │   ├── RunHeader.tsx
│   │   │   │   │   ├── StartRunPanel.tsx
│   │   │   │   │   └── usePageStreakRun.ts
│   │   │   │   ├── ChallengeModeGate.tsx
│   │   │   │   ├── Confetti.tsx
│   │   │   │   ├── FreezeBadge.tsx
│   │   │   │   ├── PageStreakBoard.tsx
│   │   │   │   ├── panelColors.ts
│   │   │   │   ├── panels.ts
│   │   │   │   ├── ResetConfirmModal.tsx
│   │   │   │   ├── RoleTabs.tsx
│   │   │   │   ├── RulesModalShell.tsx
│   │   │   │   ├── StreakPanel.tsx
│   │   │   │   ├── StreakPanelGrid.tsx
│   │   │   │   └── StreakStatsDrawer.tsx
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
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── DisabledBadge.tsx
│   │   │   ├── DisabledReasonModal.tsx
│   │   │   ├── EmailVerificationForm.tsx
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
│   │   │   ├── useAltcha.ts
│   │   │   ├── useMapExplorerData.ts
│   │   │   ├── useMapGestures.ts
│   │   │   └── useSidebarState.ts
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   └── get-dictionary.ts
│   │   ├── locales/
│   │   │   ├── de/
│   │   │   │   ├── admin.ts
│   │   │   │   ├── app.ts
│   │   │   │   ├── builds.ts
│   │   │   │   ├── card.ts
│   │   │   │   ├── characterDetail.ts
│   │   │   │   ├── draft.ts
│   │   │   │   ├── empty.ts
│   │   │   │   ├── filters.ts
│   │   │   │   ├── generator.ts
│   │   │   │   ├── guesser.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── landing.ts
│   │   │   │   ├── maps.ts
│   │   │   │   ├── modal.ts
│   │   │   │   ├── pagination.ts
│   │   │   │   ├── sidebar.ts
│   │   │   │   ├── smashOrPass.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── streaks.ts
│   │   │   │   ├── swf.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── voice.ts
│   │   │   ├── en/
│   │   │   │   ├── admin.ts
│   │   │   │   ├── app.ts
│   │   │   │   ├── builds.ts
│   │   │   │   ├── card.ts
│   │   │   │   ├── characterDetail.ts
│   │   │   │   ├── draft.ts
│   │   │   │   ├── empty.ts
│   │   │   │   ├── filters.ts
│   │   │   │   ├── generator.ts
│   │   │   │   ├── guesser.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── landing.ts
│   │   │   │   ├── maps.ts
│   │   │   │   ├── modal.ts
│   │   │   │   ├── pagination.ts
│   │   │   │   ├── sidebar.ts
│   │   │   │   ├── smashOrPass.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── streaks.ts
│   │   │   │   ├── swf.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── voice.ts
│   │   │   ├── es/
│   │   │   │   ├── admin.ts
│   │   │   │   ├── app.ts
│   │   │   │   ├── builds.ts
│   │   │   │   ├── card.ts
│   │   │   │   ├── characterDetail.ts
│   │   │   │   ├── draft.ts
│   │   │   │   ├── empty.ts
│   │   │   │   ├── filters.ts
│   │   │   │   ├── generator.ts
│   │   │   │   ├── guesser.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── landing.ts
│   │   │   │   ├── maps.ts
│   │   │   │   ├── modal.ts
│   │   │   │   ├── pagination.ts
│   │   │   │   ├── sidebar.ts
│   │   │   │   ├── smashOrPass.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── streaks.ts
│   │   │   │   ├── swf.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── voice.ts
│   │   │   ├── ja/
│   │   │   │   ├── admin.ts
│   │   │   │   ├── app.ts
│   │   │   │   ├── builds.ts
│   │   │   │   ├── card.ts
│   │   │   │   ├── characterDetail.ts
│   │   │   │   ├── draft.ts
│   │   │   │   ├── empty.ts
│   │   │   │   ├── filters.ts
│   │   │   │   ├── generator.ts
│   │   │   │   ├── guesser.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── landing.ts
│   │   │   │   ├── maps.ts
│   │   │   │   ├── modal.ts
│   │   │   │   ├── pagination.ts
│   │   │   │   ├── sidebar.ts
│   │   │   │   ├── smashOrPass.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── streaks.ts
│   │   │   │   ├── swf.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── voice.ts
│   │   │   ├── pl/
│   │   │   │   ├── admin.ts
│   │   │   │   ├── app.ts
│   │   │   │   ├── builds.ts
│   │   │   │   ├── card.ts
│   │   │   │   ├── characterDetail.ts
│   │   │   │   ├── draft.ts
│   │   │   │   ├── empty.ts
│   │   │   │   ├── filters.ts
│   │   │   │   ├── generator.ts
│   │   │   │   ├── guesser.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── landing.ts
│   │   │   │   ├── maps.ts
│   │   │   │   ├── modal.ts
│   │   │   │   ├── pagination.ts
│   │   │   │   ├── sidebar.ts
│   │   │   │   ├── smashOrPass.ts
│   │   │   │   ├── stats.ts
│   │   │   │   ├── streaks.ts
│   │   │   │   ├── swf.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── voice.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── services/
│   │   │   ├── challengeModesApi.ts
│   │   │   ├── chaosStreakApi.ts
│   │   │   ├── clientSpeechModel.ts
│   │   │   ├── draftApi.ts
│   │   │   ├── gauntletStreakApi.ts
│   │   │   ├── generatorApi.ts
│   │   │   ├── historyStreakApi.ts
│   │   │   ├── mapApi.ts
│   │   │   ├── pageStreakApi.ts
│   │   │   ├── questApi.ts
│   │   │   ├── smashApi.ts
│   │   │   └── streakApiClient.ts
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
│   │   │   ├── smashOrPass.ts
│   │   │   └── userProfile.ts
│   │   ├── utils/
│   │   │   ├── characterUtils.ts
│   │   │   ├── mapLandmarks.ts
│   │   │   ├── mapUtils.ts
│   │   │   ├── mapVoiceMatcher.ts
│   │   │   ├── perkAudio.ts
│   │   │   ├── perkUtils.tsx
│   │   │   ├── staticUrl.ts
│   │   │   └── textFormatter.tsx
│   │   └── proxy.ts
│   ├── .dockerignore
│   ├── check_output.txt
│   ├── check_output.utf8.txt
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
├── scratch/
│   ├── all_rosters_data.json
│   ├── build_exhaustive_translations.py
│   ├── build_multilingual_roster.py
│   ├── canon_entities.json
│   ├── check_files_on_disk.py
│   ├── check_missing_images.py
│   ├── check_translations.py
│   ├── check_unique_images.py
│   ├── cleanup_webp_names.py
│   ├── convert_all_to_webp.py
│   ├── convert_canon_webp.py
│   ├── download_all_unique_roster_characters.py
│   ├── download_real_collection_assets.py
│   ├── enrich_all_entity_translations.py
│   ├── enrich_all_locales.py
│   ├── exhaustive_multilingual_rosters.json
│   ├── fast_convert_all_webp.py
│   ├── find_all_outfit_images.py
│   ├── fix_all_seeder_quotes.py
│   ├── fix_seeder_translations.py
│   ├── generate_full_multilingual_seeder.py
│   ├── generate_seeder.py
│   ├── generate_seeder_exhaustive.py
│   ├── generate_seeder_multilingual.py
│   ├── link_remaining.py
│   ├── port_roster.js
│   ├── port_roster_to_seeder.py
│   ├── port_roster_ts.ts
│   ├── run_sync_and_seed.py
│   ├── scrape_wiki_collections.py
│   ├── search_all_character_prefixes.py
│   ├── search_wiki_api.py
│   ├── split_rosters_to_json.py
│   ├── sync_all_roster_images.py
│   ├── sync_and_convert_all_webp.py
│   ├── test_download_feng.py
│   ├── test_flask_static.py
│   ├── test_scraper_seed.py
│   ├── transformed_multilingual_rosters.json
│   ├── translate_all_entities.py
│   └── verify_all_roster_assets.py
├── translations/
│   ├── DBDCharacters/
│   │   ├── K01/
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   └── CustomizationItemDB.json
│   │   ├── K02/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── WraithTunableDB.json
│   │   ├── K03/
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── HillBillyTunableDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K04/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── Perks/
│   │   │   │   ├── Perk_Stridor_Data.json
│   │   │   │   └── Perk_Thanatophobia_Data.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── NurseTunableDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K044/
│   │   │   ├── Abilities/
│   │   │   │   ├── ExileAbility/
│   │   │   │   │   ├── Hazard/
│   │   │   │   │   │   ├── Curve_K044HazardActivationDelaySurvivorFactor.json
│   │   │   │   │   │   └── Curve_K044HazardActivationDelayTimeFactor.json
│   │   │   │   │   ├── Interactions/
│   │   │   │   │   │   └── Curve_K044KillerEmpoweredActivationMovementSpeed.json
│   │   │   │   │   ├── ProceduralGeneration/
│   │   │   │   │   │   ├── Curve_K044ShrineSpawnCount.json
│   │   │   │   │   │   ├── Curve_K044SpawnerHarshPenaltyFromDistanceToOtherShrine.json
│   │   │   │   │   │   ├── Curve_K044SpawnerPenaltyFromDistanceToOtherShrine.json
│   │   │   │   │   │   └── Curve_K044SpawnerScoreFromDistanceToGenerator.json
│   │   │   │   │   ├── ScoreCurves/
│   │   │   │   │   │   ├── Curve_Score_K044_Killer_ApplySinToSurvivor.json
│   │   │   │   │   │   ├── Curve_Score_K044_Killer_BanishSurvivor.json
│   │   │   │   │   │   ├── Curve_Score_K044_Killer_InterruptSurvivorPray.json
│   │   │   │   │   │   ├── Curve_Score_K044_Killer_InterruptSurvivorRepent.json
│   │   │   │   │   │   └── Curve_Score_K044_Survivor_ExitExileWithoutHitByHazard.json
│   │   │   │   │   ├── Strings/
│   │   │   │   │   │   ├── ST_GP_K044_ExileAbility_Prompts.json
│   │   │   │   │   │   └── ST_GP_K044_ExileAbility_ScoreEvents.json
│   │   │   │   │   └── DA_K044ExileAbilityData.json
│   │   │   │   ├── ProjectileAbility/
│   │   │   │   │   ├── Curves/
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_EmpoweredPillarDuration_FlingDelay.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_KillerSpeed_Cancelling.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_KillerSpeed_Charging.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_KillerSpeed_Controlling.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_KillerSpeed_Flinging.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_KillerSpeed_TimeOut.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarAcceleration_FlingUptime.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarDuration_FlingDelay.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarDuration_FlingUptime.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarSpeed_BounceDelay.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarSpeed_BuildUp.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarSpeed_Controlled.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarSpeed_FlingDelay.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarSpeed_FlingUptime.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarSpeed_NotSpawned.json
│   │   │   │   │   │   ├── Curve_K044ProjectileAbility_PillarSpeed_TearDown.json
│   │   │   │   │   │   └── Curve_K044ProjectileAbility_PillarSpeed_TimeOut.json
│   │   │   │   │   ├── Strings/
│   │   │   │   │   │   ├── ST_GP_K044_ProjectileAbility_Interactions.json
│   │   │   │   │   │   └── ST_GP_K044_ProjectileAbility_ScoreEvents.json
│   │   │   │   │   ├── UI/
│   │   │   │   │   │   ├── DA_K044EmpoweredWidget.json
│   │   │   │   │   │   └── DA_K044ProjectilePowerWidget.json
│   │   │   │   │   └── DA_K044ProjectileAbilityData.json
│   │   │   │   └── SinAbility/
│   │   │   │       ├── Strings/
│   │   │   │       │   └── ST_GP_K044_SinAbility_ScoreEvents.json
│   │   │   │       └── DA_K044SinAbilityData.json
│   │   │   ├── Addons/
│   │   │   │   ├── DA_K044_Addon_02.json
│   │   │   │   ├── DA_K044_Addon_03.json
│   │   │   │   ├── DA_K044_Addon_05.json
│   │   │   │   ├── DA_K044_Addon_06.json
│   │   │   │   ├── DA_K044_Addon_07.json
│   │   │   │   ├── DA_K044_Addon_08.json
│   │   │   │   ├── DA_K044_Addon_09.json
│   │   │   │   ├── DA_K044_Addon_10.json
│   │   │   │   ├── DA_K044_Addon_12.json
│   │   │   │   ├── DA_K044_Addon_13.json
│   │   │   │   ├── DA_K044_Addon_15.json
│   │   │   │   ├── DA_K044_Addon_16.json
│   │   │   │   ├── DA_K044_Addon_17.json
│   │   │   │   ├── DA_K044_Addon_18.json
│   │   │   │   └── DA_K044_Addon_19.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K044_TunableValue.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── LevelGen_KillerPropertiesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── PerkTunablesDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K05/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K06/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── Curves/
│   │   │   │   ├── K06SpecialPounceAttackAttackHittingMovementSpeedCurve.json
│   │   │   │   ├── K06SpecialPounceAttackAttackOpenMovementSpeedCurve.json
│   │   │   │   ├── K06SpecialPounceAttackChargingMovementSpeedCurve.json
│   │   │   │   ├── K06SpecialPounceAttackControllerTurnRateCurve.json
│   │   │   │   ├── K06SpecialPounceAttackControllerYawLimitLeftToTurnRateCurve.json
│   │   │   │   ├── K06SpecialPounceAttackDestroyBreakMovementSpeedCurve.json
│   │   │   │   ├── K06SpecialPounceAttackMouseTurnRateCurve.json
│   │   │   │   └── K06SpecialPounceAttackYawLimitLeftToTurnRateCurve.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── ShapeTunableDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K07/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── DoctorTunableDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K08/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── BearTunableDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K09/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── ChainsawMappings_CA.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── LFTunableDB.json
│   │   │   ├── OfferingDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K10/
│   │   │   ├── Abilities/
│   │   │   │   ├── DA_DreamPalletAbility.json
│   │   │   │   ├── DA_DreamProjectionAbilityData.json
│   │   │   │   ├── DA_DreamSnareAbility.json
│   │   │   │   └── DA_NightmarePowerSwitchingAbilityData.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── ScoreCurves/
│   │   │   │   ├── Curve_Camper_K10_WakeUpOther.json
│   │   │   │   ├── Curve_Camper_K10_WakeUpSelf.json
│   │   │   │   ├── Curve_Killer_K10_DamageWithDreamPalletExplosion.json
│   │   │   │   └── Curve_Killer_K10_PutSurvivorToSleep.json
│   │   │   ├── UI/
│   │   │   │   ├── DA_K10DreamPalletAbilityWidgetData.json
│   │   │   │   ├── DA_K10DreamProjectionAbilityWidgetData.json
│   │   │   │   ├── DA_K10DreamSnareAbilityWidgetData.json
│   │   │   │   └── DA_K10PowerSwitchingAbilityWidgetData.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── LevelGen_LightDataDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── SandmanTunableDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K11/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── FinlandKillerTunableDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K12/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── ClownTunableDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K13/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── SpiritTunableDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K14/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── LegionTunableDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K15/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── PlagueTunableDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K16/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── GhostTunableDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K17/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── QatarKillerTunableDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K18/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OniTunableDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K19/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   ├── TunableValuesDB.json
│   │   │   └── UkraineKillerTunableDB.json
│   │   ├── K20/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K20_TunableDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K21/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K21_TunableDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K22/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── AimOffsetOverrideDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K22_TunableDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── Slasher022_Twin_AnimMappings.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K23/
│   │   │   ├── Abilities/
│   │   │   │   ├── AimingKnivesGamepadLookCurve.json
│   │   │   │   ├── FlurryOfKnivesConeOfFireWidthCurve.json
│   │   │   │   ├── FlurryOfKnivesMovementSpeedByKnivesThrown.json
│   │   │   │   ├── FlurryOfKnivesRecoilIntensityCurve.json
│   │   │   │   ├── FlurryOfKnivesThrowRateModifierByKnivesThrown.json
│   │   │   │   ├── K23StyleRankData.json
│   │   │   │   ├── StartSuperModeSpeedCurve.json
│   │   │   │   ├── SuperModeCooldownSpeedCurve.json
│   │   │   │   └── ThrowingKnivesGamepadLookCurve.json
│   │   │   ├── StatusEffects/
│   │   │   │   └── StatusEffect_K23Mainevent_Data.json
│   │   │   ├── UI/
│   │   │   │   ├── DA_K23_MainEventWidgetData.json
│   │   │   │   └── DA_K23_PowerProgressionWidgetData.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K23_TunableDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── QuestEventsDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K24/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K24_TunableDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K25/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── AIItemWeightDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K25_TunableValue.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   ├── SubtitlesDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── K26/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K26_TunableValue.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K27/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── Perks/
│   │   │   │   ├── Perk_K27P01.json
│   │   │   │   ├── Perk_K27P02.json
│   │   │   │   └── Perk_K27P03.json
│   │   │   ├── AIItemWeightDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K27_TunableValue.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K28/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K28_TunableValue.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K29/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K29_TunableValue.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K30/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── DA_GuardCatalog.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K30_TunableValue.json
│   │   │   ├── KnightGuard_TunableValues.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K31/
│   │   │   ├── Charms/
│   │   │   │   ├── PerkCharms/
│   │   │   │   │   └── CustomizationItemDB.json
│   │   │   │   └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K31_TunableValue.json
│   │   │   ├── K31CustomizationAnimationMappingsDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K32/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K32_TunableValue.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K33/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── AIItemWeightDB.json
│   │   │   ├── AimOffsetOverrideDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K33_TunableValue.json
│   │   │   ├── LevelGen_GameStateKillerSpecificComponentsDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── LevelGen_KillerPropertiesDB.json
│   │   │   ├── LevelGen_KillerSpecificNavmeshesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K34/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K34_TunableValue.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K35/
│   │   │   ├── Abilities/
│   │   │   │   └── SpawnHuskAbilityData.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── UI/
│   │   │   │   ├── BP_K35AimProjectileWidgetData.json
│   │   │   │   ├── BP_K35ShootProjectileWidgetData.json
│   │   │   │   ├── BP_K35SpawnHuskWidgetData.json
│   │   │   │   └── BP_K35TeleportWidgetData.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K35_TunableValue.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K36/
│   │   │   ├── Audio/
│   │   │   │   └── K36_InGameDialog.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── K36Power/
│   │   │   │   ├── SpellCounter/
│   │   │   │   │   ├── K36_Dispelling_SpellCounterData.json
│   │   │   │   │   ├── K36_FlightOfTheDamned_SpellCounterData.json
│   │   │   │   │   ├── K36_Fly_SpellCounterData.json
│   │   │   │   │   └── K36_MageHand_SpellCounterData.json
│   │   │   │   ├── Spells/
│   │   │   │   │   ├── DB_K36_DispellingSpell.json
│   │   │   │   │   ├── DB_K36_FlightOfTheDamnedSpell.json
│   │   │   │   │   ├── DB_K36_FlySpell.json
│   │   │   │   │   ├── DB_K36_MageHandSpell.json
│   │   │   │   │   ├── K36_Dispelling_SpellData.json
│   │   │   │   │   ├── K36_FlightOfTheDamned_SpellData.json
│   │   │   │   │   ├── K36_Fly_SpellData.json
│   │   │   │   │   └── K36_MageHand_SpellData.json
│   │   │   │   ├── DB_K36_DnDManagerTunables.json
│   │   │   │   ├── DB_K36_SelectSpellInteraction.json
│   │   │   │   └── K36TreasureChestObjectCount.json
│   │   │   ├── MagicItems/
│   │   │   │   └── K36_MagicItemArtifactTunableDB.json
│   │   │   ├── AIItemWeightDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K36_TreasureChestTunableDB.json
│   │   │   ├── K36_TunableValue.json
│   │   │   ├── LevelGen_GameStateKillerSpecificComponentsDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K37/
│   │   │   ├── Abilities/
│   │   │   │   ├── BatAbility/
│   │   │   │   │   └── K37BatAbilityData.json
│   │   │   │   ├── FormSwitchingAbility/
│   │   │   │   │   ├── Curves/
│   │   │   │   │   │   └── K37BatPostFormSwitchPenaltySpeedCurve.json
│   │   │   │   │   ├── DA_K37FormSwitchingTransitionData.json
│   │   │   │   │   ├── K37BatForm.json
│   │   │   │   │   ├── K37FormSwitchingAbilityData.json
│   │   │   │   │   ├── K37VampireForm.json
│   │   │   │   │   └── K37WolfForm.json
│   │   │   │   ├── VampireAbility/
│   │   │   │   │   ├── K37_PowerAddon17_FlamePillarData.json
│   │   │   │   │   ├── K37_PowerAddon19_FlamePillarData.json
│   │   │   │   │   ├── K37_VampireAbilityData.json
│   │   │   │   │   └── K37_VampireFlamePillarData.json
│   │   │   │   └── WolfAbility/
│   │   │   │       ├── FloatCurves/
│   │   │   │       │   ├── ChargeChainPounceNavigationSpeed.json
│   │   │   │       │   ├── WolfBiteAdjustmentMovementSpeedMultiplierCurve.json
│   │   │   │       │   └── WolfBiteOpenMaxSpeed.json
│   │   │   │       ├── K37FirstChainedPounceAttackData.json
│   │   │   │       ├── K37SecondChainedPounceAttackData.json
│   │   │   │       ├── K37ThirdChainedPounceAttackData.json
│   │   │   │       ├── K37WolfAbilityData.json
│   │   │   │       └── K37WolfBiteAttackSubstateDurationDB.json
│   │   │   ├── CastleVista/
│   │   │   │   ├── BP_K37CastleSpawnerGameStateComponent.json
│   │   │   │   ├── BP_K37CastleVista.json
│   │   │   │   ├── K37CastlePerMapSpawnData.json
│   │   │   │   └── LevelGen_GameStateKillerSpecificComponentsDB.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── ScoreCurves/
│   │   │   │   ├── TeleportPastThresholdBloodpointMultiplier.json
│   │   │   │   └── TransformIntoAnotherFormBloodpointMultiplier.json
│   │   │   ├── UI/
│   │   │   │   ├── BP_K37FormSwitchingAbilityNextFormWidgetData.json
│   │   │   │   ├── BP_K37FormSwitchingAbilityPreviousFormWidgetData.json
│   │   │   │   ├── BP_K37MainBatAbilityWidgetData.json
│   │   │   │   ├── BP_K37MainFormSwitchingAbilityWidgetData.json
│   │   │   │   ├── BP_K37MainVampireAbilityWidgetData.json
│   │   │   │   ├── BP_K37MainWolfAbilityWidgetData.json
│   │   │   │   ├── BP_K37SecondaryBatAbilityWidgetData.json
│   │   │   │   └── BP_K37VampireAbilitySecondaryWidgetData.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K37_TunableValue.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K38/
│   │   │   ├── Abilities/
│   │   │   │   └── BP_DogCompanionAbilityData.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── HUD/
│   │   │   │   ├── BP_K38AimDogDashWidgetData.json
│   │   │   │   ├── BP_K38AimDogPatrolWidgetData.json
│   │   │   │   ├── BP_K38DogCancelDashRedirectWidgetData.json
│   │   │   │   └── BP_K38SwapCommandWidgetData.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K38_Dog_TunableValues.json
│   │   │   ├── K38_TunableValue.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K39/
│   │   │   ├── Abilities/
│   │   │   │   └── TentacleSwingAbility/
│   │   │   │       └── K39TentacleSwingAbilityData.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── Curves/
│   │   │   │   ├── K39ControllerTurnRateCurve.json
│   │   │   │   ├── K39LookAngleToMouseTurnRateCurve.json
│   │   │   │   ├── K39TentacleChargingMovementSpeedCurve.json
│   │   │   │   ├── K39TentacleSwingAngleDistanceCurve.json
│   │   │   │   ├── K39TentacleSwingChargeCancelCooldownCurve.json
│   │   │   │   ├── K39TentacleSwingCooldownCurve.json
│   │   │   │   ├── K39TentacleSwingFirstSwingGrabCooldownCurve.json
│   │   │   │   ├── K39TentacleSwingFOVCurve.json
│   │   │   │   ├── K39TentacleSwingFOVCurvePoweredUp.json
│   │   │   │   ├── K39TentacleSwingGrabCooldownCurve.json
│   │   │   │   ├── K39TentacleSwingHeightModifierCurve.json
│   │   │   │   ├── K39TentacleSwingHeightModifierCurveSurvivor.json
│   │   │   │   ├── K39TentacleSwingSlidingSpeedCurve.json
│   │   │   │   ├── K39TentacleSwingVaultCollisionCooldownCurve.json
│   │   │   │   └── K39TentacleSwingVaultSurvivorCooldownCurve.json
│   │   │   ├── UI/
│   │   │   │   ├── K39CancelTentacleSwingAbilityPowerWidgetData.json
│   │   │   │   └── K39TentacleSwingAbilityPowerWidgetData.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationCategoriesDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K39_TunableValue.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K40/
│   │   │   ├── Abilities/
│   │   │   │   ├── ProjectileAbility/
│   │   │   │   │   ├── ThrowCurves/
│   │   │   │   │   │   ├── ProjectileAddedPitchByLaunchPitchPercent.json
│   │   │   │   │   │   ├── ProjectilePreviewMaxDistanceByTime.json
│   │   │   │   │   │   ├── ProjectileRecallNavigationSpeed.json
│   │   │   │   │   │   ├── ProjectileThrowCancelledCooldownNavigationSpeed.json
│   │   │   │   │   │   ├── ProjectileThrowCooldownNavigationSpeed.json
│   │   │   │   │   │   ├── ProjectileThrowNavigationSpeed.json
│   │   │   │   │   │   └── ProjectileThrowNavigationSpeedIn.json
│   │   │   │   │   ├── UI/
│   │   │   │   │   │   ├── DA_K40GrabProjectilePowerWidget.json
│   │   │   │   │   │   ├── DA_K40ProjectilePowerWidget.json
│   │   │   │   │   │   └── DA_K40RecallProjectilePowerWidget.json
│   │   │   │   │   └── DA_K40ProjectileAbilityData.json
│   │   │   │   └── SecuritySystemAbility/
│   │   │   │       ├── Curves/
│   │   │   │       │   └── K40SecurityDoorCount.json
│   │   │   │       ├── DA_K40SecuritySystemAbilityData.json
│   │   │   │       └── LevelGen_LightDataDB.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K40_TunableValue.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K41/
│   │   │   ├── Abilities/
│   │   │   │   ├── DB_K41_HeadModeAbility.json
│   │   │   │   ├── K41_CurseAbilityTunables.json
│   │   │   │   ├── K41_GutsAttackTunables.json
│   │   │   │   ├── K41_ProjectileAbility.json
│   │   │   │   └── K41_SwapBodyInteractions.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── AIItemWeightDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K41_Addons_TunableValues.json
│   │   │   ├── K41_TunableValue.json
│   │   │   ├── K41HeadCustomizationDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── K42/
│   │   │   ├── Ability/
│   │   │   │   ├── DA_K42GroundAttackChargeBlastData.json
│   │   │   │   ├── DA_K42GroundAttackChargeBlastData_Doom.json
│   │   │   │   ├── DA_K42UndergroundAbilityData.json
│   │   │   │   ├── K42Addon19FocusedAttackBlastData.json
│   │   │   │   ├── K42Addon19FocusedAttackBlastData_Doom.json
│   │   │   │   ├── K42DoomclockData.json
│   │   │   │   ├── K42FocusedAttackBlastData.json
│   │   │   │   ├── K42FocusedAttackBlastData_Doom.json
│   │   │   │   └── K42FocusedAttackData.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── Curves/
│   │   │   │   └── K42GrandfatherClockCount.json
│   │   │   ├── ScoreCurves/
│   │   │   │   └── Curve_Killer_Score_UndergroundActivated.json
│   │   │   ├── UI/
│   │   │   │   ├── DA_K42_FocusAttackAbilityPowerWidgetData.json
│   │   │   │   └── DA_K42_UndergroundAbilityPowerWidgetData.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K42_TunableValue.json
│   │   │   ├── K42AddonTunablesDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── PreLevelGenerationModifierDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── K43/
│   │   │   ├── Abilities/
│   │   │   │   ├── ProjectileAbility/
│   │   │   │   │   ├── ProjectileContainerSpawning/
│   │   │   │   │   │   ├── BP_K43ProjectileContainerSpawnStrategy.json
│   │   │   │   │   │   ├── Qui_Level_01_SpawnerPenaltyDistanceBetweenProjectileContainers.json
│   │   │   │   │   │   ├── Qui_Level_01_SpawnerScoreDistanceToHook.json
│   │   │   │   │   │   ├── SpawnerPenaltyDistanceBetweenProjectileContainers.json
│   │   │   │   │   │   └── SpawnerScoreDistanceToHook.json
│   │   │   │   │   ├── DA_K43ProjectileAbilityData.json
│   │   │   │   │   ├── DA_K43ProjectileAbilityPowerWidgetData.json
│   │   │   │   │   ├── DA_K43ProjectileMeshData.json
│   │   │   │   │   └── DT_K43_ProjectileAbility_TunableValue.json
│   │   │   │   └── TeleportAbility/
│   │   │   │       ├── BP_K43TeleportAbilityPowerWidgetData.json
│   │   │   │       ├── DA_K43FlipDirectionPowerWidgetData.json
│   │   │   │       ├── DA_K43TeleportAbilityData.json
│   │   │   │       └── DT_K43_TeleportAbility_TunableValues.json
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── ScoreCurves/
│   │   │   │   ├── Curve_Killer_Score_DramaticEntrance.json
│   │   │   │   ├── Curve_Killer_Score_HuskAttackHit.json
│   │   │   │   └── Curve_Killer_Score_TeleportStarted.json
│   │   │   ├── Strings/
│   │   │   │   └── ST_K43_ScoreEvents.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── K43_AddonTunablesDB.json
│   │   │   ├── K43_TunableValue.json
│   │   │   ├── LevelGen_GameStateKillerSpecificComponentsDB.json
│   │   │   ├── LevelGen_KillerItemDependenciesDB.json
│   │   │   ├── LevelGen_KillerPropertiesDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── PerkTunablesDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── S01/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── S02/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S03/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S04/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S05/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S054/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── PerkTunablesDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S06/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S07/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S08/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S09/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S10/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S11/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S12/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S13/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S14/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S15/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S16/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S17/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationCategoriesDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S18/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S19/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   └── PerkDB.json
│   │   ├── S20/
│   │   │   ├── Charms/
│   │   │   │   ├── PerkCharms/
│   │   │   │   │   └── CustomizationItemDB.json
│   │   │   │   └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S21/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── ScoreDB.json
│   │   ├── S22/
│   │   │   ├── Charms/
│   │   │   │   ├── PerkCharms/
│   │   │   │   │   └── CustomizationItemDB.json
│   │   │   │   └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S23/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S24/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S25/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   └── PerkDB.json
│   │   ├── S26/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   └── PerkDB.json
│   │   ├── S27/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S28/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S29/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S30/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S31/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S32/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   └── PerkDB.json
│   │   ├── S33/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S34/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S35/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S36/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S37/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S38/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── S38TunableValues.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S39/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S40/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S41/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── S42/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   ├── SubtitlesDB.json
│   │   │   └── TunableValuesDB.json
│   │   ├── S43/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S44/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── ItemAddonDB.json
│   │   │   ├── ItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S45/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S46/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S47/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S48/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S49/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── S49_TunableValue.json
│   │   │   ├── ScoreDB.json
│   │   │   ├── StatusEffectDB.json
│   │   │   └── SubtitlesDB.json
│   │   ├── S50/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CharacterDescriptionOverrideDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S51/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   ├── S52/
│   │   │   ├── Charms/
│   │   │   │   └── PerkCharms/
│   │   │   │       └── CustomizationItemDB.json
│   │   │   ├── CharacterDescriptionDB.json
│   │   │   ├── CustomizationItemDB.json
│   │   │   ├── OutfitDB.json
│   │   │   ├── PerkDB.json
│   │   │   ├── ScoreDB.json
│   │   │   └── StatusEffectDB.json
│   │   └── S53/
│   │       ├── Charms/
│   │       │   └── PerkCharms/
│   │       │       └── CustomizationItemDB.json
│   │       ├── CharacterDescriptionDB.json
│   │       ├── CustomizationItemDB.json
│   │       ├── OutfitDB.json
│   │       ├── PerkDB.json
│   │       ├── PerkTunablesDB.json
│   │       ├── ScoreDB.json
│   │       └── StatusEffectDB.json
│   ├── characters_dump - Copy.json
│   ├── characters_dump.json
│   ├── characters_dump_de.json
│   ├── characters_dump_es.json
│   ├── characters_dump_ja.json
│   ├── characters_dump_pl.json
│   ├── create_translations.py
│   ├── de.json
│   ├── en.json
│   ├── errors.txt
│   ├── es.json
│   ├── hentai.py
│   ├── ja.json
│   └── pl.json
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── lemon2.py
├── lemon3.py
├── prompt.md
├── prompt2.md
├── response.md
├── run_tests.py
└── structure.md
```
