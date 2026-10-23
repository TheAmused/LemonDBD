// frontend/src/locales/es/errorPages.ts
export default {
  backHome: 'Volver al inicio',
  notFound: {
    code: '404',
    title: 'Página no encontrada',
    text: 'Esta página no existe, se ha movido o la dirección tiene un error.',
  },
  forbidden: {
    code: '403',
    title: 'Acceso prohibido',
    textSignedIn: 'Tu cuenta no tiene permiso para abrir esta página.',
    textGuest: 'Inicia sesión con una cuenta de administrador para abrir esta página.',
  },
  blocked: {
    code: 'Bloqueada',
    title: 'Página bloqueada',
    text: 'Esta página no está abierta a los visitantes por ahora.',
  },
  error: {
    code: 'Error',
    title: 'Algo salió mal',
    text: 'Esta página ha tenido un error inesperado. Inténtalo de nuevo; si sigue pasando, vuelve al inicio.',
    retry: 'Reintentar',
    reference: 'Referencia',
  },
} as const;
