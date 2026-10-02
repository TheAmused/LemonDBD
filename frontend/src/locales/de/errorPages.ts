// frontend/src/locales/de/errorPages.ts
export default {
  backHome: 'Zurück zur Startseite',
  goBack: 'Zurück',
  statusLabel: 'Status',
  addressLabel: 'Adresse',
  pageLabel: 'Seite',
  accountLabel: 'Konto',
  guest: 'Gast (nicht angemeldet)',
  nextTitle: 'Wohin als Nächstes',
  notFound: {
    code: '404',
    status: '404 · Nicht gefunden',
    title: 'Seite nicht gefunden',
    text: 'Diese Seite existiert nicht, wurde verschoben oder die Adresse enthält einen Tippfehler.',
  },
  forbidden: {
    code: '403',
    status: '403 · Verboten',
    title: 'Zugriff verweigert',
    textSignedIn: 'Dein Konto hat keine Berechtigung, diese Seite zu öffnen.',
    textGuest: 'Melde dich mit einem Administratorkonto an, um diese Seite zu öffnen.',
  },
  blocked: {
    code: 'Gesperrt',
    status: 'Von einem Administrator gesperrt',
    title: 'Seite gesperrt',
    text: '{page} wurde von einem Administrator vorübergehend abgeschaltet.',
    textGeneric: 'Diese Seite wurde von einem Administrator vorübergehend abgeschaltet.',
    hint: 'Das ist meist nur vorübergehend, wegen Wartung oder einer Fehlerbehebung. Der Rest der Seite funktioniert weiterhin.',
  },
} as const;
