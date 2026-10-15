# Adopcja wspólnych komponentów i porządek w border radius

Checklista do brancha `refactor/adopt-shared-components` (odciąć od `develop`). Wygenerowana 2026-10-15 analizą statyczną JSX (ts-morph). Numery to linie początku elementu w pliku, w nawiasie bieżący `rounded-*`, jeśli jest.

Zakres: cały frontend poza `components/common`. Strony z listy do usunięcia (Guesser, Draft Room, SWF Planner, Killer Calc, Build Vault, Perk Studio, Quests) już nie istnieją w kodzie.

Ograniczenia analizy: liczone są tylko klasy zapisane wprost w `className`. Klasy z zewnętrznych stałych mogą dać kilka pozycji więcej. Heurystyki (np. "ostylowany button" = bg lub border plus padding lub rozmiar) mogą zgłosić fałszywe trafienia, więc każdą pozycję trzeba obejrzeć przy zamianie.

## Podsumowanie

| Kategoria | Docelowy komponent | Pozycji |
|---|---|---|
| Karty `div` z border, bg i rounded | `Surface` | 204 |
| Ostylowane `<button>` | `Button` / `IconButton` | 84 (z 127) |
| Natywne `title=` | `Tooltip` / `tip()` | 113 |
| `span` jako chip lub pill | `Badge` / `InfoChip` | 74 |
| Linki wyglądające jak przyciski | `buttonClassName()` | 22 |
| Ramki `border-dashed` | `EmptyState` / `Surface tone="dashed"` | 13 |
| `animate-pulse` ręcznie | `SkeletonBlock` | 9 |
| `<input>` tekstowy | `Input` / `HexColorInput` | 8 |
| `fixed inset-0` | `Modal` (część to tła, patrz uwagi) | 5 |
| `role=switch` na buttonie | `Switch` | 1 |
| Niestylowane `<button>` do oceny | `IconButton` / `Button ghost` | 85 |
| Nadpisania radiusu w `Button`/`Input`/`Select`/`Checkbox`/`Popover` | usunąć lub użyć wariantu | 42 |
| Radius poza skalą (`rounded`, `sm`, `xs`, `[3px]`) | tokeny | 27 |

## Stan obecny border radius

Źródło: `frontend/src/app/styles/tokens.css`. Nadpisane tylko `xl`, `2xl`, `3xl`.

| Klasa | Wartość | Użyć w kodzie |
|---|---|---|
| `rounded-xs` / `sm` / `rounded` | 2 / 4 / 4 px | 1 / 6 / 42 |
| `rounded-md` | 6 px | 38 |
| `rounded-lg` | 8 px | 149 |
| `rounded-xl` | 15 px | 302 |
| `rounded-2xl` | 16 px | 233 |
| `rounded-3xl` | 18 px | 85 |
| `rounded-full` | pełne | 153 |

Problem: `xl`, `2xl` i `3xl` różnią się o 1 do 2 px, a w kodzie jest ich ponad 600 użyć. Nie ma tokenów ról. Primitywy mają własne rozmiary: `Button` xs/sm `lg`, md/lg `xl`; `Field` sm `lg`, md/lg `xl`; `Surface` domyślnie `2xl`; `Modal` i `BlockCard` `3xl`; `Popover` i menu `CustomDropdown` `2xl`; `Tooltip` `lg`; `Badge` `full` lub `md`; `InfoChip` `md`; `NsfwBadge` `lg`; `Pagination` `lg` i `md`.

### Decyzje (2026-10-15)

- [x] Poziomy: chip, control, card, modal plus `full`.
- [x] Wartości: chip 6 px, control 12 px, card 16 px, modal 20 px.
- [x] Zmiana ma być uporządkowana w kodzie, nie wizualnie duża. Elementy niemal identyczne scalać zamiast trzymać kilka wariantów.
- [x] `Button` i `Field` NIE przyjmują nadpisania radiusu przez `className`. Tylko tokeny: `rounded-chip`, `rounded-control`, `rounded-card`, `rounded-modal`, `rounded-full`, `rounded-none`. Bez `rounded-[..]` i bez starej skali Tailwinda.
- [x] Responsywność: radius jest jeden dla wszystkich szerokości (wyjątek: dolny arkusz i pełny ekran w `Modal`). Reszta wariantów mobilnych to decyzja wykonawcza, cel: układ mobilny i tabletowy nie może się rozsypać.
- [x] Tooltipy: nie scalać i nie ruszać wariantów (przegląd ręczny jest osobnym zadaniem). Wymóg: każdy tooltip w aplikacji należy do jednego z wariantów z `TOOLTIP_CONFIG.variants`, bez duplikatów i bez własnych dymków (patrz sekcja 16).

### Kroki

- [x] Dodać tokeny ról w `tokens.css` (stara skala Tailwinda wyłączona przez `--radius-*: initial`).
- [x] Przepiąć primitywy: `Button`, `Field`, `Surface`, `Modal` (`modalConfig`), `Popover`, `CustomDropdown`, `Tooltip`, `Tabs`, `SegmentedControl`, `Badge`, `InfoChip`, `LinkPill`, `Pagination`, `Skeleton`, `EmptyState`, `BlockCard`, `NsfwBadge`.
- [ ] Przejść listy poniżej obszarami, po jednym commicie na obszar.
- [~] Guard w `check:styles`: radius gotowy (stara skala, wartości arbitralne, nadpisania w `Button`/`Input`/`Select`/`Surface`/`Badge`/`InfoChip`). Reszta (ostylowany `<button>`, `title=`) po zakończeniu zamian. Było: surowe `rounded-*` na `button`, `input` i kartach poza primitywami, ostylowany `<button>`, `title=` poza `Tooltip`, `rounded-[..]`.

## 1. Karty na Surface (204)

Wzorzec: `div`/`section`/`article`/`aside`/`li` z `border`, `bg-bg-surface` lub `bg-bg-elevated` i `rounded-lg/xl/2xl/3xl`. Zamienić na `<Surface tone radius padding>`. Karty z wariantem gradientu lub efektem mogą zostać, ale bez własnego radiusu.

**streaks** (37)

- [ ] `streaks/ChallengeCompletionHistoryDrawer.tsx` : 40 (rounded-xl), 46 (rounded-xl)
- [ ] `streaks/ChallengeIntroModalShell.tsx` : 166 (rounded-2xl)
- [ ] `streaks/ChallengePanel.tsx` : 21 (rounded-2xl), 101 (rounded-xl)
- [ ] `streaks/FreezeBadge.tsx` : 19 (rounded-xl)
- [ ] `streaks/RulesModalSections.tsx` : 40 (rounded-xl), 86 (rounded-xl)
- [ ] `streaks/RulesModalShell.tsx` : 56 (rounded-xl)
- [ ] `streaks/StreakMatchRow.tsx` : 22 (rounded-xl)
- [ ] `streaks/StreakStatsDrawer.tsx` : 70 (rounded-xl), 84 (rounded-xl), 92 (rounded-xl), 100 (rounded-xl), 107 (rounded-xl), 121 (rounded-xl)
- [ ] `streaks/StreaksLayoutShell.tsx` : 71 (rounded-2xl), 91 (rounded-2xl)
- [ ] `streaks/chaos/ChaosBoard.tsx` : 203 (rounded-2xl), 247 (rounded-2xl)
- [ ] `streaks/chaos/ChaosPerkPoolModal.tsx` : 16 (rounded-lg)
- [ ] `streaks/gauntlet/ActiveTargetStage.tsx` : 212 (rounded-xl), 242 (rounded-xl)
- [ ] `streaks/gauntlet/ActiveTargetStageParts.tsx` : 273 (rounded-xl)
- [ ] `streaks/gauntlet/CharacterRosterGrid.tsx` : 64 (rounded-2xl)
- [ ] `streaks/gauntlet/GauntletRulesModal.tsx` : 284 (rounded-xl)
- [ ] `streaks/gauntlet/ShieldPromptModal.tsx` : 34 (rounded-3xl)
- [ ] `streaks/gauntlet/TokenRollModal.tsx` : 49 (rounded-3xl)
- [ ] `streaks/gauntlet/TokenRoulette.tsx` : 77 (rounded-2xl)
- [ ] `streaks/history/HistoryNextRowPreview.tsx` : 21 (rounded-lg)
- [ ] `streaks/history/HistoryPerkModal.tsx` : 36 (rounded-lg)
- [ ] `streaks/history/HistoryPerkPoolPanel.tsx` : 20 (rounded-lg), 43 (rounded-lg), 106 (rounded-2xl)
- [ ] `streaks/history/HistoryRowClearedBanner.tsx` : 25 (rounded-xl)
- [ ] `streaks/page-streak/BuildPanel.tsx` : 45 (rounded-2xl)
- [ ] `streaks/page-streak/PageStreakRunView.tsx` : 169 (rounded-2xl)

