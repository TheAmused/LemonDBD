# Adopcja wspólnych komponentów i porządek w border radius

Checklista do brancha `refactor/adopt-shared-components` (odciąć od `develop`). Wygenerowana 2026-10-15 analizą statyczną JSX (ts-morph). Numery to linie początku elementu w pliku, w nawiasie bieżący `rounded-*`, jeśli jest.

Zakres: cały frontend poza `components/common`. Strony z listy do usunięcia (Guesser, Draft Room, SWF Planner, Killer Calc, Build Vault, Perk Studio, Quests) już nie istnieją w kodzie.

Ograniczenia analizy: liczone są tylko klasy zapisane wprost w `className`. Klasy z zewnętrznych stałych mogą dać kilka pozycji więcej. Heurystyki (np. "ostylowany button" = bg lub border plus padding lub rozmiar) mogą zgłosić fałszywe trafienia, więc każdą pozycję trzeba obejrzeć przy zamianie.

## Podsumowanie

| Kategoria | Docelowy komponent | Pozycji |
|---|---|---|
| Karty `div` z border, bg i rounded | `Surface` | 61 wyjątków (z 204) |
| Ostylowane `<button>` | `Button` / `ToggleChip` / `SegmentedControl` | 61 wyjątków (z 127) |
| Natywne `title=` na elemencie DOM | `Tooltip` / `tip()` | 0 (było 3) |
| `span` jako chip lub pill | `Badge` / `InfoChip` | 17 (z 74) |
| Linki wyglądające jak przyciski | `buttonClassName()` | 2 (z 22) |
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

## 1. Karty na Surface (ZAMKNIĘTE, 55 świadomych wyjątków)

Zrobione (2026-10-15): 133 karty na `<Surface>` (108 prostych plus 25 z półprzezroczystym tłem, kolorową ramką lub grubszą ramką, które zachowują wygląd przez `className`). Padding `p-4 sm:p-5`, `p-6 sm:p-8` i `p-3` mapuje się na warianty, inne zostają w `className`.

Zostają (61), bo to nie są karty w sensie `Surface`:
- kafle i miniatury o stałym rozmiarze (`h-N w-N`, `aspect-square`): logo na stronie błędu, awatary, ikony perków, podglądy,
- elementy z mniejszym promieniem (`rounded-chip`, `rounded-control`),
- karty ze stanem w klasie (wybrany, aktywny, najechany, wyróżniony): `TrophySlot`, `ChapterCard`, `TierRow`, `TierPool`, `VoiceEngineInfoModal`, `SmashLeaderboardParts`,
- przerywane sloty i strefy upuszczania,
- listy (`ul`) i elementy z `ref`.

Lista poniżej to dokładnie te wyjątki:

**streaks** (14)

- [ ] `streaks/ChallengePanel.tsx` : 103
- [ ] `streaks/FreezeBadge.tsx` : 19
- [ ] `streaks/StreaksLayoutShell.tsx` : 74
- [ ] `streaks/chaos/ChaosPerkPoolModal.tsx` : 16
- [ ] `streaks/gauntlet/ActiveTargetStage.tsx` : 212, 242
- [ ] `streaks/gauntlet/ActiveTargetStageParts.tsx` : 273
- [ ] `streaks/gauntlet/TokenRoulette.tsx` : 77
- [ ] `streaks/history/HistoryNextRowPreview.tsx` : 22
- [ ] `streaks/history/HistoryPerkModal.tsx` : 37
- [ ] `streaks/history/HistoryPerkPoolPanel.tsx` : 23, 46
- [ ] `streaks/history/HistoryRowClearedBanner.tsx` : 25
- [ ] `streaks/page-streak/BuildPanel.tsx` : 45

**tier-lists** (9)

- [ ] `tier-lists/TierColorPicker.tsx` : 103
- [ ] `tier-lists/TierItemTile.tsx` : 78
- [ ] `tier-lists/TierListScaleControl.tsx` : 84
- [ ] `tier-lists/TierPool.tsx` : 81
- [ ] `tier-lists/TierRow.tsx` : 72
- [ ] `tier-lists/creator/CreatorItems.tsx` : 58
- [ ] `tier-lists/creator/LadderEditor.tsx` : 157
- [ ] `tier-lists/creator/TierItemEditModal.tsx` : 96
- [ ] `tier-lists/creator/TierListCreator.tsx` : 435

