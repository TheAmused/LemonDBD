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

import { safeGetItem, safeRemoveItem, safeSetItem } from '@/utils/safeStorage';

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

// ---------------------------------------------------------------------------
// Auth + error helpers shared by every client-side API caller.
// ---------------------------------------------------------------------------

/**
 * The login session is an HttpOnly cookie set by the backend: JavaScript never sees the
 * token, so a script-injection bug cannot steal it. The only thing kept in localStorage is
 * this non-secret flag meaning "this browser signed in", used to skip pointless requests.
 */
export const SESSION_FLAG_KEY = 'lemondbd_signed_in';
/** Pre-cookie versions stored the JWT itself under this key; it is wiped on load. */
export const LEGACY_AUTH_TOKEN_KEY = 'lemondbd_token';
/** Opaque, non-secret stand-in for "a session exists" (never sent to the server). */
export const SESSION_MARKER = 'cookie-session';

/** `SESSION_MARKER` when this browser is signed in, else null (SSR, signed out, storage blocked). */
export function getAuthToken(): string | null {
  return safeGetItem(SESSION_FLAG_KEY) === '1' ? SESSION_MARKER : null;
}

/** Remember / forget that this browser has a session; also drops any legacy stored token. */
export function setSessionFlag(signedIn: boolean): void {
  safeRemoveItem(LEGACY_AUTH_TOKEN_KEY);
  if (signedIn) safeSetItem(SESSION_FLAG_KEY, '1');
  else safeRemoveItem(SESSION_FLAG_KEY);
}

/**
 * Request headers (+ optional JSON content type). Browser requests are authenticated by the
 * session cookie, so nothing is added for `undefined`, empty or `SESSION_MARKER` tokens. An
 * explicit real JWT (scripts, API clients, tests) is still sent as `Authorization: Bearer`.
 */
export function authHeaders(
  token?: string | null,
  opts: { json?: boolean } = {}
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token && token !== SESSION_MARKER) headers.Authorization = `Bearer ${token}`;
  if (opts.json) headers['Content-Type'] = 'application/json';
  return headers;
}

/** fetch() that sends the session cookie (and an explicit Bearer token, if given); caller headers win. */
export function authFetch(
  input: RequestInfo | URL,
  init: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const { token, headers, ...rest } = init;
  const merged = new Headers(authHeaders(token));
  new Headers(headers).forEach((value, key) => merged.set(key, value));
  return fetch(input, { credentials: 'include', ...rest, headers: merged });
}

/** `err.message` for Error instances, otherwise the fallback. */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Common JSON error envelope returned by the backend. */
export interface ApiErrorBody {
  error?: string;
  error_code?: string;
}

/** True when a fetch/promise was cancelled through an AbortController. */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/** Error thrown by the user-profile / showcase API clients. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
