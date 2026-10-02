// frontend/src/locales/es/errorPages.ts
export default {
  backHome: 'Volver al inicio',
  goBack: 'Volver',
  statusLabel: 'Estado',
  addressLabel: 'Dirección',
  pageLabel: 'Página',
  accountLabel: 'Cuenta',
  guest: 'Invitado (sin iniciar sesión)',
  nextTitle: 'A dónde ir ahora',
  notFound: {
    code: '404',
    status: '404 · No encontrada',
    title: 'Página no encontrada',
    text: 'Esta página no existe, se ha movido o la dirección tiene un error.',
  },
  forbidden: {
    code: '403',
    status: '403 · Prohibido',
    title: 'Acceso prohibido',
    textSignedIn: 'Tu cuenta no tiene permiso para abrir esta página.',
    textGuest: 'Inicia sesión con una cuenta de administrador para abrir esta página.',
  },
  blocked: {
    code: 'Bloqueada',
    status: 'Bloqueada por un administrador',
    title: 'Página bloqueada',
    text: 'Un administrador ha desactivado {page} por ahora.',
    textGeneric: 'Un administrador ha desactivado esta página por ahora.',
    hint: 'Suele ser temporal, por mantenimiento o para corregir un error. El resto del sitio sigue funcionando.',
  },
} as const;