**smash-or-pass** (36)

- [ ] `smash-or-pass/CharacterCard.tsx` : 189 (rounded-3xl)
- [ ] `smash-or-pass/CharacterStatsModal.tsx` : 263 (rounded-2xl), 269 (rounded-2xl)
- [ ] `smash-or-pass/RomancePersonaModal.tsx` : 183 (rounded-3xl), 184 (rounded-3xl)
- [ ] `smash-or-pass/RosterSelectModal.tsx` : 96 (rounded-2xl), 208 (rounded-3xl)
- [ ] `smash-or-pass/SmashLeaderboardParts.tsx` : 101 (rounded-3xl), 133 (rounded-2xl), 156 (rounded-2xl)
- [ ] `smash-or-pass/TactileKeycaps.tsx` : 144 (rounded-2xl)
- [ ] `smash-or-pass/card/CardBackFace.tsx` : 108 (rounded-2xl), 136 (rounded-2xl), 187 (rounded-2xl)
- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 94 (rounded-lg)
- [ ] `smash-or-pass/creator/RomanceArchetypeBuilder.tsx` : 113 (rounded-3xl), 147 (rounded-2xl)
- [ ] `smash-or-pass/creator/RosterBasicsSection.tsx` : 110 (rounded-xl)
- [ ] `smash-or-pass/creator/SmashRosterCreator.tsx` : 197 (rounded-xl), 283 (rounded-xl)
- [ ] `smash-or-pass/creator/SmashRosterCreatorParts.tsx` : 220 (rounded-xl)
- [ ] `smash-or-pass/hub/HowToPlayModal.tsx` : 46 (rounded-xl), 69 (rounded-xl), 92 (rounded-xl), 94 (rounded-xl), 106 (rounded-xl)
- [ ] `smash-or-pass/hub/HubFilterDrawer.tsx` : 54 (rounded-2xl), 92 (rounded-2xl)
- [ ] `smash-or-pass/hub/HubHeader.tsx` : 160 (rounded-2xl)
- [ ] `smash-or-pass/persona/PersonaBreakdown.tsx` : 82 (rounded-xl), 89 (rounded-xl), 100 (rounded-xl), 107 (rounded-xl), 116 (rounded-xl), 133 (rounded-xl)
- [ ] `smash-or-pass/roster-select/RosterCarouselCard.tsx` : 164 (rounded-2xl)

**minigames** (29)

- [ ] `minigames/CharacterAutocomplete.tsx` : 253 (rounded-xl), 278 (rounded-lg)
- [ ] `minigames/MinigamesHub.tsx` : 196 (rounded-2xl), 236 (rounded-3xl), 262 (rounded-3xl), 288 (rounded-3xl), 326 (rounded-2xl), 346 (rounded-2xl), 366 (rounded-2xl), 386 (rounded-2xl), 406 (rounded-2xl), 426 (rounded-2xl), 505 (rounded-2xl)
- [ ] `minigames/VictoryModal.tsx` : 129 (rounded-2xl)
- [ ] `minigames/creator/MinigameCreator.tsx` : 285 (rounded-3xl), 401 (rounded-3xl)
- [ ] `minigames/creator/RoundEditorCard.tsx` : 148 (rounded-2xl), 245 (rounded-xl), 247 (rounded-lg)
- [ ] `minigames/guessers/AddonGuesser.tsx` : 26 (rounded-2xl)
- [ ] `minigames/guessers/AudioGuesser.tsx` : 162 (rounded-2xl)
- [ ] `minigames/guessers/ClassicCharacterGuesser.tsx` : 56 (rounded-lg)
- [ ] `minigames/guessers/ClassicPerkGuesser.tsx` : 45 (rounded-lg)
- [ ] `minigames/guessers/EmojiRiddleGuesser.tsx` : 27 (rounded-2xl)
- [ ] `minigames/guessers/KillerPowerGuesser.tsx` : 42 (rounded-2xl)
- [ ] `minigames/guessers/PerkIconGuesser.tsx` : 37 (rounded-2xl)
- [ ] `minigames/guessers/PixelAvatarGuesser.tsx` : 46 (rounded-2xl)
- [ ] `minigames/guessers/QuoteLoreGuesser.tsx` : 56 (rounded-2xl)
- [ ] `minigames/guessers/RealmGuesser.tsx` : 38 (rounded-2xl)

**admin** (17)

- [ ] `admin/AdminAuditLogView.tsx` : 95 (rounded-2xl)
- [ ] `admin/AdminBugReportsWorkbench.tsx` : 189 (rounded-3xl), 329 (rounded-3xl)
- [ ] `admin/AdminChallengeControl.tsx` : 213 (rounded-2xl), 251 (rounded-2xl), 253 (rounded-xl), 279 (rounded-xl)
- [ ] `admin/AdminChallengeStats.tsx` : 65 (rounded-2xl)
- [ ] `admin/AdminContentReportsWorkbench.tsx` : 60 (rounded-3xl), 144 (rounded-3xl)
- [ ] `admin/AdminStatsGrid.tsx` : 18 (rounded-2xl), 28 (rounded-2xl), 38 (rounded-2xl), 48 (rounded-2xl), 58 (rounded-2xl)
- [ ] `admin/AdminTabContentSkeleton.tsx` : 17 (rounded-3xl)
- [ ] `admin/AdminUserTable.tsx` : 68 (rounded-3xl)

**tier-lists** (16)

- [ ] `tier-lists/TierColorPicker.tsx` : 103 (rounded-2xl)
- [ ] `tier-lists/TierItemPreviewModal.tsx` : 57 (rounded-2xl)
- [ ] `tier-lists/TierItemTile.tsx` : 78 (rounded-xl)
- [ ] `tier-lists/TierListEditor.tsx` : 464 (rounded-2xl)
- [ ] `tier-lists/TierListHub.tsx` : 139 (rounded-3xl), 229 (rounded-3xl)
- [ ] `tier-lists/TierListScaleControl.tsx` : 88 (rounded-lg)
- [ ] `tier-lists/TierPool.tsx` : 80 (rounded-3xl)
- [ ] `tier-lists/TierRow.tsx` : 71 (rounded-2xl)
- [ ] `tier-lists/creator/CreatorItems.tsx` : 58 (rounded-lg)
- [ ] `tier-lists/creator/CreatorPreview.tsx` : 70 (rounded-2xl)
- [ ] `tier-lists/creator/LadderEditor.tsx` : 163 (rounded-lg)
- [ ] `tier-lists/creator/TierItemEditModal.tsx` : 96 (rounded-xl)
- [ ] `tier-lists/creator/TierListCreator.tsx` : 380 (rounded-xl), 440 (rounded-lg)
- [ ] `tier-lists/creator/TierListCreatorParts.tsx` : 66 (rounded-xl)

**character-detail** (13)

- [ ] `character-detail/components/CharacterHeroAvatar.tsx` : 43 (rounded-3xl)
- [ ] `character-detail/components/KillerCombatStats.tsx` : 21 (rounded-2xl)
- [ ] `character-detail/components/KillerEquipmentSection.tsx` : 43 (rounded-3xl), 62 (rounded-3xl)
- [ ] `character-detail/components/OfferingsSection.tsx` : 291 (rounded-3xl)
- [ ] `character-detail/components/SurvivorEquipmentSection.tsx` : 172 (rounded-3xl), 222 (rounded-3xl)
- [ ] `character-detail/modals/KillerPowerModal.tsx` : 43 (rounded-2xl), 62 (rounded-xl), 66 (rounded-xl), 70 (rounded-xl)
- [ ] `character-detail/modals/Model3DModal.tsx` : 20 (rounded-3xl)
- [ ] `character-detail/modals/TerrorRadiusModal.tsx` : 114 (rounded-xl)

**maps** (11)

