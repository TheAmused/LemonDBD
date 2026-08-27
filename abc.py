#!/usr/bin/env python3
"""
Interactive CLI utility that bundles all existing English locale dictionary files
along with selected source code snippets (or full files) into a single Markdown file.
This provides the AI with complete translation context so keys are never duplicated.
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# All known English locale definition files
LOCALE_FILES = [
    "src/locales/en/admin.ts",
    "src/locales/en/app.ts",
    "src/locales/en/builds.ts",
    "src/locales/en/card.ts",
    "src/locales/en/characterDetail.ts",
    "src/locales/en/draft.ts",
    "src/locales/en/empty.ts",
    "src/locales/en/filters.ts",
    "src/locales/en/generator.ts",
    "src/locales/en/guesser.ts",
    "src/locales/en/index.ts",
    "src/locales/en/landing.ts",
    "src/locales/en/maps.ts",
    "src/locales/en/modal.ts",
    "src/locales/en/pagination.ts",
    "src/locales/en/sidebar.ts",
    "src/locales/en/smashOrPass.ts",
    "src/locales/en/stats.ts",
    "src/locales/en/streaks.ts",
    "src/locales/en/swf.ts",
    "src/locales/en/user.ts",
    "src/locales/en/voice.ts",
]

FLAGGED_GROUPS: Dict[str, Tuple[str, Dict[str, List[int]]]] = {
    "1": (
        "App Pages & Route Layouts",
        {
            "src/app/[locale]/builds/page.tsx": [70],
            "src/app/[locale]/characters/guesser/page.tsx": [657, 772, 837, 902, 967, 1032, 1095, 1138, 1149, 1205, 1264, 1274, 1417],
            "src/app/[locale]/characters/page.tsx": [66],
            "src/app/[locale]/custom-perks/page.tsx": [70],
            "src/app/[locale]/draft/page.tsx": [77],
            "src/app/[locale]/killer-calculator/page.tsx": [70],
            "src/app/[locale]/maps/page.tsx": [55, 95, 161],
            "src/app/[locale]/page.tsx": [92],
            "src/app/[locale]/perks/page.tsx": [465],
            "src/app/[locale]/quests/page.tsx": [43, 111, 162, 165, 169, 231, 242, 261],
            "src/app/[locale]/reset-password/page.tsx": [36],
            "src/app/[locale]/smash-or-pass/page.tsx": [32, 65],
            "src/app/[locale]/streaks/layout.tsx": [36, 85, 138, 147, 156, 159, 168],
            "src/app/[locale]/swf/page.tsx": [30, 68],
            "src/app/[locale]/user/page.tsx": [55, 191, 194, 209, 339, 402],
        },
    ),
    "2": (
        "Admin Components",
        {
            "src/components/admin/AdminBugReportsWorkbench.tsx": [100, 116, 132, 148, 194, 198, 305, 335, 374],
            "src/components/admin/AdminChallengeControl.tsx": [205, 250, 259],
            "src/components/admin/AdminChallengeStats.tsx": [74],
            "src/components/admin/AdminCreateUserModal.tsx": [69, 72, 80, 94, 108, 122, 141],
            "src/components/admin/AdminHeader.tsx": [41, 44],
            "src/components/admin/AdminReasonModal.tsx": [78, 97],
            "src/components/ScraperConfigModal.tsx": [353, 439, 486, 551, 561, 576, 593, 604, 626, 667, 714],
        },
    ),
    "3": (
        "General & Shared UI Modals",
        {
            "src/components/AuthModal.tsx": [213, 249, 268, 287, 354, 386, 392, 399],
            "src/components/ChaosWheelModal.tsx": [226, 229, 280, 292],
            "src/components/CharacterConfigModal.tsx": [153, 215],
            "src/components/CharactersHub.tsx": [314, 440, 588, 630, 660, 681, 702, 709],
            "src/components/QuestsModal.tsx": [120, 188, 200, 213, 315],
            "src/components/Sidebar.tsx": [311, 495],
            "src/components/sidebar/BugReportModal.tsx": [372],
            "src/utils/textFormatter.tsx": [706],
        },
    ),
    "4": (
        "Builds & Custom Perk Studio",
        {
            "src/components/builds/BuildVault.tsx": [247, 251, 254, 341, 656],
            "src/components/perk-studio/CustomPerkStudio.tsx": [280, 283, 348, 364, 396, 411, 434, 462, 477, 485, 492, 499, 530, 533, 596, 684, 693],
        },
    ),
    "5": (
        "Draft, Killer Calculator & SWF",
        {
            "src/components/draft/DraftRoom.tsx": [322],
            "src/components/killer/KillerCalculator.tsx": [278, 283, 286, 298, 339, 389, 496, 545, 598],
            "src/components/swf/SwfPlanner.tsx": [489, 686],
        },
    ),
    "6": (
        "Tactical Maps",
        {
            "src/components/maps/FullscreenMapEngine.tsx": [351],
            "src/components/maps/layouts/DesktopMapLayout.tsx": [115],
            "src/components/maps/layouts/MobileMapLayout.tsx": [306],
            "src/components/maps/MapControls.tsx": [101],
            "src/components/maps/MapDirectoryList.tsx": [142],
            "src/components/maps/MapLegendDrawer.tsx": [221],
            "src/components/maps/TileInspectorDrawer.tsx": [198, 219, 221, 229, 234, 243, 248],
            "src/components/maps/VoiceCommandBanner.tsx": [877, 890],
            "src/components/maps/VoiceEngineInfoModal.tsx": [109, 121, 131],
        },
    ),
    "7": (
        "Smash or Pass",
        {
            "src/components/smash-or-pass/CharacterCard.tsx": [451, 467],
            "src/components/smash-or-pass/CharacterStatsModal.tsx": [236],
            "src/components/smash-or-pass/SmashLeaderboardModal.tsx": [379],
        },
    ),
    "8": (
        "Streaks & Challenges",
        {
            "src/components/streaks/chaos/ChaosBoard.tsx": [177, 180, 188, 206, 216, 226, 233],
            "src/components/streaks/chaos/ChaosCheckpointModal.tsx": [39, 43, 51],
            "src/components/streaks/chaos/ChaosHeader.tsx": [53, 63, 75, 87],
            "src/components/streaks/chaos/ChaosRulesModal.tsx": [33, 36, 42, 45, 48, 51, 54, 61, 77, 85, 89, 93, 96, 99],
            "src/components/streaks/gauntlet/ActiveTargetStage.tsx": [257, 300, 306, 346, 349, 433],
            "src/components/streaks/gauntlet/CharacterRosterGrid.tsx": [57, 60, 109],
            "src/components/streaks/gauntlet/CheckpointModal.tsx": [42, 46, 64],
            "src/components/streaks/gauntlet/GauntletBoard.tsx": [126, 137],
            "src/components/streaks/gauntlet/GauntletHeader.tsx": [47, 57, 69, 81],
            "src/components/streaks/gauntlet/GauntletRulesModal.tsx": [68, 77, 82, 88, 98, 104, 107, 110, 117, 154, 169, 183],
            "src/components/streaks/gauntlet/GauntletStatsDrawer.tsx": [19],
            "src/components/streaks/history/HistoryBoard.tsx": [114, 125, 132, 159, 168, 175],
            "src/components/streaks/history/HistoryHeader.tsx": [54, 65, 77, 89],
            "src/components/streaks/history/HistoryPerkPoolPanel.tsx": [103],
            "src/components/streaks/history/HistoryRulesModal.tsx": [27, 30, 34, 38, 41, 44, 51, 56, 65, 68],
            "src/components/streaks/page-streak/PageStreakRulesModal.tsx": [27, 30, 35, 39, 43, 50, 55, 58, 63, 66],
            "src/components/streaks/page-streak/StartRunPanel.tsx": [47],
            "src/components/streaks/StreakPanel.tsx": [67, 71],
            "src/components/streaks/StreakStatsDrawer.tsx": [126, 140, 148, 154, 164, 169, 194],
        },
    ),
    "9": (
        "User Profile & Metrics",
        {
            "src/components/user/UserMetricsGrid.tsx": [52, 80, 108],
            "src/components/user/UserProfileForm.tsx": [106],
        },
    ),
}


def find_frontend_root() -> Path:
    current = Path.cwd()
    if (current / "src").is_dir() and (current / "package.json").is_file():
        return current
    if (current / "frontend" / "src").is_dir():
        return current / "frontend"
    return current


def merge_ranges(line_numbers: List[int], context: int, total_lines: int) -> List[Tuple[int, int]]:
    if not line_numbers:
        return []
    raw_spans = []
    for line in sorted(line_numbers):
        start = max(1, line - context)
        end = min(total_lines, line + context)
        raw_spans.append((start, end))

    merged = [raw_spans[0]]
    for current in raw_spans[1:]:
        prev_start, prev_end = merged[-1]
        if current[0] <= prev_end + 1:
            merged[-1] = (prev_start, max(prev_end, current[1]))
        else:
            merged.append(current)
    return merged


def main() -> None:
    frontend_root = find_frontend_root()

    print("=" * 70)
    print(" LemonDBD - Complete i18n Context & Snippet Exporter")
    print("=" * 70)
    print("This utility bundles all English locale dictionaries + code snippets.")
    print("-" * 70)

    for key, (name, files_dict) in sorted(FLAGGED_GROUPS.items()):
        total_issues = sum(len(lines) for lines in files_dict.values())
        print(f"  [{key}] {name} ({len(files_dict)} files, {total_issues} flagged strings)")
    print("  [A] All Groups")
    print("=" * 70)

    choice = input("\nSelect code group(s) to export (e.g. '1', '2,3', or 'A'): ").strip()
    if not choice:
        print("No selection made. Exiting.")
        sys.exit(0)

    selected_groups: List[str] = []
    if choice.upper() == "A":
        selected_groups = list(FLAGGED_GROUPS.keys())
    else:
        for t in [x.strip() for x in choice.split(",") if x.strip()]:
            if t in FLAGGED_GROUPS:
                selected_groups.append(t)

    if not selected_groups:
        print("No valid group selected. Exiting.")
        sys.exit(1)

    export_mode = input("\nExport format: [1] Snippets with line ranges (recommended) | [2] Full files [default: 1]: ").strip()
    use_snippets = export_mode != "2"

    context = 3
    if use_snippets:
        ctx_in = input("Context lines around flagged strings [default: 3]: ").strip()
        if ctx_in.isdigit():
            context = int(ctx_in)

    default_out = f"i18n_context_bundle_group_{'_'.join(selected_groups)}.md"
    out_input = input(f"Output markdown filename [default: {default_out}]: ").strip()
    out_filename = out_input if out_input else default_out
    out_path = frontend_root / out_filename

    exported_locales = 0
    exported_snippets = 0

    with open(out_path, "w", encoding="utf-8") as out:
        out.write("# i18n Context Bundle (Existing Locales + Target Code Snippets)\n\n")
        out.write("> Instructions for AI:\n")
        out.write("> 1. Review existing translation keys in SECTION 1 to reuse keys or follow structure.\n")
        out.write("> 2. Replace hardcoded strings in SECTION 2 using `useTranslations` hooks or `t('key')`.\n")
        out.write("> 3. Output updated locale files or targeted line edits matching `lemon2.py` formatting.\n\n")

        # =========================================================================
        # SECTION 1: ALL CURRENT EN LOCALE FILES
        # =========================================================================
        out.write("# =====================================================================\n")
        out.write("# SECTION 1: EXISTING EN LOCALE DICTIONARIES (FOR REFERENCE)\n")
        out.write("# =====================================================================\n\n")

        for loc_path in LOCALE_FILES:
            full_loc_path = frontend_root / loc_path
            if full_loc_path.is_file():
                try:
                    content = full_loc_path.read_text(encoding="utf-8")
                    out.write(f"### {loc_path}\n")
                    out.write("```typescript\n")
                    out.write(content)
                    if not content.endswith("\n"):
                        out.write("\n")
                    out.write("```\n\n")
                    exported_locales += 1
                except Exception as e:
                    print(f"⚠️  Error reading locale {loc_path}: {e}")

        # =========================================================================
        # SECTION 2: TARGET CODE SNIPPETS / FILES
        # =========================================================================
        out.write("# =====================================================================\n")
        out.write("# SECTION 2: SOURCE CODE TARGETS REQUIRING TRANSLATION\n")
        out.write("# =====================================================================\n\n")

        for group_key in selected_groups:
            group_name, files_dict = FLAGGED_GROUPS[group_key]
            out.write(f"## Group {group_key}: {group_name}\n\n")

            for rel_path, flag_lines in files_dict.items():
                full_path = frontend_root / rel_path
                normalized_path = rel_path.replace("\\", "/")

                if not full_path.is_file():
                    print(f"⚠️  File not found: {full_path}")
                    continue

                content = full_path.read_text(encoding="utf-8")
                all_lines = content.splitlines()

                if use_snippets:
                    spans = merge_ranges(flag_lines, context, len(all_lines))
                    out.write(f"### {normalized_path}\n")
                    out.write(f"- Flagged line numbers: `{flag_lines}`\n\n")

                    for start_l, end_l in spans:
                        snippet_lines = all_lines[start_l - 1: end_l]
                        out.write(f"#### `{normalized_path}:{start_l}-{end_l}`\n")
                        out.write("```tsx\n")
                        out.write("\n".join(snippet_lines) + "\n")
                        out.write("```\n\n")
                        exported_snippets += 1
                else:
                    out.write(f"### {normalized_path}\n")
                    out.write(f"- Flagged line numbers: `{flag_lines}`\n")
                    out.write("```tsx\n")
                    out.write(content)
                    if not content.endswith("\n"):
                        out.write("\n")
                    out.write("```\n\n")
                    exported_snippets += 1

    print("\n" + "-" * 70)
    print("✅ Context bundle created successfully!")
    print(f"📄 Output file     : {out_path.resolve()}")
    print(f"📚 Locales bundled : {exported_locales} files")
    print(f"✂️  Code targets    : {exported_snippets} items")
    print("-" * 70)


if __name__ == "__main__":
    main()