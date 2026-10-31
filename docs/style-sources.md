# Gdzie zmienić styl, żeby zmienił się wszędzie

Cel: jedna zmiana w jednym miejscu przesuwa wygląd całej strony. Poniżej źródło prawdy dla każdego rodzaju elementu. Nowy element tego rodzaju bierze się z komponentu, nie z ręcznych klas. `npm run check:styles` pilnuje najważniejszych reguł.

| Co | Gdzie się zmienia | Użycie |
|---|---|---|
| Promienie rogów (chip 6, control 12, card 16, modal 20 px) | `frontend/src/app/styles/tokens.css` (`--radius-*`) | `rounded-chip`, `rounded-control`, `rounded-card`, `rounded-modal`, `rounded-full`. Stara skala Tailwinda jest wyłączona. |
| Warstwy z-index (modal, modal-top, system, popover, tooltip) | `tokens.css` (`--layer-*`, `z-modal`, `z-modal-top`, `z-system`) | `z-modal`, `z-modal-top`, `z-system`. Lokalne układanie w komponencie to zwykłe `z-0`..`z-40`. |
| Poświaty (amber, red, green, muted; sm, md, lg, soft) | `tokens.css` (`--shadow-glow-*`) | `shadow-glow-amber-md` itd. Bez `shadow-[0_0_Npx_...]`. |
| Kolory, tło, ramki, akcenty | `frontend/src/app/styles/base.css` (motywy) i `tokens.css` (`--color-*`) | `bg-bg-surface`, `text-accent-red`... Bez kolorów Tailwinda i `#hex`. |
| Typografia | `frontend/src/app/styles/type-roles.css` | `type-label`, `type-strong`, `type-card-title`... |
| Przycisk | `common/Button.tsx` (warianty, rozmiary, promień, cel dotyku) | `<Button variant size icon pill>`; link wyglądający jak przycisk: `buttonClassName()` |
| Przełącznik włącz/wyłącz | `common/ToggleChip.tsx` | `<ToggleChip pressed tone size>` |
| Wybór jednej z kilku opcji | `common/SegmentedControl.tsx` (opcja `disabled`) | `<SegmentedControl options value onChange>` |
| Zakładki z panelami | `common/Tabs.tsx` | `<Tabs>` |
| Wiersz menu lub listy | `common/MenuItem.tsx` | `<MenuItem selected tone flush>` |
| Sekcja zwijana z nagłówkiem | `common/AccordionSection.tsx` | `<AccordionSection title open onToggle banner>` |
| Karta, panel | `common/Surface.tsx` (`radius="control"` dla małych kafli w rzędzie z przyciskami) | `<Surface tone padding>` |
| Pusty stan, wymóg logowania | `common/EmptyState.tsx`, `common/AuthRequiredState.tsx` | |
| Etykieta, licznik, status | `common/Badge.tsx` (tony, w tym `overlay` i `onAccent`) i `common/InfoChip.tsx` | `<Badge tone size>`, `<InfoChip>` |
| Pola formularza | `common/Field.tsx` (`pill` dla wyszukiwarek) | `<Input>`, `<Textarea>`, `<Select>`, `<SearchInput>` |
| Okna | `common/Modal.tsx`, `common/modalConfig.tsx` | `<Modal variant layer>` |
| Powiadomienie w rogu (toast) | `common/Toast.tsx` | `<Toast icon message actions onDismiss>` |
| Kafel z ikoną (nad tytułem, w nagłówku sekcji) | `common/IconTile.tsx` | `<IconTile tone size>` |
| Miniatura obrazka w wierszu listy | `common/Thumb.tsx` | `<Thumb src alt size fit fallback>` |
| Obrazek, który stoi w miejscu, gdy GIF-y są wyłączone w Ustawieniach (plansze Smash or Pass) | `common/MotionImg.tsx` | `<MotionImg src alt>` zamiast `<Img>` |
| Zwijane ciało (animacja, `inert` gdy zamknięte) | `common/Collapsible.tsx` | `<Collapsible open>`; sekcja z nagłówkiem to `AccordionSection` |
| Przycisk-kafel (obrazek, karta, slot): kursor, fokus, powiększenie | `common/TileButton.tsx` | `<TileButton press>` (wygląd kafla zostaje w `className`) |
| Przycisk otwierający zwinięty blok | `common/DisclosureButton.tsx` | `<DisclosureButton open chevron>` |
| Karta, którą się wybiera | `common/SelectableCard.tsx` | `<SelectableCard selected tone tinted>` |
| Próbnik koloru | `common/ColorSwatch.tsx` | `<ColorSwatch selected size mark>` |
| Link w zdaniu | `common/InlineLink.tsx` | `<InlineLink tone>` |
| Mała kontrolka na miniaturze (usuń, edytuj) | `common/Button.tsx` wariant `overlay` | `<Button variant="overlay" size="xs" icon pill>` |
| Przycisk "dodaj" z przerywaną ramką | `common/Button.tsx` prop `dashed` | `<Button dashed>` |
| Pasek akcji przyklejony do dołu (Zaakceptuj, Kontynuuj) | `common/StickyActionBar.tsx` | `<StickyActionBar><ActionBarButton variant="green|red|gray">` |
| Tooltip | `common/Tooltip.tsx` (`TOOLTIP_CONFIG.variants`) | `{...tip(tekst, opis, wariant)}` |
| Łączenie klas | `lib/cn.ts` (zna własne rozmiary tekstu i role promieni) | `cn(...)` |
| Pole z ikoną w środku (hasło, szukaj) | `common/Field.tsx` (`IconInput`, `SearchInput`) | `<IconInput icon={Lock} type="password">`, `<SearchInput>` |
| Błąd w treści strony (tytuł i powód) | `common/Alert.tsx` (`ErrorNotice`) | `<ErrorNotice title>{error}</ErrorNotice>` |
| Ładowanie treści strony (spinner i tekst) | `common/LoadingState.tsx` | `<LoadingState label>` |
| Ikona i tekst w jednej linii (fakt, nagłówek grupy) | `common/IconLabel.tsx` | `<IconLabel icon variant>` (`fact` lub `heading`) |
| Rząd przycisków lub odznak, który się zawija | `common/WrapRow.tsx` | `<WrapRow>` |
| Ekran z jedną kartą na środku (reset hasła, onboarding) | `layout/CenteredScreen.tsx` | `<CenteredScreen className>` |
| Justowany tekst prawny i opisowy | `type-roles.css` (`type-prose`) | `type-prose text-text-muted` |
| Ekran spoczynkowy trybu generatora (tekst, dźwignia, skrzynia) | `generator/shared/StageIdle.tsx` | `<StageIdleColumn>`, `<StagePrompt>`, `<StageProp>` |
| Nakładka z odpowiedzią po rozwiązaniu rundy | `minigames/guessers/SolvedOverlay.tsx` | `<SolvedOverlay answer large>` |