- [ ] `maps/FullscreenMapEngine.tsx` : 175 (rounded-xl), 267 (rounded-2xl)
- [ ] `maps/MapExplorer.tsx` : 292 (rounded-3xl), 465 (rounded-2xl)
- [ ] `maps/VoiceCommandBanner.tsx` : 56 (rounded-3xl)
- [ ] `maps/VoiceEngineInfoModal.tsx` : 59 (rounded-2xl), 88 (rounded-2xl), 121 (rounded-2xl), 152 (rounded-2xl), 219 (rounded-2xl)
- [ ] `maps/voice/VoiceVariantPills.tsx` : 18 (rounded-2xl)

**user** (10)

- [ ] `user/CampfireHeader.tsx` : 61 (rounded-3xl), 74 (rounded-2xl)
- [ ] `user/DualMainsShowcase.tsx` : 46 (rounded-3xl)
- [ ] `user/MainCard.tsx` : 76 (rounded-2xl)
- [ ] `user/ShowcaseCharacterModal.tsx` : 62 (rounded-xl)
- [ ] `user/UserBugReportsDrawer.tsx` : 31 (rounded-3xl)
- [ ] `user/UserBugReportsList.tsx` : 146 (rounded-2xl)
- [ ] `user/UserProfileClient.tsx` : 131 (rounded-3xl)
- [ ] `user/UserProfileForm.tsx` : 169 (rounded-3xl)
- [ ] `user/VaultMasteryDials.tsx` : 60 (rounded-2xl)

**sidebar** (8)

- [ ] `sidebar/BugReportModal.tsx` : 216 (rounded-xl), 218 (rounded-lg), 291 (rounded-xl)
- [ ] `sidebar/BuyCoffeeModal.tsx` : 78 (rounded-2xl), 98 (rounded-xl)
- [ ] `sidebar/SidebarBottomControls.tsx` : 164 (rounded-xl), 219 (rounded-xl)
- [ ] `sidebar/SidebarUserSection.tsx` : 49 (rounded-xl)

**onboarding** (7)

- [ ] `onboarding/CharacterOnboardingWizard.tsx` : 97 (rounded-2xl)
- [ ] `onboarding/wizard/ChapterCard.tsx` : 59 (rounded-xl)
- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 30 (rounded-2xl), 36 (rounded-xl)
- [ ] `onboarding/wizard/OnboardingAuthRequired.tsx` : 18 (rounded-3xl)
- [ ] `onboarding/wizard/OnboardingIntroView.tsx` : 12 (rounded-2xl)
- [ ] `onboarding/wizard/OnboardingLanguageView.tsx` : 26 (rounded-2xl)

**generator** (5)

- [ ] `generator/modes/LootCrateStage.tsx` : 287 (rounded-2xl), 300 (rounded-2xl)
- [ ] `generator/modes/slot-machine/SlotReelRowMobile.tsx` : 131 (rounded-xl)
- [ ] `generator/shared/PerkSlot.tsx` : 94 (rounded-2xl)
- [ ] `generator/shared/RoleToggle.tsx` : 28 (rounded-xl)

**changelog** (4)

- [ ] `changelog/ChangelogEditorModal.tsx` : 205 (rounded-xl), 222 (rounded-xl), 334 (rounded-xl)
- [ ] `changelog/WhatsNewLauncher.tsx` : 350 (rounded-2xl)

**scraper-config** (3)

- [ ] `scraper-config/ImportTab.tsx` : 45 (rounded-2xl), 162 (rounded-lg)
- [ ] `scraper-config/TargetPicker.tsx` : 80 (rounded-xl)

**(root)** (2)

- [ ] `PerkFilters.tsx` : 236 (rounded-2xl), 359 (rounded-2xl)

**auth** (2)

- [ ] `auth/ResetPasswordClient.tsx` : 57 (rounded-2xl), 60 (rounded-2xl)

**achievements** (1)

- [ ] `achievements/TrophySlot.tsx` : 25 (rounded-xl)

**landing** (1)

- [ ] `landing/HomePage.tsx` : 37 (rounded-3xl)

**layout** (1)

- [ ] `layout/ErrorPage.tsx` : 55 (rounded-3xl)

**characters** (1)

- [ ] `characters/hub/CharacterCard.tsx` : 50 (rounded-2xl)


## 2. Przyciski na Button (84 zostało z 127)

Zrobione (2026-10-15): 53 przyciski zamienione na `Button` (warianty `primary`, `secondary`, `soft`, `ghost`, `danger`, `amber`, nowy `amberSoft`; `icon`, `pill`). Przyciski-ikony dostają teraz cel dotyku 44 px na telefonie z samego `Button` (`pointer-coarse`).

Zostało 84. To głównie elementy, które nie są zwykłymi przyciskami akcji i wymagają osobnych decyzji:

- przełączniki i zakładki (`aria-pressed`, `aria-selected`, `role=radio/switch`): kandydat na wspólny `ToggleChip` lub `SegmentedControl`/`Tabs` (około 30),
- kafle z obrazkiem, karty klikalne, nagłówki akordeonów (`aria-expanded`),
- przyciski gry z animacją (strzałki, akcje karty w Smash or Pass, klawisze `TactileKeycaps`, `VoiceMicButton`),
- przyciski z dynamiczną klasą zależną od stanu (aktywny/nieaktywny).

Lista poniżej to wszystko, co nadal wygląda jak przycisk. Każdą pozycję ocenić: `Button`, nowy `ToggleChip`, albo zostaje.

**smash-or-pass** (22)

- [ ] `smash-or-pass/CharacterCard.tsx` : 254 (rounded-control), 270 (rounded-control), 288 (rounded-control), 304 (rounded-control)
- [ ] `smash-or-pass/RosterSelectModal.tsx` : 98 (rounded-control), 110 (rounded-control), 172 (rounded-full), 185 (rounded-full)
- [ ] `smash-or-pass/TactileKeycaps.tsx` : 150 (rounded-control)
- [ ] `smash-or-pass/card/CardBackFace.tsx` : 65 (rounded-control)
- [ ] `smash-or-pass/creator/EntityEditor.tsx` : 179 (rounded-chip), 225 (rounded-chip)
- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 132 (rounded-chip)
- [ ] `smash-or-pass/creator/RomanceArchetypeBuilder.tsx` : 247 (rounded-control), 292 (rounded-control)
- [ ] `smash-or-pass/hub/HubFilterDrawer.tsx` : 55 (rounded-control), 69 (rounded-control), 93 (rounded-control), 114 (rounded-control)
- [ ] `smash-or-pass/hub/HubHeader.tsx` : 129 (rounded-control), 227 (rounded-control), 298 (rounded-control)

**tier-lists** (15)

- [ ] `tier-lists/TierColorPicker.tsx` : 83 (rounded-chip)
- [ ] `tier-lists/TierEditModal.tsx` : 154 (rounded-control)
- [ ] `tier-lists/TierListCards.tsx` : 78 (rounded-control), 250 (rounded-control)
- [ ] `tier-lists/TierListScaleControl.tsx` : 69 (rounded-control), 120 (rounded-chip)
- [ ] `tier-lists/TierRow.tsx` : 158 (rounded-control)
- [ ] `tier-lists/creator/CreatorItems.tsx` : 89 (rounded-chip)
- [ ] `tier-lists/creator/ItemSources.tsx` : 312 (rounded-control)
- [ ] `tier-lists/creator/LadderEditor.tsx` : 137 (rounded-control), 178, 188, 215, 234 (rounded-chip)
- [ ] `tier-lists/creator/TierListCreatorParts.tsx` : 67

**admin** (10)

- [ ] `admin/AdminBugReportsWorkbench.tsx` : 113 (rounded-control), 131 (rounded-control), 149 (rounded-control), 167 (rounded-control)
- [ ] `admin/AdminChallengeControl.tsx` : 230 (rounded-control), 254 (rounded-control), 266 (rounded-control), 280 (rounded-control), 292 (rounded-control)
- [ ] `admin/AdminContentReportsWorkbench.tsx` : 94 (rounded-control)

**changelog** (6)

- [ ] `changelog/ChangelogEditorModal.tsx` : 190 (rounded-full), 313 (rounded-control), 336 (rounded-full), 347 (rounded-full)
- [ ] `changelog/WhatsNewLauncher.tsx` : 370 (rounded-control), 511 (rounded-full)

