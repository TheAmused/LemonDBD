'use client';
// frontend/src/components/common/ContentRevocationSync.tsx
import { useContentRevocationSync } from '@/hooks/useContentRevocationSync';

/**
 * Headless client component that mounts the content revocation sync hook.
 * Mounted in root layout alongside other headless sync/provider components.
 */
export function ContentRevocationSync(): null {
  useContentRevocationSync();
  return null;
}
