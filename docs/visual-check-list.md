# Lista do sprawdzenia wzrokiem po zmianach w stylach

Branch `refactor/adopt-shared-components`. Zmiany są w kodzie sprawdzone przez `tsc`, `check:styles` i testy jednostkowe, ale wygląd trzeba obejrzeć. Każdy punkt: co się zmieniło i na co patrzeć. Sprawdzaj w trzech szerokościach: telefon (około 360 do 390 px), tablet (około 768 px), desktop (1440 px i więcej). Motywy: ciemny, jasny i jasny cytrynowy.

Oznaczenia: M telefon, T tablet, D desktop.

## 1. Zmiany globalne (widać na każdej stronie)

- [ ] **Promienie rogów.** Przyciski i pola 12 px (wcześniej 8 lub 15), karty 16 px (wcześniej 15, 16, 18), modale 20 px (wcześniej 18), małe pudełka i chipy 6 px (wcześniej 4 do 8). Patrz, czy nic nie wygląda zbyt okrągło (małe kafle) lub zbyt kwadratowo.
- [ ] **Kolor tekstu w drobnych etykietach i przyciskach xs.** Naprawa `cn()` przywróciła kolory, które były po cichu gubione. Szukaj miejsc, gdzie tekst jest teraz kolorowy, a wcześniej był szary (i odwrotnie).
- [ ] **Przyciski CTA** w generatorze (koło, slot machine, loot crate, tarot, instant): teraz mają zaokrąglone rogi (12 px), wcześniej były kwadratowe.
- [ ] **Cel dotyku 44 px** w przyciskach-ikonach (M, T): sprawdź, czy rzędy ikon nie wychodzą poza ekran.
- [ ] **Poświaty** w animacjach (nowe tokeny): kolor i siła w koła, kartach tarota, klawiszach, wynikach streaków. Siła mogła się lekko zmienić (stałe rozmiary 12, 20, 32 px).
- [ ] **Warstwy.** Okno otwarte z okna, menu rozwijane nad modalem, tooltip nad wszystkim, konfetti nad stroną.

## 2. Strony i obszary

### Smash or Pass
- [ ] Hub: pasek akcji (ikona rankingu ma teraz wariant `amberSoft`), filtry roli i płci jako `SegmentedControl` (M: czy mieszczą się w wierszu, czy przewijają).
- [ ] Wybór rostera: przełącznik oficjalne/własne jako `SegmentedControl`, pusty stan jako `EmptyState`.
- [ ] Karta: tył karty (przycisk obracania `soft`), plakietka roli, panele statystyk jako `Surface`.
- [ ] Kreatory: pusty stan kandydatów (przycisk dodania), sekcje zwijane (`AccordionSection`), tagi ról z przyciskiem usuwania (`Badge` z przyciskiem).
- [ ] Persona: kafle statystyk (`Surface`), plakietka "udostępnione" (`Badge overlay`).
- [ ] Modal "jak grać": chipy i karty.

### Tier listy
- [ ] Hub: sekcja oficjalnych (`AccordionSection` z banerem i licznikiem), karty (`Badge overlay` na banerze), przycisk opisu (`DescriptionPeek` bez zmian).
- [ ] Edytor: pasek narzędzi (przyciski `Button`, kontrolki skali), wybór katalogu i presetu (`ToggleChip`), sekcje kreatora zwijane.
- [ ] Wyszukiwanie w puli, wiersze menu w edytorze.

### Streaki i wyzwania
- [ ] Panel wyzwania: przyciski nagłówka, plakietki, ekran logowania (`AuthRequiredState`).
- [ ] Ekrany startowe: przyciski `Button`, karty `Surface`.
- [ ] Tablica Chaos i modale tokenów/tarczy: karty z kolorową ramką (`Surface` z nadpisaniem koloru ramki).
- [ ] Historia: panel puli perków (`SearchInput`).

### Minigry
- [ ] Hub: kafle z przyciskami-linkami (`buttonClassName`), plakietki statusów.
- [ ] Gry: karty gier (`Surface`), podpowiedzi (`InfoChip`).
- [ ] Kreator: przycisk zapisu, karty.

### Postacie i perki
- [ ] Przełącznik Ocalały/Zabójca jako `SegmentedControl` (kolory zielony i czerwony).
- [ ] Przycisk "Moje postacie" (`Button` amber gdy włączony).
- [ ] Filtry perków: wyszukiwarka w kształcie pill (`SearchInput pill`) na szerokościach 1440 do 1800 px, liczniki w przyciskach (`Badge onAccent`).
- [ ] Szczegóły postaci: sekcje wyposażenia (`Surface`, liczniki `Badge`), wybór kategorii (`MenuItem` na telefonie), nawigacja prev/next (`buttonClassName`).

### Profil i admin
- [ ] Profil: sekcje zwijane z banerem (`AccordionSection`: konto, główni, zgłoszenia błędów z przyciskiem w nagłówku i kropką nieprzeczytanych).
- [ ] Admin: tabela użytkowników (przyciski-ikony `Button icon`, plakietki ról), kontrolki kill switchów (`SegmentedControl`), karty.
- [ ] Zgłoszenia błędów w profilu: statusy (`Badge`).

### Mapy
- [ ] Pasek głosowy: przyciski `soft`/`secondary`, przełącznik źródła (`SegmentedControl` z wyłączoną opcją i tooltipem).

### Sidebar i okna
- [ ] Sidebar: dolne kontrolki (język, motyw, zgłoś błąd, kawa) jako `Button`, menu języka i motywu (`MenuItem flush`), sekcja użytkownika.
- [ ] Modale: dolny arkusz na telefonie (rogi tylko u góry), pełny ekran na telefonie bez zaokrągleń, okno nad oknem.
- [ ] Onboarding: przyciski, wybór języka (`ToggleChip`), karty.