**(root)** (4)

- [ ] `ChaosWheelModal.tsx` : 321 (rounded-control)
- [ ] `DisabledBadge.tsx` : 20 (rounded-full)
- [ ] `PerkFilters.tsx` : 365 (rounded-control)
- [ ] `Sidebar.tsx` : 314 (rounded-r-control)

**streaks** (4)

- [ ] `streaks/ChallengeIntroModalShell.tsx` : 176 (rounded-control)
- [ ] `streaks/ChallengePanel.tsx` : 131
- [ ] `streaks/gauntlet/LemonTokenPanel.tsx` : 39 (rounded-control)
- [ ] `streaks/page-streak/PageStreakRunView.tsx` : 173 (rounded-control)

**user** (4)

- [ ] `user/PerkDiamondSlot.tsx` : 58 (rounded-full)
- [ ] `user/ShowcasePerkModal.tsx` : 37 (rounded-control)
- [ ] `user/UserBugReportsList.tsx` : 151, 210 (rounded-control)

**generator** (4)

- [ ] `generator/modes/slot-machine/SlotReelRowMobile.tsx` : 189 (rounded-control)
- [ ] `generator/shared/IconToggleButton.tsx` : 28 (rounded-control)
- [ ] `generator/shared/RoleToggle.tsx` : 36 (rounded-control), 50 (rounded-control)

**character-detail** (3)

- [ ] `character-detail/KillerDetailView.tsx` : 113 (rounded-control)
- [ ] `character-detail/components/CategoryPicker.tsx` : 71 (rounded-control), 105

**maps** (3)

- [ ] `maps/MapCard.tsx` : 20 (rounded-control)
- [ ] `maps/VoiceEngineInfoModal.tsx` : 170 (rounded-control)
- [ ] `maps/voice/VoiceBannerHeader.tsx` : 149 (rounded-full)

**onboarding** (3)

- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 63
- [ ] `onboarding/wizard/ChapterToolbar.tsx` : 69 (rounded-control)
- [ ] `onboarding/wizard/OnboardingLanguageView.tsx` : 33 (rounded-control)

**minigames** (2)

- [ ] `minigames/ChallengeRunner.tsx` : 446 (rounded-full)
- [ ] `minigames/MinigamesHub.tsx` : 222 (rounded-chip)

**sidebar** (2)

- [ ] `sidebar/BugReportModal.tsx` : 312 (rounded-control)
- [ ] `sidebar/SidebarBottomControls.tsx` : 226

**characters** (2)

- [ ] `characters/hub/CharactersToolbar.tsx` : 87 (rounded-control)
- [ ] `characters/hub/VerificationNotice.tsx` : 24 (rounded-control)

## 3. Niestylowane przyciski do oceny (zostało 52)

Zwykle ikony i klikalne elementy kart, linki tekstowe (`type-strong text-accent-amber hover:...`, około 20 prawie identycznych: kandydat na wariant `link` w `Button`). Każdy ocenić osobno.

**tier-lists** (15)

- [ ] `tier-lists/TierListEditor.tsx` : 240, 261, 276, 291, 296, 300, 304, 315, 321
- [ ] `tier-lists/TierListHub.tsx` : 143, 256
- [ ] `tier-lists/TierPool.tsx` : 146
- [ ] `tier-lists/TierRow.tsx` : 81
- [ ] `tier-lists/creator/CreatorItems.tsx` : 76
- [ ] `tier-lists/creator/ItemSources.tsx` : 388

**streaks** (11)

- [ ] `streaks/ChallengeIntroModalShell.tsx` : 125
- [ ] `streaks/ChallengePanel.tsx` : 69, 222
- [ ] `streaks/StreakAttemptGroups.tsx` : 70
- [ ] `streaks/StreakPanel.tsx` : 134, 158
- [ ] `streaks/chaos/KillerPickerGrid.tsx` : 32
- [ ] `streaks/chaos/SlotMachineStage.tsx` : 342
- [ ] `streaks/history/HistoryNextRowPreview.tsx` : 49
- [ ] `streaks/page-streak/PageStreakRoster.tsx` : 24
- [ ] `streaks/page-streak/PerkTile.tsx` : 64

**user** (7)

- [ ] `user/DualMainsShowcase.tsx` : 48
- [ ] `user/ShowcaseCharacterModal.tsx` : 53
- [ ] `user/UserBugReportsDrawer.tsx` : 41
- [ ] `user/UserProfileForm.tsx` : 171, 297, 373, 402

**(root)** (5)

- [ ] `AuthModal.tsx` : 378, 401, 494
- [ ] `EmailVerificationForm.tsx` : 135
- [ ] `PerkCard.tsx` : 95

**characters** (4)

- [ ] `characters/PerksTogglePopup.tsx` : 98
- [ ] `characters/hub/CharactersToolbar.tsx` : 58, 71
- [ ] `characters/hub/VerificationNotice.tsx` : 31

**minigames** (4)

- [ ] `minigames/ChallengeRunner.tsx` : 559
- [ ] `minigames/CharacterAutocomplete.tsx` : 237
- [ ] `minigames/creator/MinigameCreator.tsx` : 340
- [ ] `minigames/creator/RoundEditorCard.tsx` : 267

**generator** (4)

- [ ] `generator/modes/TarotDeckStage.tsx` : 197, 248
- [ ] `generator/modes/slot-machine/SlotMachineIdle.tsx` : 25
- [ ] `generator/shared/PerkSlot.tsx` : 74

**smash-or-pass** (4)

- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 162
- [ ] `smash-or-pass/creator/RomanceArchetypeBuilder.tsx` : 322
- [ ] `smash-or-pass/creator/SmashRosterCreatorParts.tsx` : 226, 245

**admin** (3)

- [ ] `admin/AdminChallengeControl.tsx` : 321, 356
- [ ] `admin/AdminSettingsPanel.tsx` : 203

**maps** (3)

- [ ] `maps/MapExplorer.tsx` : 428
- [ ] `maps/voice/VoiceBannerHeader.tsx` : 161
- [ ] `maps/voice/VoiceMicButton.tsx` : 36

**scraper-config** (3)

- [ ] `scraper-config/ScraperConfigTabs.tsx` : 24
- [ ] `scraper-config/TargetPicker.tsx` : 38, 67

**sidebar** (3)

- [ ] `sidebar/BugReportModal.tsx` : 300
- [ ] `sidebar/SidebarNavLink.tsx` : 68
- [ ] `sidebar/SidebarUserSection.tsx` : 96

**auth** (2)

- [ ] `auth/TwoFactorChallengeForm.tsx` : 87, 95

**character-detail** (2)

- [ ] `character-detail/components/CharacterPerksSection.tsx` : 41
- [ ] `character-detail/components/CollapsibleDrawer.tsx` : 63

**onboarding** (2)

- [ ] `onboarding/wizard/ChapterCard.tsx` : 60
- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 40

**changelog** (1)

- [ ] `changelog/WhatsNewLauncher.tsx` : 384

**ui** (1)

- [ ] `ui/DiamondSlot.tsx` : 76

## 4. Natywne title= (113)

`title=` daje natywny tooltip bez stylu i bez obsługi dotyku. Zamienić na `Tooltip` / `tip()`. W nawiasie tag, na którym stoi atrybut.

**streaks** (39)

