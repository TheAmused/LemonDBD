'use client';
// frontend/src/components/layout/MaintenanceWatcher.tsx
//
// Mounts the poller that moves an already-open tab to the maintenance page. The poller is its own chunk,
// fetched after the page is up (like the notice banner), so the shell every visitor loads does not carry it.
import dynamic from 'next/dynamic';

const MaintenancePoller = dynamic(() => import('@/components/layout/MaintenancePoller').then((module) => module.MaintenancePoller), { ssr: false });

export function MaintenanceWatcher() {
  return <MaintenancePoller />;
}
