// frontend/src/services/maintenanceStatus.ts
//
// Is the site closed for maintenance, and is it closed for this visitor? Used by the maintenance page and
// the watcher that moves an already-open tab there. Kept out of services/siteConfig.ts so the code every
// page loads does not carry it.
import { apiUrl } from '@/utils/api';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The answer of GET /site-config/maintenance. `blocked` is about the caller (their address and session). */
export interface MaintenanceStatus {
  active: boolean;
  blocked: boolean;
}

/** Is the site closed, and is it closed for this visitor? Null when the server cannot be reached. */
export async function fetchMaintenanceStatus(signal?: AbortSignal): Promise<MaintenanceStatus | null> {
  try {
    const res = await fetch(apiUrl('/api/v1/site-config/maintenance'), { signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!isRecord(body)) return null;
    return {
      active: body.active === true,
      blocked: body.blocked === true,
    };
  } catch {
    return null;
  }
}
