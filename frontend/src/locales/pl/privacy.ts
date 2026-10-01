// frontend/src/locales/pl/privacy.ts
export default {
  pageTitle: "LemonDBD - Polityka prywatności",
  heading: "Polityka prywatności",
  backToAbout: "Wróć do strony O nas",
  lastUpdatedLabel: "Ostatnia aktualizacja",
  lastUpdated: "1 października 2026",
  intro:
    "Ta strona wyjaśnia, jakie dane osobowe zbiera <brand>LemonDBD</brand>, po co, kto ma do nich dostęp i co możesz z nimi zrobić. Celowo napisaliśmy ją krótko i prostym językiem.",
  summaryHeading: "W skrócie",
  summary: [
    "Zbieramy tylko to, czego strona potrzebuje do działania: konto, rzeczy, które na nim zapisujesz, i podstawowe dane techniczne.",
    "Bez reklam, bez sprzedaży danych i bez śledzenia między stronami.",
    "Nasza analityka jest hostowana przez nas i nie używa plików cookie.",
    "W każdej chwili możesz poprosić o wgląd w swoje dane, ich poprawienie lub usunięcie.",
  ],
  sections: {
    whoWeAre: {
      heading: "Kim jesteśmy",
      paragraphs: [
        "<brand>LemonDBD</brand> to darmowa strona stworzona przez fanów, towarzysząca grze <i>Dead by Daylight</i>, prowadzona przez <brand>LemonTeam</brand>. Jesteśmy administratorem danych osobowych opisanych na tej stronie.",
        "<brand>LemonDBD</brand> jest projektem nieoficjalnym i nie jest powiązane z Behaviour Interactive Inc. ani przez nią wspierane. <i>Dead by Daylight</i> oraz jej nazwy, obrazy i inne elementy gry należą do ich właścicieli.",
      ],
      items: [],
    },
    dataWeCollect: {
      heading: "Co zbieramy",
      paragraphs: ["Z większości strony możesz korzystać bez konta. W zależności od tego, co robisz, przetwarzamy:"],
      items: [
        "<b>Dane konta:</b> nazwę użytkownika, adres e-mail, skrót (hash) hasła (nigdy samo hasło), awatar, preferowany język oraz krótkotrwałe kody weryfikacyjne i resetu hasła.",
        "<b>To, co zapisujesz:</b> posiadane postacie i perki, prezentację profilu, tier listy, własne wyzwania, serie, osiągnięcia i głosy w Smash or Pass. Osoby bez konta otrzymują losowy identyfikator sesji, aby zapamiętać ich głosy w Smash or Pass.",
        "<b>Zgłoszenia błędów i wiadomości:</b> treść, zrzuty ekranu, imię i adres e-mail, które nam wysyłasz. Goście muszą podać e-mail, abyśmy mogli odpowiedzieć.",
        "<b>Dane techniczne:</b> adres IP, typ przeglądarki i szczegóły żądań, używane do ograniczania liczby zapytań, zapobiegania nadużyciom i naprawiania błędów.",
        "<b>Komendy głosowe (mapy):</b> po ich włączeniu dźwięk z mikrofonu służy do rozpoznawania nazw map. Jak to działa, opisujemy w sekcji o pamięci przeglądarki i podmiotach trzecich poniżej.",
      ],
    },
    howWeUse: {
      heading: "Po co ich używamy",
      paragraphs: ["Dane osobowe wykorzystujemy tylko do poniższych celów, a tam, gdzie obowiązuje RODO, opieramy się na tych podstawach prawnych:"],
      items: [
        "Aby założyć i prowadzić Twoje konto, przechowywać zapisane dane oraz wysyłać e-maile weryfikacyjne i do resetu hasła (wykonanie usługi na Twoją rzecz).",
        "Aby odpowiadać na zgłoszenia błędów i prośby (nasz uzasadniony interes we wspieraniu użytkowników lub Twoja prośba).",
        "Aby chronić stronę, powstrzymywać spam i nadużycia oraz naprawiać błędy (nasz uzasadniony interes).",
        "Aby wiedzieć, z których podstron korzystacie, i ulepszać stronę, za pomocą analityki przyjaznej prywatności (nasz uzasadniony interes).",
        "Tam, gdzie prosimy o zgodę, np. na włączenie funkcji, która jej wymaga, możesz ją w każdej chwili wycofać.",
      ],
    },
    analytics: {
      heading: "Analityka",
      paragraphs: [
        "Korzystamy z <b>Umami</b>, otwartoźródłowego narzędzia analitycznego, które hostujemy sami. Nie używa plików cookie, nie śledzi Cię na innych stronach i nie zapisuje Twojego adresu IP.",
        "Zapisuje anonimowe dane o wizytach, takie jak odwiedzona podstrona, źródło wejścia, przeglądarka, system operacyjny, typ urządzenia, rozmiar ekranu i przybliżony kraj.",
      ],
      items: [],
    },
    storage: {
      heading: "Cookie, pamięć lokalna i podmioty trzecie",
      paragraphs: [
        "Po zalogowaniu LemonDBD ustawia jeden ściśle niezbędny plik cookie: ciasteczko sesji, które utrzymuje Cię zalogowanym przez {sessionWindow} lub do wylogowania. Ma ono flagę HttpOnly, więc skrypty na stronie nie mogą go odczytać, i nigdy nie służy do śledzenia. Poza nim pamięć lokalna przeglądarki przechowuje drobne dane, dzięki którym strona działa lub pamięta Twoje wybory, np. znacznik zalogowania, stan paska bocznego i paneli, ustawienia dźwięku, wersje robocze, wybrane rostery i identyfikator sesji Smash or Pass.",
        "Są to dane ściśle niezbędne lub wyłącznie wygodnościowe, więc baner ze zgodą nie jest potrzebny. Pamięć lokalna zostaje na Twoim urządzeniu i możesz ją w każdej chwili wyczyścić w przeglądarce; wylogowanie usuwa ciasteczko sesji.",
        "<b>Komendy głosowe:</b> w Chrome, Edge i Safari rozpoznawanie mowy zapewnia producent przeglądarki (np. Google lub Apple), więc dźwięk może być do niego wysyłany zgodnie z jego polityką prywatności. W innych przeglądarkach LemonDBD pobiera mały model mowy i przetwarza dźwięk wyłącznie na Twoim urządzeniu.",
      ],
      items: [],
    },
    sharing: {
      heading: "Kto widzi Twoje dane",
      paragraphs: ["Nie sprzedajemy danych osobowych ani nie używamy ich do reklam. Udostępniamy je tylko w razie potrzeby:"],
      items: [
        "<b>Treści publiczne:</b> rzeczy, które sam publikujesz, np. publiczne tier listy, rostery i rankingi, są widoczne dla innych odwiedzających wraz z Twoją nazwą użytkownika i awatarem.",
        "<b>Dostawcy usług:</b> nasz dostawca hostingu oraz {mailProvider} (który dostarcza nasze e-maile weryfikacyjne i do resetu hasła) przetwarzają dane w naszym imieniu, wyłącznie by utrzymać stronę i wysłać e-maile, o które prosisz.",
        "<b>Discord:</b> gdy wysyłasz zgłoszenie błędu, jego treść (w tym imię, adres e-mail i zrzuty ekranu) trafia na prywatny kanał naszego zespołu.",
        "<b>Powody prawne:</b> jeśli wymaga tego prawo lub aby chronić stronę i użytkowników przed nadużyciami.",
      ],
    },
    transfers: {
      heading: "Przekazywanie danych za granicę",
      paragraphs: [
        "Niektórzy dostawcy, z których korzystamy, mogą przetwarzać dane poza Twoim krajem, także poza EOG lub Wielką Brytanią. W takim przypadku opieramy się na zabezpieczeniach, takich jak standardowe klauzule umowne lub decyzja o odpowiednim stopniu ochrony.",
      ],
      items: [],
    },
    retention: {
      heading: "Jak długo je przechowujemy",
      paragraphs: [
        "Dane konta i zapisane treści są przechowywane, dopóki istnieje Twoje konto. Kody weryfikacyjne wygasają po {verificationWindow}, linki do resetu hasła po {resetWindow}, a sesje logowania po {sessionWindow}. Serie nieaktywne przez {streakPrune} są kończone automatycznie. Zgłoszenia błędów przechowujemy tak długo, jak trzeba do rozwiązania problemu i do naszej dokumentacji. Logi serwera są przechowywane tylko krótko. Dane analityczne są anonimowe.",
        "Konto możesz usunąć samodzielnie na stronie profilu albo poprosić nas o to. Wtedy usuwamy dane konta, zapisane treści i wgrany awatar. Twoje zgłoszenia błędów zostają w naszej dokumentacji, ale usuwamy z nich Twoje imię i adres e-mail. Kopie przesłane już na nasz prywatny kanał Discord lub zapisane w kopiach zapasowych mogą pozostać przez ograniczony czas, a to, co opublikowałeś publicznie, może zostać zanonimizowane zamiast usunięte.",
      ],
      items: [],
    },
    security: {
      heading: "Bezpieczeństwo",
      paragraphs: [
        "Chronimy Twoje dane m.in. szyfrowanym połączeniem (HTTPS), haszowaniem haseł, ograniczaniem liczby zapytań i ochroną przed spamem. Żadna usługa online nie jest w pełni bezpieczna, dlatego używaj silnego, unikalnego hasła.",
      ],
      items: [],
    },
    rights: {
      heading: "Twoje prawa",
      paragraphs: [
        "W zależności od miejsca zamieszkania (np. w EOG lub Wielkiej Brytanii) masz prawo do:",
      ],
      items: [
        "dostępu do danych osobowych, które o Tobie przechowujemy, i otrzymania ich kopii;",
        "poprawienia nieprawidłowych danych;",
        "żądania usunięcia danych („prawo do bycia zapomnianym”);",
        "ograniczenia lub sprzeciwu wobec niektórych form przetwarzania;",
        "otrzymania danych w formacie przenośnym;",
        "wycofania zgody w dowolnym momencie, jeśli przetwarzanie opiera się na zgodzie;",
        "wniesienia skargi do lokalnego organu ochrony danych (w Polsce: Prezes UODO).",
      ],
    },
    children: {
      heading: "Dzieci",
      paragraphs: [
        "LemonDBD nie jest skierowane do dzieci poniżej 13. roku życia (lub poniżej 16, jeśli w Twoim kraju obowiązuje wyższy wiek zgody) i świadomie nie zbieramy ich danych. Jeśli uważasz, że dziecko przekazało nam dane osobowe, skontaktuj się z nami, a je usuniemy.",
      ],
      items: [],
    },
    changes: {
      heading: "Zmiany tej polityki",
      paragraphs: [
        "Możemy aktualizować tę stronę, gdy zmieni się serwis lub prawo. Data „Ostatnia aktualizacja” na górze pokazuje najnowszą wersję, a o istotnych zmianach poinformujemy na stronie.",
      ],
      items: [],
    },
    contact: {
      heading: "Kontakt",
      paragraphs: [
        "Aby skorzystać z jakiegokolwiek prawa, zadać pytanie o prywatność lub poprosić o usunięcie konta, napisz do nas na [{contactEmail}](mailto:{contactEmail}). Zalogowani użytkownicy mogą też sami usunąć konto na stronie profilu. Pisz z adresu przypisanego do konta, abyśmy mogli potwierdzić tożsamość.",
        "Jeśli przetłumaczone wersje tej strony różnią się od angielskiej, pierwszeństwo ma wersja angielska.",
      ],
      items: [],
    },
  },
};