**smash-or-pass** (7)

- [ ] `smash-or-pass/CharacterCard.tsx` : 190
- [ ] `smash-or-pass/SmashLeaderboardParts.tsx` : 102, 134
- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 96
- [ ] `smash-or-pass/creator/RomanceArchetypeBuilder.tsx` : 117
- [ ] `smash-or-pass/creator/RosterBasicsSection.tsx` : 110
- [ ] `smash-or-pass/persona/PersonaBreakdown.tsx` : 83

**minigames** (4)

- [ ] `minigames/CharacterAutocomplete.tsx` : 254
- [ ] `minigames/guessers/PerkIconGuesser.tsx` : 37
- [ ] `minigames/guessers/PixelAvatarGuesser.tsx` : 46
- [ ] `minigames/guessers/RealmGuesser.tsx` : 38

**user** (4)

- [ ] `user/CampfireHeader.tsx` : 77
- [ ] `user/MainCard.tsx` : 76
- [ ] `user/ShowcaseCharacterModal.tsx` : 62
- [ ] `user/VaultMasteryDials.tsx` : 60

**scraper-config** (3)

- [ ] `scraper-config/ImportTab.tsx` : 45, 162
- [ ] `scraper-config/TargetPicker.tsx` : 82

**character-detail** (3)

- [ ] `character-detail/components/CharacterHeroAvatar.tsx` : 44
- [ ] `character-detail/modals/KillerPowerModal.tsx` : 44
- [ ] `character-detail/modals/Model3DModal.tsx` : 20

**generator** (3)

- [ ] `generator/modes/LootCrateStage.tsx` : 301
- [ ] `generator/modes/slot-machine/SlotReelRowMobile.tsx` : 131
- [ ] `generator/shared/PerkSlot.tsx` : 94

**achievements** (1)

- [ ] `achievements/TrophySlot.tsx` : 25

**admin** (1)

- [ ] `admin/AdminChallengeStats.tsx` : 65

**changelog** (1)

- [ ] `changelog/WhatsNewLauncher.tsx` : 352

**landing** (1)

- [ ] `landing/HomePage.tsx` : 38

**layout** (1)

- [ ] `layout/ErrorPage.tsx` : 56

**maps** (1)

- [ ] `maps/VoiceCommandBanner.tsx` : 56

**sidebar** (1)

- [ ] `sidebar/BugReportModal.tsx` : 220

**onboarding** (1)

- [ ] `onboarding/wizard/ChapterCard.tsx` : 59

## 2. Przyciski na Button (ZAMKNIĘTE, 37 świadomych wyjątków)

Zrobione (2026-10-15): 55 przycisków akcji na `Button`, 10 linków tekstowych na `link`/`linkMuted`, grupy wyboru na `SegmentedControl`, pojedyncze przełączniki na `ToggleChip`, ikona rankingu w `HubHeader` na `DockAction` (`amberSoft`).

Zostają (61), bo `Button` nie jest ich właściwym kształtem:
- kafle i karty wyboru (`aria-pressed` na dużych kartach: admin zgłoszenia i raporty, `ChallengeIntroModalShell`, `VoiceEngineInfoModal`, `ShowcaseCharacterModal`, `ShowcasePerkModal`, `KillerPickerGrid`),
- nagłówki akordeonów (`aria-expanded` na całym wierszu: `TierListHub`, `UserProfileForm`, `DualMainsShowcase`, `UserBugReportsList`, `TierListCreatorParts`, `CollapsibleDrawer`),
- przyciski gry z animacją i skalą (akcje karty i strzałki w Smash or Pass, klawisze `TactileKeycaps`, `VoiceMicButton`, `TarotDeckStage`, `SlotMachineIdle`, `SlotReelRowMobile`),
- wiersze menu i opcji (`role=option`/`listbox`: `CategoryPicker`, `SidebarBottomControls`, `HubHeader`, `PerkFilters`),
- uchwyty przeciągania i narzędzia kafli (`WhatsNewLauncher`, `LadderEditor`, `TierRow`, `EntityEditorParts`, `CreatorItems`),
- próbniki koloru i przełączniki segmentowe o własnym wyglądzie (`TierColorPicker`, `TierEditModal`, kontrolki `TierListScaleControl`, `ChapterToolbar`),
- czerwone i wplecione w tekst linki-przyciski (`AuthModal`, `AdminSettingsPanel`, `RomanceArchetypeBuilder`, `PageStreakRoster`, `VerificationNotice`).