## Co blokuje `check:styles`

- stara skala promieni (`rounded-xl`...) i `rounded-[..]`,
- nadpisywanie promienia w `Button`, `Input`, `Textarea`, `Select`, `Surface`, `Badge`, `InfoChip`, `ToggleChip`,
- natywny `title` i ręczne `data-tooltip` na elementach DOM,
- nowy surowy `<button>` ostylowany jak przycisk (kafle, uchwyty i klawisze gry używają `TileButton`),
- kolory spoza tokenów i style inline z literałami,
- (`duplicationGuards.test.ts`, część `npm run check`) ten sam ciąg klas (45+ znaków) w trzech miejscach, literały `#hex` i `rgb()` w kodzie i arkuszach (kolory grafik i canvasu czytaj z `--palette-*` przez `paletteColor()`) oraz lokalny komponent o nazwie komponentu z `common`.

## Jak zmienić wygląd wszystkich elementów danego rodzaju

1. Znajdź wiersz w tabeli i zmień wartość w komponencie lub tokenie.
2. Nie dopisuj nadpisań w miejscu użycia. Jeśli potrzebny jest nowy wariant, dodaj go do komponentu.
3. Uruchom `npm run check` i `npm run test:unit`.
4. Gdy guard duplikatów zgłosi trzecią kopię klas, wyciągnij komponent (`common` albo folder funkcji) albo wspólną stałą. Nie zmieniaj kolejności klas.
