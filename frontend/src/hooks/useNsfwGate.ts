'use client';
// frontend/src/hooks/useNsfwGate.ts
import { useCallback, useEffect, useState } from 'react';
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
  const [authored, setAuthored] = useState<boolean>(false);

  useEffect(() => {
    setAuthored(flagged ? hasAcknowledgedNsfwContent(scope, id) : false);
  }, [scope, id, flagged]);

  const confirm = useCallback(() => setGlobalNsfw(true), [setGlobalNsfw]);

  return { gated: flagged && !globalNsfw && !authored, confirm };
}