- [ ] `streaks/AbandonConfirmModal.tsx` : 19 (ConfirmModal)
- [ ] `streaks/ChallengeModeModal.tsx` : 113 (ChallengeIntroModalShell)
- [ ] `streaks/ChallengePanel.tsx` : 148 (HeaderButton), 198 (HeaderButton), 203 (HeaderButton), 208 (HeaderButton), 213 (HeaderButton)
- [ ] `streaks/PageStreakBoard.tsx` : 70 (ConfirmModal)
- [ ] `streaks/RulesModalSections.tsx` : 183 (RulesModalListSection), 188 (RulesModalListSection)
- [ ] `streaks/StreakPanelGrid.tsx` : 118 (StreakPanel), 134 (StreakPanel), 148 (StreakPanel), 166 (StreakPanel), 191 (StreakPanel), 216 (StreakPanel), 238 (StreakPanel)
- [ ] `streaks/chaos/ChaosBoard.tsx` : 188 (ChallengeVictoryCard)
- [ ] `streaks/chaos/ChaosHeader.tsx` : 70 (ModeSelectButton), 78 (HeaderButton)
- [ ] `streaks/chaos/ChaosRulesModal.tsx` : 28 (RulesModalShell), 46 (RulesSection), 33 (RulesHowItWorks)
- [ ] `streaks/gauntlet/GauntletBoard.tsx` : 202 (ChallengeVictoryCard), 292 (ShieldPromptModal)
- [ ] `streaks/gauntlet/GauntletHeader.tsx` : 62 (ModeSelectButton)
- [ ] `streaks/gauntlet/GauntletModeModal.tsx` : 144 (ChallengeModeModal)
- [ ] `streaks/gauntlet/GauntletRulesModal.tsx` : 254 (RulesModalShell), 265 (RulesSection), 260 (RulesConceptCard), 263 (RulesHowItWorks)
- [ ] `streaks/history/HistoryBoard.tsx` : 145 (ChallengeVictoryCard)
- [ ] `streaks/history/HistoryHeader.tsx` : 67 (ModeSelectButton)
- [ ] `streaks/history/HistoryRulesModal.tsx` : 28 (RulesModalShell), 46 (RulesSection), 33 (RulesHowItWorks)
- [ ] `streaks/page-streak/PageStreakRulesModal.tsx` : 25 (RulesModalShell), 30 (RulesHowItWorks)
- [ ] `streaks/page-streak/PageStreakRunView.tsx` : 123 (ChallengeVictoryCard)

**tier-lists** (24)

- [ ] `tier-lists/CustomTierListView.tsx` : 110 (AuthRequiredState), 121 (EmptyState), 128 (NsfwContentGate), 139 (TierListEditor)
- [ ] `tier-lists/OfficialTierListView.tsx` : 118 (EmptyState), 143 (EmptyState), 163 (NsfwContentGate), 178 (TierListEditor)
- [ ] `tier-lists/TierListEditor.tsx` : 524 (ConfirmModal), 540 (ConfirmModal)
- [ ] `tier-lists/TierListHub.tsx` : 189 (EmptyState), 204 (EmptyState), 323 (AuthRequiredState), 329 (EmptyState), 350 (ConfirmModal)
- [ ] `tier-lists/TierPool.tsx` : 209 (EmptyState)
- [ ] `tier-lists/creator/CreatorItems.tsx` : 52 (EmptyState)
- [ ] `tier-lists/creator/CreatorPreview.tsx` : 131 (CreatorPreview)
- [ ] `tier-lists/creator/TierListCreator.tsx` : 398 (Section), 467 (Section), 479 (Section), 203 (AuthRequiredState), 220 (EmptyState), 533 (CreatorPreviewModal)

**smash-or-pass** (15)

- [ ] `smash-or-pass/RosterSelectModal.tsx` : 201 (AuthRequiredState)
- [ ] `smash-or-pass/SmashOrPassHub.tsx` : 202 (AuthRequiredState)
- [ ] `smash-or-pass/creator/RosterBasicsSection.tsx` : 49 (Section)
- [ ] `smash-or-pass/creator/SmashRosterCreator.tsx` : 248 (Section), 265 (Section), 340 (Section), 140 (AuthRequiredState), 153 (EmptyState)
- [ ] `smash-or-pass/hub/DeckFinished.tsx` : 21 (EmptyState)
- [ ] `smash-or-pass/hub/HubHeader.tsx` : 186 (DockAction), 200 (DockAction), 210 (DockAction), 237 (DockAction), 248 (DockAction), 259 (DockAction)

**admin** (6)

- [ ] `admin/AdminBugReportsWorkbench.tsx` : 437 (EmptyState)
- [ ] `admin/AdminChallengeControl.tsx` : 393 (AdminReasonModal)
- [ ] `admin/AdminPanelClient.tsx` : 282 (ConfirmModal), 299 (ConfirmModal), 309 (ConfirmModal)
- [ ] `admin/ContentReportDetail.tsx` : 160 (ConfirmModal)

**minigames** (6)

- [ ] `minigames/MinigamesHub.tsx` : 490 (AuthRequiredState), 496 (EmptyState), 579 (ConfirmModal)
- [ ] `minigames/PlayTrialClient.tsx` : 137 (AuthRequiredState), 148 (NsfwContentGate)
- [ ] `minigames/creator/MinigameCreator.tsx` : 251 (AuthRequiredState)

**user** (6)

- [ ] `user/ShowcaseCharacterModal.tsx` : 178 (EmptyState)
- [ ] `user/ShowcasePerkModal.tsx` : 144 (EmptyState)
- [ ] `user/UserBugReportsList.tsx` : 127 (EmptyState)
- [ ] `user/VaultMasteryDials.tsx` : 172 (RadialDial), 184 (RadialDial), 196 (RadialDial)

**character-detail** (5)

- [ ] `character-detail/CharacterDetailClient.tsx` : 75 (EmptyState)
- [ ] `character-detail/components/CharacterBreadcrumbs.tsx` : 68 (Link), 78 (Link)
- [ ] `character-detail/components/OfferingsSection.tsx` : 369 (EmptyState)
- [ ] `character-detail/components/SurvivorEquipmentSection.tsx` : 242 (EmptyState)

**(root)** (3)

- [ ] `CharactersHub.tsx` : 134 (EmptyState)
- [ ] `ScraperConfigModal.tsx` : 59 (ConfirmModal), 69 (ConfirmModal)

**legal** (2)

- [ ] `legal/LegalSections.tsx` : 131 (BlockTitle)
- [ ] `legal/PrivacyPolicyClient.tsx` : 100 (BlockCard)

**sidebar** (2)

- [ ] `sidebar/BugReportModal.tsx` : 204 (SuccessState)
- [ ] `sidebar/SidebarUserSection.tsx` : 73 (Link)

**changelog** (1)

- [ ] `changelog/WhatsNewLauncher.tsx` : 490 (ConfirmModal)

**generator** (1)

- [ ] `generator/GeneratorPage.tsx` : 416 (ConfirmModal)

**maps** (1)

- [ ] `maps/MapExplorer.tsx` : 411 (EmptyState)

**perks** (1)

- [ ] `perks/PerksClient.tsx` : 310 (EmptyState)

**characters** (1)

- [ ] `characters/hub/SavedChangesModal.tsx` : 24 (SuccessState)


## 5. Chipy i pille (74)

Wzorzec: `span` z `rounded`, `px-*` i `bg-*`. Zamienić na `Badge` (kolorowy, klikalny lub nie) albo `InfoChip` (neutralny, informacyjny).

**minigames** (15)

- [ ] `minigames/CharacterAutocomplete.tsx` : 301 (rounded)
- [ ] `minigames/MinigamesHub.tsx` : 208 (rounded-full), 243 (rounded-full), 269 (rounded-full), 295 (rounded-full), 512 (rounded)
- [ ] `minigames/guessers/AudioGuesser.tsx` : 238 (rounded-lg), 243 (rounded-lg), 248 (rounded-lg)
- [ ] `minigames/guessers/KillerPowerGuesser.tsx` : 62 (rounded-lg), 67 (rounded-lg), 72 (rounded-lg)
- [ ] `minigames/guessers/QuoteLoreGuesser.tsx` : 72 (rounded-lg), 77 (rounded-lg), 82 (rounded-lg)

**smash-or-pass** (14)

- [ ] `smash-or-pass/CharacterStatsModal.tsx` : 144 (rounded-lg)
- [ ] `smash-or-pass/card/CardBackFace.tsx` : 87 (rounded-lg)
- [ ] `smash-or-pass/creator/EntityEditor.tsx` : 72 (rounded), 115 (rounded-md)
- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 104 (rounded)
- [ ] `smash-or-pass/creator/RomanceArchetypeBuilder.tsx` : 170 (rounded)
- [ ] `smash-or-pass/creator/RosterTaxonomyBlock.tsx` : 144 (rounded-xl), 233 (rounded-xl)
- [ ] `smash-or-pass/hub/HowToPlayModal.tsx` : 57 (rounded-lg), 61 (rounded-lg), 80 (rounded-lg), 84 (rounded-lg)
- [ ] `smash-or-pass/hub/HubHeader.tsx` : 147 (rounded-lg)
- [ ] `smash-or-pass/persona/PersonaBreakdown.tsx` : 61 (rounded-lg)