Jeśli któryś z nich ma jednak dostać wspólny komponent, to kandydaci na kolejne: `MenuItem` (wiersze menu), `AccordionHeader` (nagłówki akordeonów) i `SelectableCard` (karty wyboru). Na razie bez nich, żeby nie mnożyć komponentów.

Lista poniżej to wszystkie pozostałe ostylowane przyciski:

**smash-or-pass** (10)

- [ ] `smash-or-pass/CharacterCard.tsx` : 254 (rounded-control), 270 (rounded-control), 288 (rounded-control), 304 (rounded-control)
- [ ] `smash-or-pass/RosterSelectModal.tsx` : 158 (rounded-full), 171 (rounded-full)
- [ ] `smash-or-pass/TactileKeycaps.tsx` : 151 (rounded-control)
- [ ] `smash-or-pass/creator/EntityEditor.tsx` : 180 (rounded-chip), 226 (rounded-chip)
- [ ] `smash-or-pass/hub/HubHeader.tsx` : 132 (rounded-control)

**changelog** (5)

- [ ] `changelog/ChangelogEditorModal.tsx` : 191 (rounded-full), 314 (rounded-control), 337 (rounded-full), 348 (rounded-full)
- [ ] `changelog/WhatsNewLauncher.tsx` : 371 (rounded-control)

**tier-lists** (5)

- [ ] `tier-lists/TierListCards.tsx` : 80 (rounded-control), 244 (rounded-control)
- [ ] `tier-lists/creator/LadderEditor.tsx` : 172, 182, 209

**streaks** (3)

- [ ] `streaks/ChallengeIntroModalShell.tsx` : 178 (rounded-control)
- [ ] `streaks/ChallengePanel.tsx` : 132
- [ ] `streaks/gauntlet/LemonTokenPanel.tsx` : 39 (rounded-control)

**(root)** (2)

- [ ] `ChaosWheelModal.tsx` : 321 (rounded-control)
- [ ] `Sidebar.tsx` : 315 (rounded-r-control)

**character-detail** (2)

- [ ] `character-detail/KillerDetailView.tsx` : 113 (rounded-control)
- [ ] `character-detail/components/CategoryPicker.tsx` : 72 (rounded-control)

**maps** (2)

- [ ] `maps/MapCard.tsx` : 20 (rounded-control)
- [ ] `maps/MapExplorer.tsx` : 430 (rounded-control)

**minigames** (2)

- [ ] `minigames/ChallengeRunner.tsx` : 446 (rounded-full)
- [ ] `minigames/MinigamesHub.tsx` : 223 (rounded-chip)

**user** (2)

- [ ] `user/UserBugReportsList.tsx` : 154, 210 (rounded-control)

**admin** (1)

- [ ] `admin/AdminChallengeControl.tsx` : 232 (rounded-control)

**characters** (1)

- [ ] `characters/hub/VerificationNotice.tsx` : 25 (rounded-control)

**onboarding** (1)

- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 65

**generator** (1)

- [ ] `generator/modes/slot-machine/SlotReelRowMobile.tsx` : 189 (rounded-control)

## 3. Niestylowane przyciski (ZAMKNIĘTE, 45 świadomych wyjątków)

Przyciski bez własnej ramki i tła: ikony na kartach, nakładki "kliknij całość", odkrywane po najechaniu, przełączniki w wierszach. Żaden nie ma stylu przycisku z `Button`, więc zostają.

**tier-lists** (13)

- [ ] `tier-lists/TierListEditor.tsx` : 241, 262, 277, 292, 297, 301, 305, 316, 322
- [ ] `tier-lists/TierPool.tsx` : 146
- [ ] `tier-lists/TierRow.tsx` : 82
- [ ] `tier-lists/creator/CreatorItems.tsx` : 76
- [ ] `tier-lists/creator/ItemSources.tsx` : 381

**streaks** (10)

