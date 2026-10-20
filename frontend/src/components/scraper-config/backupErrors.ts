// frontend/src/components/scraper-config/backupErrors.ts
//
// The message to show for a failed export, import or purge: the server's own JSON error, or a
// readable one when nginx answered with its HTML page (a 413 for a file over the upload limit).
import type { Dictionary } from '@/locales/types';

export async function backupErrorMessage(res: Response, fallback: string, dict: Pick<Dictionary, 'admin'>): Promise<string> {
  if (res.status === 413) return dict.admin.importTooLarge;
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    /* not JSON: an HTML error page from the proxy */
  }
  return fallback;
}
