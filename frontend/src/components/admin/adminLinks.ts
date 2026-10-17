// frontend/src/components/admin/adminLinks.ts
//
// Where the external admin dashboards live: the NEXT_PUBLIC_* address when it is set, otherwise the
// same host as the site on the dashboard's default port.

function externalUrl(configured: string | undefined, port: number): string {
  if (configured && configured.trim() !== '') return configured.trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:${port}`;
  return `https://localhost:${port}`;
}

/** Umami: page views and feature usage. */
export const analyticsUrl = () => externalUrl(process.env.NEXT_PUBLIC_UMAMI_URL, 8117);
/** pgAdmin: the PostgreSQL console. */
export const pgAdminUrl = () => externalUrl(process.env.NEXT_PUBLIC_PGADMIN_URL, 5050);
