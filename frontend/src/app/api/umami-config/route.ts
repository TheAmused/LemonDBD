// frontend/src/app/api/umami-config/route.ts
//
// Serves the Umami tracking config (website ID + dashboard URL) to the
// client, self-provisioning the website in Umami the first time it's asked
// for one -- no separate container, no separate script to run, nothing to
// paste into .env by hand.
//
// Why this exists: Umami won't accept tracking pings for a domain until a
// "website" record for it exists in its own database, and Next.js bakes
// NEXT_PUBLIC_* env vars into the JS bundle at build time -- so the old way
// (create a website by hand in the Umami UI, paste its generated UUID into
// NEXT_PUBLIC_UMAMI_WEBSITE_ID, rebuild the frontend image) had to be
// repeated after every `docker compose down -v` reset, since that wipes
// Umami's database (same postgres_data volume, separate `umami` database --
// see docker/postgres-init/01-init-umami.sql) and its generated UUID with
// it.
//
// Instead: this route talks to Umami directly over the internal Docker
// network (no TLS, no going through nginx) the first time anyone loads a
// page after a reset, logs in with Umami's default admin credentials
// (always valid right after a reset, since the reset wipes any password
// change too), creates or reuses the website, and caches the ID in memory
// for the life of this container -- self-healing on every reset with zero
// manual steps, and with no build-time dependency at all.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache for the life of this Node process -- avoids re-logging-in
// and re-listing websites on every single page load, and de-dupes concurrent
// first-requests into a single provisioning attempt.
let cachedWebsiteId: string | null = null;
let inFlight: Promise<string | null> | null = null;

interface UmamiWebsite {
  id: string;
  name?: string;
  domain?: string;
}

function getSanitizedDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

export function getRuntimePublicUrl(): string {
  // Read dynamically at request time to prevent Next.js build-time inlining
  const raw =
    process.env['UMAMI_PUBLIC_URL'] ||
    process.env['NEXT_PUBLIC_UMAMI_URL'] ||
    process.env.NEXT_PUBLIC_UMAMI_URL ||
    '';
  return raw.trim().replace(/\/+$/, '');
}

async function umamiFetch(path: string, init?: RequestInit) {
  const internalUrl = (
    process.env['UMAMI_INTERNAL_URL'] ||
    process.env.UMAMI_INTERNAL_URL ||
    'http://umami:3000'
  ).replace(/\/+$/, '');

  const res = await fetch(`${internalUrl}${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`umami ${path} -> HTTP ${res.status}${errorBody ? ` (${errorBody})` : ''}`);
  }
  return res.json();
}

export async function provisionWebsite(): Promise<string | null> {
  const adminUsername =
    process.env['UMAMI_ADMIN_USERNAME'] || process.env.UMAMI_ADMIN_USERNAME || 'admin';
  const adminPassword =
    process.env['UMAMI_ADMIN_PASSWORD'] || process.env.UMAMI_ADMIN_PASSWORD || 'umami';
  const siteName =
    process.env['UMAMI_SITE_NAME'] || process.env.UMAMI_SITE_NAME || 'LemonDBD';
  const rawDomain =
    process.env['UMAMI_SITE_DOMAIN'] || process.env.UMAMI_SITE_DOMAIN || 'localhost';
  const siteDomain = getSanitizedDomain(rawDomain);

  const login = await umamiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  const token = login?.token;
  if (!token) throw new Error('umami login returned no token');

  const authHeaders = { Authorization: `Bearer ${token}` };
  const listing = await umamiFetch('/api/websites?pageSize=100', { headers: authHeaders });
  const sites: UmamiWebsite[] = Array.isArray(listing) ? listing : listing?.data || [];
  const existing = sites.find(
    (s) =>
      (s.domain && getSanitizedDomain(s.domain) === siteDomain) ||
      (s.name && s.name.toLowerCase() === siteName.toLowerCase()),
  );
  if (existing?.id) return existing.id;

  const created = await umamiFetch('/api/websites', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: siteName, domain: siteDomain }),
  });

  // Umami v2 wraps responses in { data: { id: "..." } }, while older versions return { id: "..." }
  const websiteId =
    created?.data?.id ||
    created?.id ||
    (created?.website && created.website.id) ||
    null;
  return websiteId;
}

export async function getWebsiteId(): Promise<string | null> {
  if (cachedWebsiteId) return cachedWebsiteId;
  if (!inFlight) {
    inFlight = provisionWebsite()
      .then((id) => {
        if (id) {
          cachedWebsiteId = id;
        }
        return id;
      })
      .catch((err) => {
        // Best-effort: Umami might just not be up yet right after a reset.
        // Don't cache the failure -- the next request tries again.
        console.warn(
          '[umami-config] website provisioning notice:',
          err instanceof Error ? err.message : err,
        );
        return null;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Reset in-memory cache (for tests and clean restarts). */
export function _resetUmamiConfigCache(): void {
  cachedWebsiteId = null;
  inFlight = null;
}

export async function GET() {
  const publicUrl = getRuntimePublicUrl();
  if (!publicUrl) {
    // Tracking deliberately disabled (blank NEXT_PUBLIC_UMAMI_URL).
    return NextResponse.json(
      { websiteId: '', url: '' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const websiteId = (await getWebsiteId()) || '';
  return NextResponse.json(
    { websiteId, url: publicUrl },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