**tier-lists** (7)

- [ ] `tier-lists/OfficialTierListView.tsx` : 186 (rounded-lg)
- [ ] `tier-lists/TierListCards.tsx` : 137 (rounded-md), 155 (rounded-md), 236 (rounded-md)
- [ ] `tier-lists/TierListHub.tsx` : 164 (rounded-full), 286 (rounded-full)
- [ ] `tier-lists/creator/CreatorPreview.tsx` : 89 (rounded-full)

**admin** (6)

- [ ] `admin/AdminSettingsPanel.tsx` : 166 (rounded), 170 (rounded)
- [ ] `admin/AdminUserTable.tsx` : 124 (rounded-md), 132 (rounded-lg), 259 (rounded-md), 266 (rounded-lg)

**streaks** (6)

- [ ] `streaks/ChallengeIntroModalShell.tsx` : 185 (rounded-full), 192 (rounded-full)
- [ ] `streaks/StreakPanel.tsx` : 88 (rounded-full), 93 (rounded-full), 97 (rounded-full), 107 (rounded-full)

**user** (6)

- [ ] `user/CampfireHeader.tsx` : 115 (rounded-xl)
- [ ] `user/TwoFactorSection.tsx` : 65 (rounded-full)
- [ ] `user/UserBugReportsList.tsx` : 75 (rounded-lg), 82 (rounded-lg), 89 (rounded-lg), 97 (rounded-lg)

**(root)** (5)

- [ ] `PerkCard.tsx` : 105 (rounded)
- [ ] `PerkFilters.tsx` : 136 (rounded-full), 151 (rounded-full), 168 (rounded-full), 182 (rounded-full)

**character-detail** (5)

- [ ] `character-detail/components/CharacterHeroAvatar.tsx` : 86 (rounded-full), 96 (rounded-full)
- [ ] `character-detail/components/KillerEquipmentSection.tsx` : 75 (rounded-full)
- [ ] `character-detail/components/OfferingsSection.tsx` : 317 (rounded-full)
- [ ] `character-detail/components/SurvivorEquipmentSection.tsx` : 190 (rounded-full)

**maps** (3)

- [ ] `maps/MapExplorer.tsx` : 453 (rounded-full)
- [ ] `maps/VoiceEngineInfoModal.tsx` : 65 (rounded-full), 75 (rounded-full)

**sidebar** (2)

- [ ] `sidebar/BugReportModal.tsx` : 230 (rounded-md)
- [ ] `sidebar/SidebarUserSection.tsx` : 59 (rounded)

**onboarding** (2)

- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 58 (rounded)
- [ ] `onboarding/wizard/ChapterToolbar.tsx` : 40 (rounded-full)

**achievements** (1)

- [ ] `achievements/AchievementsHub.tsx` : 26 (rounded-2xl)

**scraper-config** (1)

- [ ] `scraper-config/TargetPicker.tsx` : 63 (rounded-md)

**characters** (1)

- [ ] `characters/hub/CharacterCard.tsx` : 67 (rounded-full)


## 6. Linki wyglądające jak przyciski (22)

Użyć `buttonClassName(variant, size)` lub `LinkPill`. `MinigamesHub` ma 11 powtórzonych kafli, do rozważenia jeden mały komponent.

**minigames** (12)

- [ ] `minigames/MinigamesHub.tsx` : 252, 278, 302, 336, 356, 376, 396, 416, 436, 473, 525
- [ ] `minigames/VictoryModal.tsx` : 118

**character-detail** (3)

- [ ] `character-detail/CharacterDetailClient.tsx` : 82
- [ ] `character-detail/components/CharacterBreadcrumbs.tsx` : 68, 78

**admin** (2)

- [ ] `admin/AdminHeader.tsx` : 80, 101

**landing** (1)

- [ ] `landing/HomePage.tsx` : 64

**layout** (1)

- [ ] `layout/ErrorPage.tsx` : 67

**streaks** (1)

- [ ] `streaks/RoleTabs.tsx` : 64

**user** (1)

- [ ] `user/CampfireHeader.tsx` : 151

**smash-or-pass** (1)

- [ ] `smash-or-pass/persona/PersonaShareView.tsx` : 86


## 7. Ramki dashed (13)

Zamienić na `EmptyState` (puste stany) albo `Surface tone="dashed"` (strefy upuszczania, placeholdery).

**smash-or-pass** (4)

- [ ] `smash-or-pass/RosterSelectModal.tsx` : 208
- [ ] `smash-or-pass/creator/EntityEditor.tsx` : 100
- [ ] `smash-or-pass/creator/RomanceArchetypeBuilder.tsx` : 138
- [ ] `smash-or-pass/creator/SmashRosterCreator.tsx` : 283

**streaks** (3)

- [ ] `streaks/StreaksLayoutShell.tsx` : 71, 91
- [ ] `streaks/history/HistoryPerkPoolPanel.tsx` : 43

**generator** (2)

- [ ] `generator/modes/LootCrateStage.tsx` : 300
- [ ] `generator/shared/PerkSlot.tsx` : 94

**changelog** (1)

- [ ] `changelog/WhatsNewLauncher.tsx` : 350

**scraper-config** (1)

- [ ] `scraper-config/ImportTab.tsx` : 45

**character-detail** (1)

- [ ] `character-detail/modals/TerrorRadiusModal.tsx` : 40

**tier-lists** (1)

- [ ] `tier-lists/creator/ItemSources.tsx` : 123


## 8. Ręczne skeletony animate-pulse (9)

Zamienić na `SkeletonBlock`. Dopasować kształt (radius) do docelowego elementu.

**smash-or-pass** (3)

- [ ] `smash-or-pass/hub/CardArena.tsx` : 68
- [ ] `smash-or-pass/hub/RosterModals.tsx` : 158
- [ ] `smash-or-pass/roster-select/RosterCarouselCard.tsx` : 173

**character-detail** (2)

- [ ] `character-detail/modals/TerrorRadiusModal.tsx` : 44, 54

**layout** (1)

- [ ] `layout/PageShellFallback.tsx` : 51

**scraper-config** (1)

- [ ] `scraper-config/ImportTab.tsx` : 66

**minigames** (1)

- [ ] `minigames/guessers/AudioGuesser.tsx` : 172

**streaks** (1)

- [ ] `streaks/gauntlet/CharacterRosterGrid.tsx` : 66


## 9. Inputy tekstowe (8)

Zamienić na `Input` (`fieldSize`). `RosterBasicsSection` to input koloru, rozważyć `HexColorInput`. `CodeInput` to specyficzne pole kodu, ocenić, czy `Input` wystarcza.

**(root)** (2)

- [ ] `EmailVerificationForm.tsx` : 108 ("text")
- [ ] `PerkFilters.tsx` : 330 ("text")

**smash-or-pass** (2)

- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 146 ("text")
- [ ] `smash-or-pass/creator/RosterBasicsSection.tsx` : 131 ("color")

**tier-lists** (2)

- [ ] `tier-lists/creator/CreatorItems.tsx` : 100 ("text")
- [ ] `tier-lists/creator/LadderEditor.tsx` : 205 ("text")

**auth** (1)

- [ ] `auth/CodeInput.tsx` : 74 ("text")

**streaks** (1)

- [ ] `streaks/history/HistoryPerkPoolPanel.tsx` : 113 ("search")


## 10. Przełącznik role=switch (1)

Zamienić na `Switch` (lub `SwitchTrack`, jeśli cała karta jest klikalna).

**onboarding** (1)

- [ ] `onboarding/wizard/ChapterCard.tsx` : 94


## 11. Overlaye fixed inset-0 (5)

Realne kandydaci do `Modal`: `smash-or-pass/hub/RosterModals.tsx` i do sprawdzenia `CalmVoteMark.tsx`. Pozostałe to tła i animacje pełnoekranowe (`layout/AppBackground.tsx`, `smash-or-pass/InteractiveDragBackground.tsx`, `smash-or-pass/SmashAnimations.tsx`), więc zostają.

**smash-or-pass** (4)

- [ ] `smash-or-pass/InteractiveDragBackground.tsx` : 440
- [ ] `smash-or-pass/SmashAnimations.tsx` : 503
- [ ] `smash-or-pass/hub/CalmVoteMark.tsx` : 32
- [ ] `smash-or-pass/hub/RosterModals.tsx` : 157

