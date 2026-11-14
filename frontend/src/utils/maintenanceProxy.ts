// frontend/src/utils/maintenanceProxy.ts
//
// The proxy's side of maintenance mode (see backend services/maintenance_mode.py). Before a page is
// served it asks the backend whether the site is closed for this visitor; a blocked visitor gets the
// maintenance page instead. The backend decides (address list, admin session), so the rules live in one place.
//
// While maintenance is off the answer is remembered for a few seconds, so ordinary traffic costs one
// backend call per `QUIET_MS` rather than one per page. While it is on, every page asks: the answer depends
// on who is asking. If the backend cannot answer, the page is served (a broken check must not close the site).

export interface MaintenanceVerdict {
  blocked: boolean;
  /** UTC ISO time the maintenance window ends, or null. */
  until: string | null;
}

const OPEN: MaintenanceVerdict = { blocked: false, until: null };
const QUIET_MS = 5000;
const TIMEOUT_MS = 1500;

let quietUntil = 0;

/** Forget the remembered "maintenance is off" answer (tests). */
export function resetMaintenanceCache(): void {
  quietUntil = 0;
}

export interface MaintenanceCheck {
  backendUrl: string;
  /** The visitor's cookie header, so a signed-in admin is recognised. */
  cookie: string;
  /** The visitor's address as nginx saw it (X-Real-IP); empty when the request did not come through nginx. */
  clientIp: string;
  now?: number;
  fetchImpl?: typeof fetch;
}

export async function checkMaintenance({ backendUrl, cookie, clientIp, now = Date.now(), fetchImpl = fetch }: MaintenanceCheck): Promise<MaintenanceVerdict> {
  if (now < quietUntil) return OPEN;
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (clientIp) headers['x-real-ip'] = clientIp;
  try {
    const res = await fetchImpl(`${backendUrl}/api/v1/site-config/maintenance`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return OPEN;
    const body = (await res.json()) as { active?: unknown; blocked?: unknown; until?: unknown };
    if (body.active !== true) {
      quietUntil = now + QUIET_MS;
      return OPEN;
    }
    return { blocked: body.blocked === true, until: typeof body.until === 'string' ? body.until : null };
  } catch {
    return OPEN;
  }
}

/** The `Retry-After` value (whole seconds, at least 1) for a window ending at `until`; null when it has no end. */
export function retryAfterSeconds(until: string | null, now: number = Date.now()): number | null {
  const end = until ? Date.parse(until) : NaN;
  return Number.isNaN(end) ? null : Math.max(1, Math.ceil((end - now) / 1000));
}

/** The maintenance page itself is never rewritten onto itself. */
export function isMaintenancePage(pathname: string, locales: readonly string[]): boolean {
  const [locale, segment] = pathname.split('/').filter(Boolean);
  return locales.includes(locale ?? '') && segment === 'maintenance';
}
