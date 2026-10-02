// frontend/src/locales/en/errorPages.ts
export default {
  backHome: 'Back to home',
  goBack: 'Go back',
  notFound: {
    code: '404',
    title: 'Page not found',
    text: 'This page doesn\'t exist, was moved, or the address has a typo.',
  },
  forbidden: {
    code: '403',
    title: 'Forbidden',
    textSignedIn: 'Your account doesn\'t have permission to open this page.',
    textGuest: 'You need to sign in with an administrator account to open this page.',
  },
  blocked: {
    code: 'Blocked',
    title: 'Page blocked',
    text: '{page} has been switched off by an administrator for now.',
    textGeneric: 'This page has been switched off by an administrator for now.',
    hint: 'This is usually temporary, for maintenance or a bug fix. The rest of the site keeps working.',
  },
} as const;
