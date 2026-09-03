// frontend/src/components/UmamiScript.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface UmamiConfig {
  websiteId: string;
  url: string;
}

/**
 * Injects the Umami tracking script once a website ID is available.
 *
 * Fetches /api/umami-config on mount (no-store) instead of reading
 * NEXT_PUBLIC_UMAMI_WEBSITE_ID at build time -- that route self-provisions
 * the website on first request, so this picks up a freshly (re)provisioned
 * ID immediately after a reset without rebuilding or restarting this
 * container. See that route for details.
 */
export function UmamiScript() {
  const [config, setConfig] = useState<UmamiConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/umami-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UmamiConfig | null) => {
        if (!cancelled && data?.websiteId && data?.url) setConfig(data);
      })
      .catch(() => {
        // Analytics is best-effort -- never block or break the page over it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!config) return null;

  const scriptSrc = `${config.url.replace(/\/+$/, '')}/script.js`;

  return (
    <Script
      strategy="afterInteractive"
      src={scriptSrc}
      data-website-id={config.websiteId}
    />
  );
}
