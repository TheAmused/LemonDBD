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
} as const;
