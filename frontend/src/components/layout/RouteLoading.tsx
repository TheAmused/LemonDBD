// frontend/src/components/layout/RouteLoading.tsx
//
// The frame for a route's loading.tsx spinner. It renders CONTENT ONLY, inside the <main> that
// AppShell keeps mounted: the sidebar never goes away while a page loads. `fullScreen` is for the
// few routes with no shell (shellRoutes.ts: `shell: false`), which own the whole viewport.
import type { ReactNode } from 'react';

interface RouteLoadingProps {
  children: ReactNode;
  fullScreen?: boolean;
  className?: string;
}

export function RouteLoading({ children, fullScreen = false, className = '' }: RouteLoadingProps) {
  const height = fullScreen ? 'min-h-screen' : 'min-h-skeleton-page';
  return <div className={`flex w-full flex-1 items-center justify-center ${height} ${className}`.trim()}>{children}</div>;
}
