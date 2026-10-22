'use client';
// frontend/src/hooks/useNsfwGate.ts
import { useCallback } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { hasAcknowledgedNsfwContent, useGlobalNsfwPreference, type NsfwContentScope } from '@/utils/nsfwAck';

/**
 * Whether a flagged tier list or minigame still has to be confirmed before it is shown.
 *
 * The global NSFW switch is the single source of truth: on, nothing is gated; off, every flagged
 * item is -- except one this browser's user authored (they are never asked about their own). The
 * gate's "Click to view" turns the switch on, so the hubs' switch always tells the truth; turning it
 * back off gates everything again. Read after mount (localStorage), so the content never flashes.
 */
export function useNsfwGate(scope: NsfwContentScope, id: string, flagged: boolean) {
  const [globalNsfw, setGlobalNsfw] = useGlobalNsfwPreference();
  // localStorage is only read in the browser, after hydration, so server and client markup agree.
  const isClient = useIsClient();
  const authored = isClient && flagged && hasAcknowledgedNsfwContent(scope, id);

  const confirm = useCallback(() => setGlobalNsfw(true), [setGlobalNsfw]);

  return { gated: flagged && !globalNsfw && !authored, confirm };
}