- [ ] `streaks/ChallengeIntroModalShell.tsx` : 127
- [ ] `streaks/ChallengePanel.tsx` : 70, 223
- [ ] `streaks/StreakAttemptGroups.tsx` : 71
- [ ] `streaks/StreakPanel.tsx` : 135, 159
- [ ] `streaks/chaos/KillerPickerGrid.tsx` : 32
- [ ] `streaks/chaos/SlotMachineStage.tsx` : 342
- [ ] `streaks/history/HistoryNextRowPreview.tsx` : 50
- [ ] `streaks/page-streak/PerkTile.tsx` : 64

**user** (4)

- [ ] `user/ShowcaseCharacterModal.tsx` : 53
- [ ] `user/UserProfileForm.tsx` : 266, 342, 371

**generator** (4)

- [ ] `generator/modes/TarotDeckStage.tsx` : 197, 248
- [ ] `generator/modes/slot-machine/SlotMachineIdle.tsx` : 25
- [ ] `generator/shared/PerkSlot.tsx` : 74

**admin** (2)

- [ ] `admin/AdminChallengeControl.tsx` : 291, 326

**sidebar** (2)

- [ ] `sidebar/BugReportModal.tsx` : 302
- [ ] `sidebar/SidebarNavLink.tsx` : 68

**character-detail** (2)

- [ ] `character-detail/components/CharacterPerksSection.tsx` : 41
- [ ] `character-detail/components/CollapsibleDrawer.tsx` : 51

**onboarding** (2)

- [ ] `onboarding/wizard/ChapterCard.tsx` : 60
- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 42

**(root)** (1)

- [ ] `PerkCard.tsx` : 96

**changelog** (1)

- [ ] `changelog/WhatsNewLauncher.tsx` : 385

**characters** (1)

- [ ] `characters/PerksTogglePopup.tsx` : 98

**minigames** (1)

- [ ] `minigames/CharacterAutocomplete.tsx` : 238

**ui** (1)

- [ ] `ui/DiamondSlot.tsx` : 76

**maps** (1)

- [ ] `maps/voice/VoiceMicButton.tsx` : 36

## 4. Natywne title= (ZROBIONE)

Pierwotna liczba 113 była zawyżona: liczyła też prop `title` komponentów (`Modal`, `EmptyState`, `StreakPanel`...), który nie jest tooltipem. Natywny `title` na elemencie DOM były tylko 3 i wszystkie przeszły na `tip()`: link do panelu admina w `SidebarUserSection` (`action`) oraz poprzednia/następna postać w `CharacterBreadcrumbs` (`character`).

`check:styles` blokuje teraz natywny `title` i ręczne `data-tooltip` na elementach DOM (małe litery, `Link`, `Image`).

## 5. Chipy i pille (17 zostało z 74)

Zrobione (2026-10-15): 57 `span` zamienionych na `Badge` (kolorowe etykiety, liczniki, statusy; ton `red`/`amber`/`green`/`neutral`, `square` dla kształtu chip, `plain` bez wersalików) lub `InfoChip` (neutralne podpowiedzi i liczniki: 9 podpowiedzi w minigrach, tagi w HowToPlay, liczniki w ChapterToolbar i TargetPicker).

Przy okazji naprawiony błąd w `cn()` (`lib/cn.ts`): `tailwind-merge` nie znał własnych rozmiarów tekstu (`text-micro/tiny/mini/compact`) i uznawał je za kolor, więc kasował prawdziwy kolor tekstu (dotyczyło też `Badge` xs/sm i `Button` xs). Teraz zna je oraz role radiusu, a testy w `cn.test.ts` to pilnują. Skutek uboczny: w istniejących miejscach, gdzie kolor był po cichu gubiony, pojawi się kolor zamierzony w kodzie.

Zostało 17: nakładki na obrazkach z `backdrop-blur` (`TierListCards`, `PersonaBreakdown`, `ChapterCharacterPanel`, `MapExplorer`, `PerkCard`), numery kafli w edytorach (`EntityEditor`, `EntityEditorParts`), liczniki wewnątrz kolorowych przycisków w `PerkFilters`, tagi z przyciskiem usuwania w `RosterTaxonomyBlock`, baner `AchievementsHub`, czipy z pozycją `CharacterHeroAvatar` oraz wszystkie, które wymagają osobnej decyzji. Do oceny:

**(root)** (5)

