// frontend/src/locales/en/errorPages.ts
export default {
  backHome: 'Back to home',
  goBack: 'Go back',
  statusLabel: 'Status',
  addressLabel: 'Address',
  pageLabel: 'Page',
  accountLabel: 'Account',
  guest: 'Guest (not signed in)',
  nextTitle: 'Where to next',
  notFound: {
    code: '404',
    status: '404 · Not found',
    title: 'Page not found',
    text: 'This page doesn\'t exist, was moved, or the address has a typo.',
  },
  forbidden: {
    code: '403',
    status: '403 · Forbidden',
    title: 'Forbidden',
    textSignedIn: 'Your account doesn\'t have permission to open this page.',
    textGuest: 'You need to sign in with an administrator account to open this page.',
  },
  blocked: {
    code: 'Blocked',
    status: 'Blocked by an administrator',
    title: 'Page blocked',
    text: '{page} has been switched off by an administrator for now.',
    textGeneric: 'This page has been switched off by an administrator for now.',
    hint: 'This is usually temporary, for maintenance or a bug fix. The rest of the site keeps working.',
  },
} as const;
