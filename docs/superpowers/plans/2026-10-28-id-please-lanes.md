# „ID, Please": trzy tory (Survivor · Killer · Mieszany), pasek nieskończoności i płaski układ

Autor wyzwania: **TheAmused**. Status: **wdrożone w kodzie** (gałąź `feature/id-please`, bez commitów). Dotyczy zmian względem wersji z `2026-10-28-id-please.md`. Ostateczne zasady z 28.10 (11:42 → 11:56) zastępują wcześniejszą wersję tego dokumentu (skończone tory jednostronne): **wszystkie trzy tory są nieskończone**.

## 1. Co zmieniono

1. **Tor mieszany (zmiana strony co mecz) żyje tylko w zakładce Survivor/Killer** (`challenge`). Zakładki Survivor i Killer mają własne tory, bez zmiany strony.
2. **Tory jednostronne są nieskończone. Odznaka Milestones dostaje się dopiero po wygraniu wszystkimi postaciami swojej strony** (do tego momentu postacie się nie powtarzają; po odznace pamięć jest wyłączona i postacie mogą wracać). **Hardcore i Hardcore+ mają odznakę po streaku 30 / 25, tak samo jak tor mieszany** (zmiana z 28.10, 15:00; wcześniej wymagały wszystkich postaci).
3. **Odznaka (jednorazowa) w każdym torze:** Milestones 50 w mieszanym, „każda postać” w jednostronnych · Hardcore 30 · Hardcore+ 25. Powtórki postaci: Milestones mieszany dozwolone; Milestones jednostronny dopóki nie ma odznaki, nie; Hardcore i Hardcore+ w każdym torze nie, w obrębie rundy (runda = wszystkie postacie danej strony).
4. **Trzy osobne kill switche** (`id_please`, `id_please_survivor`, `id_please_killer`); wyłączenie jednego nie blokuje pozostałych.
5. **Pasek postępu przyjazny nieskończoności:** odznaka stoi w ok. 62% długości, za nią przerywany ogon z ∞. Po zdobyciu odznaki znika **cały pasek** (na stałe, także w kolejnych biegach tej trudności).
6. **Płaski układ bez „pigułki w pigułce”.**

## 2. Trzy tory

| | **Survivor** | **Killer** | **Mieszany** |
|---|---|---|---|
| Tryb (kill switch, ukończenia) | `id_please_survivor` | `id_please_killer` | `id_please` |
| Zakładka / adres | `/streaks/survivor/id-please` | `/streaks/killer/id-please` | `/streaks/challenge/id-please` |
| Strona meczów | zawsze Survivor | zawsze Killer | na zmianę (start do wyboru) |
| Długość biegu | nieskończona | nieskończona | nieskończona |
| Odznaka | Milestones: wygrana **każdą postacią** swojej strony; Hardcore 30 · Hardcore+ 25 wygranych z rzędu | to samo | streak 50 · 30 · 25 |
| Powtórki postaci | Milestones: nie, **dopóki odznaka nie jest zdobyta**, potem tak; Hardcore i Hardcore+: nie (rundy) | to samo | Milestones: tak; Hardcore i Hardcore+: nie (rundy) |
| Mecz 2 | te same 4 perki przesunięte o stały krok; **bez podglądu** w setupie | to samo | mirror na drugą stronę (podgląd w setupie) |
| Pasek postępu | Milestones: zagrane / posiadane postacie; Hardcore i Hardcore+: wygrane / 30 lub 25; znika po odznace | to samo | wygrane / próg odznaki, znika po odznace |
| Wymagania konta | tylko ta strona | tylko ta strona | obie strony |
| Bieg, statystyki, historia | własne | własne | własne |

Trudności: **Milestones** (checkpoint co 10 wygranych, przegrana wraca do ostatniego), **Hardcore** (bez checkpointów, przegrana = od nowa), **Hardcore+** (bardziej „zakręcony” wzór). Tory jednostronne różnią się od siebie wyłącznie stroną.

### Odznaka Milestones toru jednostronnego i żywy skład
(Dotyczy tylko trudności Milestones; Hardcore i Hardcore+ dają odznakę za streak 30 / 25.) Odznakę przyznaje wygrana, po której **nie zostaje żadna niezagrana postać z aktualnie posiadanych** (lista żywa, bez zamrażania; do „zagranych” liczy się też postać właśnie wygrana).

