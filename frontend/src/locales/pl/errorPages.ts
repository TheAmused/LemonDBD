// frontend/src/locales/pl/errorPages.ts
export default {
  backHome: 'Wróć na stronę główną',
  notFound: {
    code: '404',
    title: 'Nie znaleziono strony',
    text: 'Ta strona nie istnieje, została przeniesiona albo w adresie jest literówka.',
  },
  forbidden: {
    code: '403',
    title: 'Brak dostępu',
    textSignedIn: 'Twoje konto nie ma uprawnień do otwarcia tej strony.',
    textGuest: 'Aby otworzyć tę stronę, zaloguj się na konto administratora.',
  },
  blocked: {
    code: 'Zablokowana',
    title: 'Strona zablokowana',
    text: 'Ta strona nie jest teraz dostępna dla odwiedzających.',
  },
  error: {
    code: 'Błąd',
    title: 'Coś poszło nie tak',
    text: 'Na tej stronie wystąpił nieoczekiwany błąd. Spróbuj ponownie, a jeśli to się powtarza, wróć na stronę główną.',
    retry: 'Spróbuj ponownie',
    reference: 'Kod zgłoszenia',
  },
} as const;