**layout** (1)

- [ ] `layout/AppBackground.tsx` : 40


## 12. Nadpisania radiusu w primitywach (42, ZROBIONE, pilnuje tego check:styles)

Radius ustawiony przez `className` na `Button`, `Input`, `Select`, `Checkbox`, `Popover`. Po wprowadzeniu tokenów usunąć lub zastąpić wariantem komponentu. Największe skupiska: `RosterPickerFooter` (6x `2xl`), `PersonaBreakdown` (3x), `DeckFinished` (2x), tier listy (`lg` na `md`).

**smash-or-pass** (22)

- [ ] `smash-or-pass/CharacterCard.tsx` : 28 (rounded-full)
- [ ] `smash-or-pass/RomancePersonaModal.tsx` : 200 (rounded-2xl)
- [ ] `smash-or-pass/SmashLeaderboardModal.tsx` : 408 (rounded-xl)
- [ ] `smash-or-pass/hub/DeckFinished.tsx` : 44 (rounded-2xl), 48 (rounded-2xl)
- [ ] `smash-or-pass/hub/HubHeader.tsx` : 284 (rounded-2xl)
- [ ] `smash-or-pass/hub/HubModals.tsx` : 94 (rounded-xl), 103 (rounded-xl)
- [ ] `smash-or-pass/hub/NsfwGate.tsx` : 21 (rounded-2xl)
- [ ] `smash-or-pass/hub/RosterModals.tsx` : 118 (rounded-xl), 121 (rounded-xl)
- [ ] `smash-or-pass/persona/PersonaBreakdown.tsx` : 192 (rounded-2xl), 202 (rounded-2xl), 212 (rounded-2xl)
- [ ] `smash-or-pass/persona/PersonaShareView.tsx` : 135 (rounded-2xl)
- [ ] `smash-or-pass/prefs/EffectsPreferenceModal.tsx` : 61 (rounded-xl)
- [ ] `smash-or-pass/roster-select/RosterPickerFooter.tsx` : 46 (rounded-2xl), 58 (rounded-2xl), 73 (rounded-2xl), 83 (rounded-2xl), 93 (rounded-2xl), 103 (rounded-2xl)

**tier-lists** (8)

- [ ] `tier-lists/TierListEditor.tsx` : 250 (rounded-2xl)
- [ ] `tier-lists/TierPool.tsx` : 111 (rounded-xl)
- [ ] `tier-lists/creator/CreatorItems.tsx` : 38 (rounded-lg)
- [ ] `tier-lists/creator/ItemSources.tsx` : 256 (rounded-lg), 419 (rounded-lg)
- [ ] `tier-lists/creator/LadderEditor.tsx` : 273 (rounded-lg), 253 (rounded-lg)
- [ ] `tier-lists/creator/TierListCreator.tsx` : 358 (rounded-lg)

**(root)** (3)

- [ ] `PerkFilters.tsx` : 343 (rounded-full), 224 (rounded-2xl)
- [ ] `Sidebar.tsx` : 374 (rounded-full)

**character-detail** (3)

- [ ] `character-detail/KillerDetailView.tsx` : 156 (rounded-2xl)
- [ ] `character-detail/SurvivorDetailView.tsx` : 93 (rounded-2xl)
- [ ] `character-detail/components/CategoryPicker.tsx` : 88 (rounded-2xl)

**common** (2)

- [ ] `common/CustomDropdown.tsx` : 128 (rounded-2xl)
- [ ] `common/NsfwContentGate.tsx` : 26 (rounded-2xl)

**scraper-config** (1)

- [ ] `scraper-config/ImportTab.tsx` : 88 (rounded-full)

**user** (1)

- [ ] `user/UserBugReportsList.tsx` : 308 (rounded-full)

**characters** (1)

- [ ] `characters/hub/CharactersToolbar.tsx` : 109 (rounded-2xl)

**admin** (1)

- [ ] `admin/AdminBugReportsWorkbench.tsx` : 351 (rounded-xl)


## 13. Radius poza skalą (27, ZROBIONE, pilnuje tego check:styles)

Gołe `rounded`, `rounded-sm`, `rounded-xs` i `rounded-[3px]`. Przypisać do tokenu `chip` lub usunąć. Ikony flag (`FlagIcon`) i checkboxy: zdecydować osobno.

**smash-or-pass** (7)

- [ ] `smash-or-pass/creator/EntityEditor.tsx` : 72 (rounded), 179 (rounded), 225 (rounded)
- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 104 (rounded), 146 (rounded-sm)
- [ ] `smash-or-pass/creator/RomanceArchetypeBuilder.tsx` : 170 (rounded)
- [ ] `smash-or-pass/persona/PersonaIcon.tsx` : 16 (rounded)

**streaks** (4)

- [ ] `streaks/chaos/ChaosStatsDrawer.tsx` : 37 (rounded)
- [ ] `streaks/chaos/SlotMachineStage.tsx` : 135 (rounded)
- [ ] `streaks/gauntlet/ActiveTargetStageParts.tsx` : 115 (rounded)
- [ ] `streaks/history/HistoryPerkPoolPanel.tsx` : 122 (rounded)

**minigames** (3)

- [ ] `minigames/CharacterAutocomplete.tsx` : 301 (rounded)
- [ ] `minigames/MinigamesHub.tsx` : 512 (rounded)
- [ ] `minigames/VictoryModal.tsx` : 147 (rounded-sm)

**sidebar** (3)

- [ ] `sidebar/SidebarBottomControls.tsx` : 189 (rounded-sm)
- [ ] `sidebar/SidebarNavLink.tsx` : 45 (rounded)
- [ ] `sidebar/SidebarUserSection.tsx` : 59 (rounded)

**onboarding** (3)

- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 58 (rounded)
- [ ] `onboarding/wizard/ChapterToolbar.tsx` : 80 (rounded-[3px])
- [ ] `onboarding/wizard/OnboardingLanguageView.tsx` : 44 (rounded-sm)

**admin** (2)

- [ ] `admin/AdminSettingsPanel.tsx` : 166 (rounded), 170 (rounded)

**tier-lists** (2)

- [ ] `tier-lists/creator/CreatorItems.tsx` : 100 (rounded-sm)
- [ ] `tier-lists/creator/LadderEditor.tsx` : 22 (rounded-xs)

**(root)** (1)

- [ ] `PerkCard.tsx` : 105 (rounded)

**common** (1)

- [ ] `common/Checkbox.tsx` : 43 (rounded)

**maps** (1)

- [ ] `maps/VoiceCommandBannerParts.tsx` : 145 (rounded)


## 14. Do zweryfikowania w trakcie

- [ ] 26 plików z `aria-pressed` / `aria-selected` poza `common`: czy to ręczne `SegmentedControl` lub `Tabs`.
- [ ] Ręczne menu rozwijane (`role=listbox/menu/option`): `character-detail/components/CategoryPicker.tsx`, `minigames/CharacterAutocomplete.tsx`, `PerkFilters.tsx`, `sidebar/SidebarBottomControls.tsx`, `smash-or-pass/hub/HubHeader.tsx`, `tier-lists/TierListEditor.tsx`. Czy da się oprzeć o `Popover` / `CustomDropdown`.
- [ ] Wartości arbitralne: `min-h-[` 180 użyć, `w-[` 69, `h-[` 48, `shadow-[` 9 (głównie poświaty), `z-[` 7 (60, 70, 100, 5, 2 bez wspólnej skali warstw). Ocenić, co powinno stać się tokenem (skala z-index, poświaty).
- [ ] Touch target: `pointer-coarse:min-h-11` tylko w 13 plikach, `hit-area` w 8. Sprawdzić, czy `Button` i `Field` mogą dawać to domyślnie.
- [ ] Czysto, nic do roboty: kolory spoza tokenów (0), `window.confirm`/`alert` (0), surowe `<select>`, `<textarea>` i checkboxy poza `common` (0), typografia (`check:typography` zielony).

## 15. Desktop i mobile: wpływ na plan

Zależności znalezione analizą klas z prefiksami `sm:`, `md:`, `lg:`, `xl:`, `max-sm:` i `pointer-coarse:`. Nie sprawdzałem wyglądu w przeglądarce, to wnioski z kodu.

### Co jest responsywne w elementach do zamiany