- **Gracz ma 44 killerów, dochodzi 45., a on ma już odznakę:** nic się nie zmienia. Odznaka to trwały rekord; po jej zdobyciu pamięć jest wyłączona, więc nowa postać nie ma żadnego znaczenia dla rangi (ani dla 60 wygranych z rzędu).
- **Gracz zagrał 43 z 44 i odblokował 45.:** do odznaki brakują mu dwie, bieg poda je jako niezagrane.
- **Gracz ma dokładnie 44 wygrane różnymi postaciami i brakuje mu 45.:** odznaka jest przyznawana dopiero po wygranej, która zamyka listę. Jeśli 45. postać pojawia się **przed** tą wygraną, trzeba nią zagrać (żywy skład); jeśli po odznace, nic nie jest tracone.
- **Przegrana przed odznaką:** Milestones przywraca pamięć z checkpointu, Hardcore i Hardcore+ zerują ją (cała runda od nowa). Po odznace przegrana nie dotyka już pamięci.
- **Nowe próby po odznace:** też bez pamięci (powtórki dozwolone).

### Pasek postępu (`badge_progress`)
- Tor mieszany: `{current: min(streak, próg), target: próg}`.
- Tory jednostronne, Milestones: `{current: zagrane (bez bieżącej), target: posiadane postacie strony}`; target liczony na żywo. Jednostronne Hardcore i Hardcore+: jak w mieszanym (streak / 30 lub 25).
- Po odznace `badge_progress = null`: front nie rysuje paska. Wraca tylko wtedy, gdy admin zresetuje rekord.

### Bramki
Milestones jednostronny ≥ **10 postaci** strony (inaczej odznaka byłaby darmowa po kilku meczach), Hardcore ≥ 25 survivorów / ≥ 20 killerów, Hardcore+ ≥ 30; perki: zawsze aktywne + 3 × postaci (Milestones 4). Tor jednostronny nie wymaga strony przeciwnej.

## 3. Wzór (czysta arytmetyka na pozycjach, bez losowania)

`M` = liczba perków strony, `N` = liczba postaci, `s` = streak, `c` = poprzednia postać, `P0..P3` = perki poprzedniego meczu, `T` = ich suma; „wpasuj” = `mod M`, zderzenie → +1, zawsze 4 różne.

- **Mecz 1:** suma ID 4 perków `mod N`.
- **Mecz 2:** mieszany: te same ID na drugiej stronie. Jednostronny: krok `d = (c mod (M−1)) + 1`, perki = wpasuj(`Pj + d`), postać = suma nowych perków `mod N`.
- **Od meczu 3:** streak miesza się do wzoru, więc nie ma wzoru do nauczenia się, są tylko liczby. W torach jednostronnych składnik `⌊S·T / M⌋` usuwa błąd parzystości (parzyste pozycje wypadały 2,4× częściej).
- **Pamięć postaci:** gdy wzór wskaże postać już zagraną, sonda idzie krokiem zależnym od meczu (współpierwszym z `N`), nie „+1” (które dawało 14–20% par „n, n+1”).
- **Hardcore+:** wzór z iloczynami sąsiadów i meczem sprzed dwóch. Dodatkowo **perki są tasowane przy każdym starcie** (sekcja 9).
- `ALGO_VERSION = 2`.

Złoty przykład (Survivor, 54 postacie / 176 perków, otwarcie `15, 20, 30, 40`): 51 → 43 (`67, 72, 82, 92`) → 49 → 50 → 37 (pokryte testem).

W zasadach (modal) nie pokazujemy arytmetyki od meczu 3; modal ma wersje dla toru (mieszany / jednostronny) × trzy trudności.

## 4. Pasek postępu

```
Przed odznaką (Survivor, 12 / 54 postaci)
Droga do odznaki                                          12 / 54 postaci
━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━━○ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ∞
                                       🏆 (odznaka w ~62%)

Mieszany: dodatkowo drobne nacięcia checkpointów (10, 20, 30, 40), podpisane od szerokości sm.

Po odznace: brak paska. Zostają BIEŻĄCY / REKORD w nagłówku i napis „Odznaka zdobyta”.
```
Natywny `<progress>` dla czytników zostaje, rysunek jest dekoracją. Toast „Zdobyłeś odznakę…” jest komunikatem dla wszystkich.

## 5. Płaski układ