- [ ] `PerkCard.tsx` : 105 (rounded-chip)
- [ ] `PerkFilters.tsx` : 136 (rounded-full), 151 (rounded-full), 168 (rounded-full), 182 (rounded-full)

**smash-or-pass** (5)

- [ ] `smash-or-pass/creator/EntityEditor.tsx` : 116 (rounded-chip)
- [ ] `smash-or-pass/creator/EntityEditorParts.tsx` : 104 (rounded-chip)
- [ ] `smash-or-pass/creator/RosterTaxonomyBlock.tsx` : 144 (rounded-control), 233 (rounded-control)
- [ ] `smash-or-pass/persona/PersonaBreakdown.tsx` : 61 (rounded-chip)

**tier-lists** (3)

- [ ] `tier-lists/TierListCards.tsx` : 137 (rounded-chip), 155 (rounded-chip), 236 (rounded-chip)

**achievements** (1)

- [ ] `achievements/AchievementsHub.tsx` : 26 (rounded-control)

**maps** (1)

- [ ] `maps/MapExplorer.tsx` : 453 (rounded-full)

**character-detail** (1)

- [ ] `character-detail/components/CharacterHeroAvatar.tsx` : 94 (rounded-full)

**onboarding** (1)

- [ ] `onboarding/wizard/ChapterCharacterPanel.tsx` : 58 (rounded-chip)

## 6. Linki wyglądające jak przyciski (ZROBIONE, 20 z 22)

20 linków dostało `buttonClassName(variant, size, układ)` (admin, strona główna, strona błędu, `MinigamesHub`, `VictoryModal`, breadcrumbs, `CampfireHeader`). Zostały 2 świadomie: `streaks/RoleTabs` (zakładki ze stanem aktywnym) i link udostępniania w `PersonaShareView` (stan zależny od dostępności).

## 7. Ramki dashed (ZROBIONE)

Puste stany przeszły na `EmptyState` (`RosterSelectModal`, `SmashRosterCreator`, `RomanceArchetypeBuilder`) i `AuthRequiredState` (ekran logowania w `StreaksLayoutShell`). Przy okazji przyciski wewnątrz `EmptyState` i `AuthRequiredState` są prawdziwymi `Button`. Pozostałe ramki dashed to sloty i strefy upuszczania (`PerkSlot`, `LootCrateStage`, `ItemSources`, `ImportTab`, `EntityEditor`, `HistoryPerkPoolPanel`, okrąg `TerrorRadiusModal`) oraz karty o stanie (`WhatsNewLauncher`), więc zostają. Ekran weryfikacji e-maila w `StreaksLayoutShell` zostaje własny (ikona w tytule i przycisk akcji z modalem).

## 8. Ręczne skeletony animate-pulse (PRZEJRZANE, brak zmian)

Wszystkie 9 trafień to nie placeholdery, tylko pulsujące stany (wybrane pole, ikona w trakcie ładowania, kontener całej strony: `PageShellFallback`, `CardArena`, `CharacterRosterGrid`), więc `SkeletonBlock` nie pasuje.

## 9. Inputy tekstowe (ZROBIONE, 1 z 8)

`HistoryPerkPoolPanel` używa `SearchInput`. Pozostałe są specjalne: komórki kodu OTP (`CodeInput`, `EmailVerificationForm`), edycja nazwy w kafelku (`EntityEditorParts`, `CreatorItems`), etykieta rzędu (`LadderEditor`), natywny wybór koloru (`RosterBasicsSection`) oraz wyszukiwarka w ciasnym pasku filtrów `PerkFilters` (pill i własne rozmiary responsywne, do osobnej decyzji).

## 10. Przełącznik role=switch (PRZEJRZANE, brak zmian)

`ChapterCard` już korzysta z `SwitchTrack` (część prezentacyjna `Switch`), bo cały wiersz jest klikalny.

## 11. Overlaye fixed inset-0 (PRZEJRZANE, brak zmian)

`RosterModals` ma tylko pełnoekranową animację przełączenia rostera (nie modal, `pointer-events-none`). Pozostałe to tła i animacje.

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

## 16. Tooltipy: tylko warianty z TOOLTIP_CONFIG (PRZEJRZANE)

