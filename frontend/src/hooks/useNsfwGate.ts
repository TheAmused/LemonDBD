'use client';
// frontend/src/hooks/useNsfwGate.ts
import { useCallback, useEffect, useState } from 'react';
import { acknowledgeNsfwContent, hasAcknowledgedNsfwContent, useGlobalNsfwPreference, type NsfwContentScope } from '@/utils/nsfwAck';

/**
 * Whether a tier list or minigame still has to be confirmed before it is shown.
 *
 * `flagged` is the content's own NSFW flag. The stored confirmation is read after mount (it lives in
 * localStorage), so until then a flagged item counts as not yet confirmed -- the gate never flashes
 * the content first. Unflagged content is never gated. If the global NSFW preference is enabled,
 * the gate is automatically bypassed.
 */
export function useNsfwGate(scope: NsfwContentScope, id: string, flagged: boolean) {
  const [globalNsfw, setGlobalNsfw] = useGlobalNsfwPreference();
  const [confirmed, setConfirmed] = useState<boolean>(false);

  useEffect(() => {
    setConfirmed(flagged ? (globalNsfw || hasAcknowledgedNsfwContent(scope, id)) : false);
  }, [scope, id, flagged, globalNsfw]);

  const confirm = useCallback(() => {
    acknowledgeNsfwContent(scope, id);
    setGlobalNsfw(true);
    setConfirmed(true);
  }, [scope, id, setGlobalNsfw]);

  return { gated: flagged && !globalNsfw && !confirmed, confirm };
}