Reguła: **jeden poziom zaokrąglonej powierzchni (panel), na nim kafelki; w kartach i kafelkach żadnych pigułek.**

| Przed | Po |
|---|---|
| Karta meczu z ramką i tłem | brak karty, sekcja z nagłówkiem |
| Plakietka „SURVIVOR” przy „MATCH 3” | tekst „MATCH 3 · Survivor” z ikoną strony |
| Plakietka „ID 21” w rogu kafelka | ID zwykłym tekstem pod grafiką (`IdLabel`) |
| Plakietka „4/4 chosen” | licznik tekstem |
| Ramka „zablokowane” w panelu | zwykły wyśrodkowany tekst |
| Bloki setupu w `Surface elevated` | sekcje rozdzielone cienką linią |

## 6. Wdrożenie (stan)

**Backend:** wspólna tabela `id_please_runs` z kolumną `lane` (unikalność `(user_id, lane, difficulty)`), migracja `0033` edytowana w miejscu (idempotentne dodanie `lane` dla baz sprzed torów); `IdPleaseService(lane)` ×3, trzy blueprinty (`/api/v1/id-please-streak`, `…-survivor-streak`, `…-killer-streak`); `CHALLENGE_MODES` += 2 tryby; reset admina i e-mail, ukończenia aktywnych biegów i etykiety per tor; `chain.py`/`engine.py`/`eligibility.py`/`stats.py` świadome toru; testy: łańcuch, pamięć, odznaka każdą postacią, 13. survivor przed ostatnią wygraną, odblokowanie po odznace, przywracanie z checkpointu, kill switche, trasy, migracja, admin.

**Frontend:** typy i klienty API per tor, hooki z `lane`, `IdPleaseProgress`, płaski układ (`IdPleaseTiles`/`MatchCard`/`Setup`), karta w każdej zakładce ze swoim torem i kill switchem, bramka trasy per tryb, modal trybu i zasady per tor × trudność, trofea (trzy półki × trzy trudności), admin (3 wiersze, etykiety w 5 językach), 5 języków.

## 7. Weryfikacja

`tsc`, `oxlint`, guardy repozytorium (183/183), testy jednostkowe frontendu (w tym trzy półki trofeów), `pytest tests/unit` backendu; Playwright na prawdziwym Flasku (SQLite) i Next dev: trzy tory, kill switche, kilka rozmiarów ekranu, axe (WCAG 2.2 AA), klawiatura, ciemny motyw, `reduced-motion`, języki.

## 8. Ryzyka i uwagi

- **Hardcore i Hardcore+ w torach jednostronnych** mają ten sam próg odznaki co tor mieszany (30 / 25), więc nie wymagają wygrania każdą postacią. Pamięć postaci nadal zeruje się przy przegranej, a runda zaczyna od nowa. Wygrana każdą postacią zostaje wymogiem tylko dla Milestones.
- **Końcówka rundy mniej swobodna:** ostatnia niezagrana postać jest narzucona, perki nadal wynikają ze wzoru.
- **Dziewięć odznak** (3 tory × 3 trudności) w modalu i na półce trofeów są grupowane po torze.
- **„Losowość” po odznace** oznacza zdjęcie pamięci postaci, nie prawdziwe losowanie: ciąg nadal jest deterministyczny dla danego składu i streaku.
- **Tor jednostronny łatwiej rozpracować skryptem niż mieszany**; Hardcore+ ma mecz sprzed dwóch i iloczyny sąsiadów, a do tego tasowanie perków przy każdym starcie, więc tego otwarcia nie da się nauczyć na pamięć. Skrypt może je liczyć, ale tylko po starcie.

## 9. Zmiany z 28.10 (po południu)

Na prośbę autora wyzwania (TheAmused).