Stan po przeglądzie (2026-10-15): jeden renderer (`common/Tooltip.tsx`), trzy wejścia (`<Tooltip>`, `{...tip()}`, `<TooltipBubble>`), siedem wariantów w `TOOLTIP_CONFIG.variants`: `default`, `item`, `action`, `character`, `status`, `error`, `rarity`. Warianty zostają bez scalania (ręczny przegląd jest osobnym zadaniem).

- [x] Każdy tooltip w aplikacji należy do wariantu: typ `TooltipVariant` wymusza wartość z konfiguracji w `tip()`, `<Tooltip>` i `<TooltipBubble>`. Wszystkie 7 wariantów ma realne użycie: `action` (80+), `status`, `item`, `default` (3), `rarity` (`ChaosStatsDrawer`), `character` (`PerkModal`, breadcrumbs postaci), `error` (`FormValidation`).
- [x] Brak duplikatów: dodatkowych systemów tooltipów nie ma. `onMouseEnter` w `CharacterCard`, `CharacterAutocomplete`, `FloatingLoreScattered`, `SmashLeaderboardParts` i `StreakPanel` to prefetch, podświetlenie i efekty, a nie dymki. `DescriptionPeek` w `TierListCards` to nakładka z opisem działająca też na dotyk (tap), więc zostaje osobna.
- [x] Wywołania `tip()` z wariantem warunkowym (`VoiceBannerHeader`, `PerkModal`) mają poprawne gałęzie (`action`, `character`).
- [x] Guard w `check:styles` blokuje natywny `title` i ręczne `data-tooltip`.
- [ ] Ikony bez tooltipa: `HeaderButton` i `ModeSelectButton` w `ChallengePanel` (reguły, statystyki, wygrane, porzuć bieg, animacje, pula perków) mają tylko `aria-label`, bez tooltipa na desktopie. Do decyzji, czy dodać `tip(title, undefined, 'action')`.
- [ ] Dotyk: `Tooltip` nie pokazuje się na telefonie (`Tooltip.tsx:352`). Informacje, które mają być dostępne na mobile, nie mogą zależeć wyłącznie od tooltipa.

## 17. Decyzje (rozstrzygnięte 2026-10-15) i ich wykonanie

Gdzie zmienić styl, żeby zmienił się wszędzie: `docs/style-sources.md`. Lista do obejrzenia wzrokiem: `docs/visual-check-list.md`.

### A. Komponenty
- [x] `MenuItem` (`common/MenuItem.tsx`): `CategoryPicker`, `SidebarBottomControls`, `HubHeader`, sugestie w `PerkFilters` i opcje w `CustomDropdown`. Zaznaczona opcja ma teraz zawsze tint akcentu (wcześniej `CustomDropdown` miał pełne tło).
- [x] Nagłówki akordeonów: `AccordionSection` (`common/AccordionSection.tsx`, nagłówek z banerem i licznikiem, przycisk akcji w nagłówku, animowane ciało). Użyte w `TierListHub` (oficjalne), `UserProfileForm`, `DualMainsShowcase`, `UserBugReportsDrawer` i sekcjach kreatorów tier list i rosterów. Sekcja "moje listy" w `TierListHub` zostaje własna, bo jej nagłówek jest przyklejony (sticky) i ma dwa przyciski akcji.
- [ ] `SelectableCard`: nie robimy (decyzja).
- [x] `Badge` w tonach `overlay` (frosted label na obrazku) i `onAccent` (licznik w kolorowym przycisku). Baner "coming soon" w `AchievementsHub` zostaje.
- [x] `Button` wariant `linkDanger` (`AdminSettingsPanel`, `RomanceArchetypeBuilder`). Link do regulaminu w zdaniu w `AuthModal` zostaje.
- [x] Przyciski gry w Smash or Pass: zostają własne (decyzja).
- [x] `pill` w `Input`/`Textarea`/`Select`/`SearchInput`; wyszukiwarka w `PerkFilters` używa `SearchInput pill fieldSize="sm"`. Do sprawdzenia na 1440 do 1800 px.
- [x] `SegmentedControl` z opcją `disabled`; przełącznik źródła w `VoiceBannerHeader`.
- [x] `IconToggleButton` zostaje jako nakładka na `ToggleChip`.

### B. Tooltipy
- [x] Bez zmian. Ręczny przegląd wariantów będzie osobno. Otwarte pozycje z sekcji 16 (ikony w `ChallengePanel` bez tooltipa, dotyk) zostają do tego przeglądu.

