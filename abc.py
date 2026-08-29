#!/usr/bin/env python3
"""
Utility bundling target TSX components with hardcoded i18n strings
into Markdown files grouped in batches of 5.
"""

from pathlib import Path

TARGET_FILES = [
    "src/app/[locale]/admin/page.tsx",
    "src/app/[locale]/quests/page.tsx",
    "src/components/admin/AdminBugReportsWorkbench.tsx",
    "src/components/builds/BuildVault.tsx",
    "src/components/character-detail/components/CharacterHeroAvatar.tsx",
    "src/components/character-detail/components/OfferingsSection.tsx",
    "src/components/character-detail/components/SurvivorEquipmentSection.tsx",
    "src/components/character-detail/KillerDetailView.tsx",
    "src/components/character-detail/SurvivorDetailView.tsx",
    "src/components/killer/KillerCalculator.tsx",
    "src/components/maps/layouts/DesktopMapLayout.tsx",
    "src/components/maps/layouts/MobileMapLayout.tsx",
    "src/components/maps/FullscreenMapEngine.tsx",
    "src/components/maps/MapCanvas.tsx",
    "src/components/maps/MapControls.tsx",
    "src/components/maps/MapDirectoryList.tsx",
    "src/components/maps/MapLegendDrawer.tsx",
    "src/components/maps/VoiceCommandBanner.tsx",
    "src/components/maps/VoiceEngineInfoModal.tsx",
    "src/components/perk-studio/CustomPerkStudio.tsx",
    "src/components/sidebar/BugReportModal.tsx",
    "src/components/sidebar/SidebarStatsCard.tsx",
    "src/components/smash-or-pass/CharacterCard.tsx",
    "src/components/smash-or-pass/RomancePersonaModal.tsx",
    "src/components/smash-or-pass/RosterSelectModal.tsx",
    "src/components/smash-or-pass/SmashLeaderboardModal.tsx",
    "src/components/streaks/chaos/ChaosBoard.tsx",
    "src/components/streaks/chaos/ChaosPerkPoolModal.tsx",
    "src/components/streaks/gauntlet/ActiveTargetStage.tsx",
    "src/components/streaks/gauntlet/CheckpointModal.tsx",
    "src/components/streaks/gauntlet/GauntletRulesModal.tsx",
    "src/components/streaks/page-streak/BuildBar.tsx",
    "src/components/streaks/page-streak/KillerRosterGrid.tsx",
    "src/components/streaks/page-streak/RunHeader.tsx",
    "src/components/ChaosWheelModal.tsx",
    "src/components/ConfirmModal.tsx",
    "src/components/PerkGenerator.tsx",
    "src/components/QuestsModal.tsx",
    "src/components/UserAvatar.tsx",
    "src/components/WheelOfFortune.tsx",
]

BATCH_SIZE = 5

def find_frontend_root() -> Path:
    current = Path.cwd()
    if (current / "src").is_dir() and (current / "package.json").is_file():
        return current
    if (current / "frontend" / "src").is_dir():
        return current / "frontend"
    return current

def main() -> None:
    frontend_root = find_frontend_root()

    print("=" * 70)
    print(" LemonDBD - i18n Target Components Exporter (Batches of 5)")
    print("=" * 70)

    # Dzielenie na paczki po BATCH_SIZE
    batches = [
        TARGET_FILES[i : i + BATCH_SIZE]
        for i in range(0, len(TARGET_FILES), BATCH_SIZE)
    ]

    for batch_idx, batch_files in enumerate(batches, start=1):
        out_filename = f"i18n_batch_{batch_idx}.md"
        out_path = frontend_root / out_filename
        bundled_in_batch = 0

        print(f"\n📦 Generowanie paczki {batch_idx}/{len(batches)} -> {out_filename}")

        with open(out_path, "w", encoding="utf-8") as out:
            out.write(f"# i18n Fix Batch {batch_idx} ({len(batch_files)} files)\n\n")

            for rel_str in batch_files:
                file_path = frontend_root / rel_str

                if not file_path.is_file():
                    print(f"  ❌ Plik nie istnieje: {rel_str}")
                    continue

                try:
                    content = file_path.read_text(encoding="utf-8")
                    ext = file_path.suffix.lstrip(".")
                    lang_tag = ext if ext else "tsx"

                    out.write(f"### {rel_str}\n")
                    out.write(f"```{lang_tag}\n")
                    out.write(content)
                    if not content.endswith("\n"):
                        out.write("\n")
                    out.write("```\n\n")

                    bundled_in_batch += 1
                    print(f"  [+] Zapisano: {rel_str}")
                except Exception as e:
                    print(f"  ⚠️ Błąd odczytu {rel_str}: {e}")

        print(f"  -> Zapisano {bundled_in_batch} plików w: {out_path.resolve()}")

    print("\n" + "-" * 70)
    print(f"✅ Wygenerowano {len(batches)} paczek po maks. {BATCH_SIZE} plików.")
    print("-" * 70)

if __name__ == "__main__":
    main()