- **Brak podglądu meczu 2 w torach jednostronnych** (Survivor, Killer). Setup pokazuje tylko mecz 1; w torze mieszanym podgląd obu meczów zostaje.
- **Brak kalkulatora i brak ID.** Sekcja kalkulatora usunięta z każdego toru; pod ikonami perków jest **pozycja z inwentarza `[P/S]`** (strona/slot, jak w generatorze perków: posiadane perki sortowane po nazwie, 15 na stronę), a ID postaci nie jest pokazywane. Lista perków w setupie jest w kolejności inwentarza.
- **Hardcore+ tasuje perki przy każdym starcie.** Przy rozpoczęciu biegu (i każdej kolejnej próby po porażce) posiadane perki dostają **losowe ID** (`run.perk_seed`, `blake2b(seed:id)`) i są po nich sortowane. Wzór liczy na tak ułożonej liście, więc te same cztery perki **nigdy nie dają dwa razy tego samego ciągu**. Ziarno żyje przez całą próbę (łańcuch jest dalej deterministyczny), wraca do 0 po porażce i porzuceniu, i **nie jest wysyłane do klienta**. Podgląd w Hardcore+ jest odrzucany (400), bo pierwszy mecz jest losowy; setup pokazuje o tym krótką notkę. Zasady (modal) i opis trybu mówią o tasowaniu; warianty Mirror/Shift dla Hardcore+ nie obiecują „tego samego ciągu z tego samego otwarcia”. Zastępuje to krótko rozważany zakaz 10 ostatnich otwarć (usunięty w całości, razem z `recent_openings`).
- **Odznaka jednostronnego Hardcore / Hardcore+ po streaku 30 / 25** (jak w torze mieszanym); jednostronny Milestones zostaje przy „każda postać”.
- **Checkpointy na pasku** (nacięcia co 10 wygranych) w każdym torze Milestones, także jednostronnym, plus linia „Następny checkpoint”; pasek w jednostronnym Milestones liczy postacie, w pozostałych wygrane.
- **Kafelek postaci ma tę samą wysokość co kafelki perków**, a awatar bierze zapisaną ścieżkę (`avatar_local_path`), co naprawia zły awatar „The Onryō”.
- **Migracje:** `0033_id_please` tworzy tabelę z `lane`; `0034_id_please_lanes` dodaje `lane` i zmienia unikalność na `(user_id, lane, difficulty)` dla baz utworzonych wcześniej (idempotentna, sprawdzona na Postgresie 16); `0035_id_please_perk_seed` dodaje `perk_seed INTEGER NOT NULL DEFAULT 0` (idempotentna). Na produkcji wystarczy `flask db upgrade`; brak kolumny `lane` powodował HTTP 500 na planszy.

## 10. Zasady, wyszukiwarka, cache i leniwe ładowanie (28.10, popołudnie)

- **Modal zasad ujednolicony z innymi wyzwaniami** (taka sama budowa jak Chaos/History): „How it works”, sekcja „Difficulty” ze wszystkimi trzema poziomami obok siebie (kolory zielony/bursztynowy/czerwony), Exceptions i Clarifications. Wygrana to ten sam tekst co w Gauntlecie (Killer: 3 zabójstwa lub więcej; Survivor: ucieczka bramą lub włazem, cokolwiek innego przerywa serię); tor mieszany ma jedno zdanie łączące obie strony. Dodano regułę „w każdym meczu grasz pokazaną postacią z pokazanymi 4 perkami”, standardowe wyjątki i wyjaśnienia (w tym dodatki i dary: wszystkie dostępne), „Zablokowany poziom” i „Odznaki” jako wyjaśnienia. Teksty różnią się tylko tam, gdzie reguły się różnią: tor mieszany vs jednostronny (powtórki postaci, odznaka Milestones) i Hardcore+ (tasowanie perków, brak obietnicy „to samo otwarcie = ten sam ciąg”). Usunięto zdublowaną podpowiedź o żywych listach.
- **Wyszukiwarka perków w setupie to `PerkSearchBox` ze strony Perks** (silnik `perkSearch`: typy jako chipy, menu Types, aliasy, postacie, tolerancja literówek, komunikat „perk tylko dla drugiej roli”). Dane: katalog perków ze wspólnego cache, zawężony do perków gracza.
- **Cache:** współrzędne `[P/S]` używają `useCatalogPerks` (klucz i TTL 30 min wspólne ze stroną Perks, losowaczem, listami tierów; wcześniej własny klucz pobierał cały katalog drugi raz). Skład (`roster`) i podgląd idą przez `useCachedData` z kluczem zawierającym odcisk składu, więc kolejna próba po przegranej pokazuje listy od razu; wylogowanie i zmiana konta czyszczą cache.
- **Leniwe ładowanie:** statystyki, zasady i modal trybu ładują się `next/dynamic` (jak w Gauntlecie, Chaosie i History), `eligibility` pobiera się dopiero po otwarciu wyboru trudności, a siatka perków w setupie renderuje się porcjami (`useProgressiveList`).