### C. Tokeny
- [x] Warstwy: `--layer-*` i `z-modal`, `z-modal-top`, `z-system` w `tokens.css`; `modalConfig`, `Confetti`, `Popover` i `Tooltip` korzystają z tokenów. Lokalne `z-[5]` w `CardStack` zostaje (kolejność wewnątrz komponentu).
- [x] Poświaty: `shadow-glow-{amber,red,green,muted}-{sm,md,lg}` i `-soft`; zastąpiły 24 ręczne `shadow-[0_0_Npx_...]` (zostały 3 specyficzne cienie krawędzi w `SmashAnimations` i `TactileKeycaps`). Rozmiary ujednolicone do 12, 20 i 32 px, więc część poświat może być minimalnie słabsza lub silniejsza.
- [x] Rozmiary: 96 wartości `min-h-[Npx]`, `w-[Npx]` itd. (wielokrotności 4 px do 96 px) przepisane na skalę Tailwinda (`min-h-[44px]` to `min-h-11`), bez zmiany wartości. Reszta arbitralnych rozmiarów zostaje.
- [x] Polityka celu dotyku: bez zmian (44 px tylko dla ikon, w `Button`, `ToggleChip`, `SegmentedControl` i `MenuItem`).

### D. Lista do obejrzenia wzrokiem
- [x] Spisana w `docs/visual-check-list.md`.

### E. Proces
- [x] Guard na surowe `<button>` ostylowane jak przycisk: limit na plik w `frontend/scripts/raw-buttons-baseline.json` (50 przycisków w 36 plikach, można tylko zmniejszać).
- [ ] Push brancha: po Twoim przeglądzie (bez PR).
- [x] Test `globalCssPartials` przez `os.tmpdir()`.
- [x] Nieużywane importy: bez sprzątania (poza tymi, które powstały przy tej pracy).

## 18. Mniej wyjątków (2026-10-15, druga seria)

Wykonane na Twoje polecenie "mniej wyjątkowych elementów". Nowe lub rozszerzone komponenty i ich użycia:

- [x] `Toast`: dwa identyczne toasty (rostery, tier listy).
- [x] `IconTile`: 12 kafli z ikoną.
- [x] `Button` wariant `overlay` oraz prop `dashed`: 5 małych kontrolek na miniaturach i 6 przycisków "dodaj".
- [x] `Thumb`: 4 miniatury w listach (autouzupełnianie, kreator rund, guessery).
- [x] `Collapsible`: wspólne zwijanie w `AccordionSection`, `CollapsibleDrawer`, grupach prób, podglądzie następnego rzędu i zgłoszeniach błędów. Zostają własne: `BlockCard` (dwie karty o tej samej wysokości), `TierPool` (układ dopasowany do planszy) i zwijany pasek akcji w `ChallengePanel` (tylko telefon).
- [x] `AccordionSection` z `stickyHeader`: sekcja "Moje listy" w hubie tier list.
- [x] `SelectableCard`: filtry statusów i lista raportów w adminie, silniki głosu i jakość modelu, kafle perków we własnym zestawie. Zostają bez zmian: kafle trybu w `ChallengeIntroModalShell` (akcent koloru każdego trybu), portrety w `ShowcaseCharacterModal`, siatki `KillerPickerGrid` i `ItemSources` (obrazkowe kafle).
- [x] `ColorSwatch`: próbniki koloru w tier listach.
- [x] Kontrolka "dopasuj" w skali tier listy jako `Button`, "zaznacz wszystko" w onboardingu jako `ToggleChip`.
- [x] `InlineLink`: link do regulaminu w rejestracji, "spróbuj ponownie" w streakach, "odrzuć" w banerze weryfikacji.
- [x] `Badge` rozmiar `lg`: baner "wkrótce" w osiągnięciach.

Jeszcze zostają jako wyjątki (do dalszych decyzji): przyciski gry w Smash or Pass, uchwyty przeciągania, pola OTP i wybór koloru, kafle perków i postaci z obrazkiem, kafle trybu w `ChallengeIntroModalShell`, przycisk "zweryfikuj" na kolorowym banerze (`VerificationNotice`), nagłówki akordeonów w `ChallengePanel` i `TierPool`.
