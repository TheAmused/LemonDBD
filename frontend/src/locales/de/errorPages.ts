// frontend/src/locales/de/errorPages.ts
export default {
  backHome: 'Zurück zur Startseite',
  notFound: {
    code: '404',
    title: 'Seite nicht gefunden',
    text: 'Diese Seite existiert nicht, wurde verschoben oder die Adresse enthält einen Tippfehler.',
  },
  forbidden: {
    code: '403',
    title: 'Zugriff verweigert',
    textSignedIn: 'Dein Konto hat keine Berechtigung, diese Seite zu öffnen.',
    textGuest: 'Melde dich mit einem Administratorkonto an, um diese Seite zu öffnen.',
  },
  blocked: {
    code: 'Gesperrt',
    title: 'Seite gesperrt',
    text: 'Diese Seite ist für Besucher derzeit nicht geöffnet.',
    hint: 'Sie ist vorerst nur für Administratoren verfügbar. Der Rest der Seite funktioniert weiterhin.',
  },
} as const;