| Kategoria | Z breakpointami | Co się zmienia |
|---|---|---|
| Ostylowane `<button>` | 61 z 127 | `pointer-coarse:min-h-11 min-w-11` (28), skok rozmiaru ikon `h-/w-` na `sm:` (16), padding i tekst (15) |
| Karty | 66 z 204 | głównie padding `sm:p-5/6/8` (44), reszta to rozmiar kwadratów (avatary, logo) i układ (`col-span`, `flex-row`) |
| Chipy | 7 z 74 | rozmiar tekstu (14) i padding (9) |
| Linki-przyciski | 2 z 22 | padding, tekst |
| Dashed | 3 z 13 | padding i rozmiar |
| Skeletony | 3 z 9 | rozmiar |
| `title=` | 1 z 113 | bez znaczenia |
| Overlaye | 0 z 5 | brak |

### Radius prawie nie jest responsywny

Tylko 9 miejsc zmienia radius na breakpoincie, głównie z `2xl` na `3xl` (16 na 18 px) na `sm:`:

- [ ] `onboarding/wizard/ChapterCard.tsx:59` (`xl` na `2xl`)
- [ ] `PerkFilters.tsx:238`
- [ ] `user/CampfireHeader.tsx:74, 83, 90`
- [ ] `user/VaultMasteryDials.tsx:64`
- [ ] `UserAvatar.tsx:64`
- [ ] `common/modalConfig.tsx:77` (dolny arkusz: `rounded-t-3xl rounded-b-none sm:rounded-3xl`)
- [ ] `common/Modal.tsx:360` (`max-sm:rounded-none` przy `fullscreenOnMobile`)

Wniosek: różnica 2 px nie daje nic na ekranie, więc w tokenach radius ma być jeden dla wszystkich szerokości. Wyjątki zostają tylko w `Modal`: dolny arkusz na telefonie (zaokrąglone tylko górne rogi) i pełny ekran bez zaokrągleń. Token modala musi to umieć, więc potrzebne są warianty `t-*` / `none`, nie tylko jedna wartość.

### Wpływ na zaplanowane zadania

1. **Tokeny radiusu (krok 1):** bez zmian w planie. Dochodzi usunięcie 7 responsywnych radiusów powyżej i zachowanie wyjątków modala.
2. **Przyciski:** największy wpływ. `Button` ma stałe rozmiary `xs` do `lg` (responsywny jest tylko wariant `cta`), więc 16 przycisków, które rosną na `sm:` (np. `CharacterCard`, `RosterSelectModal`, `KillerDetailView`), nie da się zamienić 1 do 1. Opcje: zostawić zmianę rozmiaru w `className` (komentarz w `Button.tsx` dopuszcza "layout"), albo dodać responsywny `size`. Rekomendacja: `className` dla rzadkich przypadków, bez rozbudowy API.
3. **Touch target (28 przycisków):** `pointer-coarse:min-h-11 pointer-coarse:min-w-11` jest dopisywane ręcznie. Dodanie tego do `Button` (i `IconButton`) jako domyślnego zachowania usunie te ręczne klasy i naprawi przyciski, które ich nie mają. Do zrobienia razem z krokiem 2.
4. **Karty (`Surface`):** `Surface` ma już responsywny padding (`md`: `p-4 sm:p-5`, `lg`: `p-6 sm:p-8`), ale 44 karty mają własne wartości (`sm:p-6`, `sm:p-4`, `sm:p-12`). Przy zamianie: dobrać najbliższy wariant albo użyć `padding="none"` plus `className`. Karty, które są w rzeczywistości kwadratami na avatary lub logo (rozmiar `sm:h-44 sm:w-44` w `HomePage`, `ErrorPage`), nie są kartami i zostają poza `Surface`.
5. **Chipy:** `Badge` ma stałe rozmiary `xs/sm/md`. Tylko 7 chipów jest responsywnych, więc wystarczy `className`.
6. **Pola formularza:** `Field` ma `text-base sm:text-xs/sm` (16 px na telefonie, żeby iOS nie powiększał strony po fokusie). Przy zamianie 8 surowych inputów na `Input` trzeba sprawdzić, które z nich nie mają tej reguły, bo to przy okazji naprawia zoom na iOS. Pola `CodeInput` i `EmailVerificationForm` mają `text-base` i są kwadratowymi komórkami kodu, więc prawdopodobnie zostaną osobne (do oceny).
7. **`title=` na `Tooltip`:** `Tooltip` działa tylko na hover myszy i fokus z klawiatury, a na dotyku świadomie się nie pokazuje (`Tooltip.tsx:352`). Natywny `title` też nie działa na telefonie, więc zamiana nie pogarsza mobile, ale też go nie poprawia. Jeśli któryś `title` niesie ważną informację (np. etykieta ikony), na telefonie trzeba ją pokazać inaczej (tekst widoczny, `aria-label`). Do przejrzenia przy zamianie, najwięcej w streaks (39).
8. **Modale:** `Modal` ma już tryby mobilne (dolny arkusz, `fullscreenOnMobile`, wykrywanie przez `matchMedia` w `modalConfig`). `RosterModals.tsx:157` powinien z nich korzystać zamiast własnego `fixed inset-0`.
9. **Wykrywanie urządzenia w kodzie:** jest hook `hooks/useFinePointer.ts` (hover i precyzyjny wskaźnik) oraz `matchMedia` w `modalConfig`. Reszta (slot machine, konfetti, koło) to animacje i nie wchodzi w ten zakres. Nowe warianty mobilne robić przez CSS (`pointer-coarse:`, breakpointy), nie przez nowe hooki.

### Weryfikacja wizualna na telefonie (po zmianach)

Sprawdzić szerokości około 360 i 390 px oraz tablet około 768 px w obszarach o największej liczbie zamian:

- [ ] smash-or-pass (karta postaci, `RosterSelectModal`, `RosterPickerFooter`)
- [ ] tier-lists (edytor, skala, `TierColorPicker`)
- [ ] streaks (panele, tooltipy, `ChallengePanel`)
- [ ] minigames (`MinigamesHub`, kafelki)
- [ ] admin (karty, tabele, nagłówek)
- [ ] sidebar i modale (dolny arkusz, pełny ekran)
- [ ] pola formularza: brak powiększania strony po fokusie na iOS

## 16. Tooltipy: tylko warianty z TOOLTIP_CONFIG

Stan: jeden renderer (`common/Tooltip.tsx`, `TooltipBubble`), trzy wejścia (`<Tooltip>`, `{...tip(title, desc, variant)}`, `<TooltipBubble>`), siedem wariantów w `TOOLTIP_CONFIG.variants`: `default`, `item`, `action`, `character`, `status`, `error`, `rarity`. Użycia `tip()`: `action` 80, `status` 12, `item` 9, `default` 3, `rarity` 1. `error` obsługuje `FormValidation`. Warianty zostają bez scalania, ich ręczny przegląd jest osobnym zadaniem.

Wymóg tego zadania: każdy tooltip należy do jednego z wariantów, bez duplikatów i bez własnych dymków.

- [ ] 113 natywnych `title=` (sekcja 4) przypisać do wariantu (zwykle `action`, `status`, `item`).
- [ ] Przejrzeć ręcznie robione dymki na hover: `characters/hub/CharacterCard.tsx`, `minigames/CharacterAutocomplete.tsx`, `smash-or-pass/FloatingLoreScattered.tsx`, `smash-or-pass/SmashLeaderboardParts.tsx`, `streaks/StreakPanel.tsx`, `tier-lists/TierListCards.tsx` (`onMouseEnter` / `onPointerEnter`). Dla każdego: czy to tooltip (wtedy `TooltipBubble` z wariantem), czy inna funkcja (podgląd, menu).
- [ ] Trzy wywołania `tip()` z wariantem wyliczanym warunkowo (`maps/voice/VoiceBannerHeader.tsx` x2, `PerkModal.tsx:74`): sprawdzić, czy każda gałąź daje poprawny wariant.
- [ ] Sprawdzić, że `character` i `error` mają realne użycia (dziś nie ma ich wśród literałów `tip()`).
- [ ] Dotyk: `Tooltip` nie pokazuje się na telefonie (`Tooltip.tsx:352`). Informacje, które mają być dostępne na mobile, nie mogą zależeć wyłącznie od tooltipa.