## 2b. Druga seria zmian (mniej wyjątków)

- [ ] **Toast "szkic przywrócony"** w kreatorze rosterów i tier list: ten sam wygląd i miejsce (prawy górny róg), przycisk "zacznij od nowa" i zamknięcie. M: szerokość toastu na wąskim ekranie.
- [ ] **Kafle z ikoną** (`IconTile`): wymóg logowania, brama NSFW, raport (sukces i błąd), logo w sidebarze i onboardingu, ekran rankingu Smash or Pass, ikony sekcji wyposażenia. Wszystkie mają teraz jedną ramkę i tint (wcześniej różne siły tła); sprawdź kolor zielony w raporcie (wcześniej nieistniejący kolor).
- [ ] **Małe przyciski na miniaturach** (usuń kandydata, usuń element tier listy, ostrzeżenie o wyłączeniu, wyczyść slot perka): teraz okrągłe `Button overlay` 24 px (wcześniej kwadratowe 20 px). M: dotyk (niewidzialna strefa 44 px).
- [ ] **Przyciski "dodaj" z przerywaną ramką**: dodaj rundę, dodaj kandydata, dodaj tier, przenieś tutaj, wgraj obraz w zgłoszeniu błędu.
- [ ] **Miniatury** w podpowiedziach i podglądach (autouzupełnianie postaci, kreator rund, guessery): jedna ramka i rozmiar.
- [ ] **Sekcja "Moje listy"** w hubie tier list: teraz `AccordionSection` z przyklejonym nagłówkiem. M: czy nagłówek zawija się z przyciskami (Importuj, Nowa lista), nie zasłania go górny pasek, i czy przykleja się przy przewijaniu.
- [ ] **Zwijanie** (wszystkie sekcje, rozwijane wpisy w zgłoszeniach, grupy prób, podgląd następnego rzędu, szuflady postaci): jedna animacja; zamknięte treści nie są już dostępne klawiaturą. Sprawdź menu otwierające się poza szufladą w postaci (wybór kategorii).
- [ ] **Karty wyboru** (`SelectableCard`): filtry statusów i lista raportów w adminie, wybór silnika głosu i jakości modelu, wybór perków we własnym zestawie. Zaznaczenie wygląda wszędzie tak samo (obwódka akcentu, tint, ring). Silniki głosu są teraz przyciskami, a nie klikalnymi divami.
- [ ] **Próbniki koloru** w tier listach (`ColorSwatch`): zaznaczenie, kółko własnego koloru z ikoną i tęczą.
- [ ] **Przełączniki**: "dopasuj" w skali tier listy (teraz `Button`), "zaznacz wszystko" w onboardingu (teraz `ToggleChip` z ikoną).
- [ ] **Linki w zdaniu** (`InlineLink`): regulamin i zasady w rejestracji, "spróbuj ponownie" w streakach, "odrzuć" w banerze weryfikacji.
- [ ] **Baner "wkrótce"** w osiągnięciach: teraz `Badge` w rozmiarze lg.

## 2c. Trzecia seria (wyzwania i pasek akcji)

- [ ] **Nagłówek wyzwań** (Chaos, Gauntlet, Historia, Page streak): kafle statystyk, przycisk trybu/trudności i ikony akcji (zasady, statystyki, wygrane, porzuć, animacje, pula perków) to teraz `Surface` i `Button` o tej samej wysokości 44 px i promieniu 12 px (kafle statystyk miały wcześniej 16 px). M: czy ikony akcji nadal dzielą rząd po równo; T: czy rząd się zawija jak wcześniej.
- [ ] **Zwijany pasek akcji na telefonie** (strzałka pod nagłówkiem): animacja i ukrywanie bez zmian, teraz przez wspólny `Collapsible`. D i T: przyciski zawsze widoczne. Sprawdź, że na szerokości tuż nad 640 px przyciski nie znikają.
- [ ] **Okno wyboru trybu** (Gauntlet, poziom trudności, tryb historii): kafle to `SelectableCard`; zaznaczony kafel ma czerwoną obwódkę, tint i ring zamiast białego pierścienia z odstępem. Przycisk "Zasady" w oknie jest zwykłym `Button`.
- [ ] **Baner weryfikacji e-maila** w postaciach: przycisk "Zweryfikuj" to `Button onAccent`, link "odrzuć" to `InlineLink`.
- [ ] **Pasek "Zaakceptuj" w trybie wyboru odblokowanych postaci** (Postacie): teraz ten sam pasek i przycisk (zielony, 44 px, szerokość do 180 px) co w streakach; wcześniej przycisk był mniejszy (sm). Pasek w onboardingu (Kontynuuj) korzysta z tego samego komponentu, ale zostaje szeroki i na całą szerokość ekranu (bez sidebaru).

## 3. Rzeczy świadomie bez zmian (nie szukaj błędu)

Przyciski gry w Smash or Pass, klawisze i mikrofon, koło losowania, kafle i miniatury, nagłówki akordeonów poza `AccordionSection`, karty wyboru. Pełna lista wyjątków jest w `docs/shared-components-adoption.md` (sekcje 1 do 3), a limit nowych ręcznych przycisków w `scripts/raw-buttons-baseline.json`.

## 4. Jak zgłaszać

Dla każdego problemu podaj: strona, szerokość, motyw, co jest nie tak. Jeśli to kwestia wartości (np. promień jest za duży), zmiana jest w jednym miejscu (patrz `docs/style-sources.md`).
