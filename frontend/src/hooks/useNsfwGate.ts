'use client';
// frontend/src/hooks/useNsfwGate.ts
import { useCallback, useEffect, useState } from 'react';
import { acknowledgeNsfwContent, hasAcknowledgedNsfwContent, type NsfwContentScope } from '@/utils/nsfwAck';

/**
 * Whether a tier list or minigame still has to be confirmed before it is shown.
 *
 * `flagged` is the content's own NSFW flag. The stored confirmation is read after mount (it lives in
 * localStorage), so until then a flagged item counts as not yet confirmed -- the gate never flashes
 * the content first. Unflagged content is never gated.
 */
export function useNsfwGate(scope: NsfwContentScope, id: string, flagged: boolean) {
  const [confirmed, setConfirmed] = useState<boolean>(false);

  useEffect(() => {
    setConfirmed(flagged ? hasAcknowledgedNsfwContent(scope, id) : false);
  }, [scope, id, flagged]);

  const confirm = useCallback(() => {
    acknowledgeNsfwContent(scope, id);
    setConfirmed(true);
  }, [scope, id]);

  return { gated: flagged && !confirmed, confirm };
}
