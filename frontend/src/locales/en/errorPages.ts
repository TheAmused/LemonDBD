// frontend/src/locales/en/errorPages.ts
export default {
  backHome: 'Back to home',
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
    text: 'This page isn\'t open to visitors right now.',
  },
} as const;
