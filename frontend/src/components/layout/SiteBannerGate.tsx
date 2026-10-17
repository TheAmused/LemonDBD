'use client';
// frontend/src/components/layout/SiteBannerGate.tsx
//
// Mounts the notice banner only while an admin has one switched on. The banner (and the icons and
// button it draws with) is its own chunk, fetched on demand, so the page shell every visitor loads
// does not carry it.
import dynamic from 'next/dynamic';
import { useSiteConfig } from '@/context/SiteConfigContext';

const SiteBanner = dynamic(() => import('@/components/layout/SiteBanner').then((module) => module.SiteBanner), { ssr: false });

export function SiteBannerGate() {
  const { banner } = useSiteConfig();
  return banner.active ? <SiteBanner /> : null;
}
