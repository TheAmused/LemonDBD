// frontend/src/utils/api.ts
/**
 * Single source of truth for all API & static backend asset URL resolution.
 *
 * In the browser:
 *   - By default, returns empty string `""` so that all requests are same-origin
 *     (`/api/v1/...` and `/static/...`). This ensures seamless compatibility with:
 *       1. Cloudflare Quick Tunnels (*.trycloudflare.com)
 *       2. Localhost development (HTTP port 80 / HTTPS port 443)
 *       3. Custom production domains & LAN IPs (192.168.x.x)
 *       4. No cross-origin (CORS) or SSL self-signed certificate mismatches
 *   - If NEXT_PUBLIC_API_URL is explicitly configured to an external remote domain
 *     (not localhost / 127.0.0.1), that remote domain is used.
 *
 * On the server (SSR / Next.js Node container / build time):
 *   - Resolves to INTERNAL_API_URL (http://backend:5000) or NEXT_PUBLIC_API_URL.
 */

export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }
    return '';
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://backend:5000'
  ).replace(/\/+$/, '');
}

/**
 * Builds a normalized API URL from a relative endpoint.
 *
 * Examples:
 *   apiUrl('/api/v1/auth/login') -> '/api/v1/auth/login' (in browser)
 *   apiUrl('/api/v1/perks')      -> '/api/v1/perks'      (in browser)
 */
export function apiUrl(endpoint: string): string {
  const base = getBackendBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * Builds a normalized static asset URL (for perk icons, portraits, avatars).
 */
export function staticUrl(rawPath?: string | null): string | undefined {
  if (!rawPath) return undefined;
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
  const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
  const base = getBackendBaseUrl();
  return base ? `${base}/static/${cleanPath}` : `/static/${cleanPath}`;
}

export const backendBase = typeof window !== 'undefined' ? '' : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:5000');