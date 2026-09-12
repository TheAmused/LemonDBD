'use client';
// frontend/src/components/streaks/useChallengeCompletionStatus.ts

import { useEffect, useState } from 'react';
import { fetchCompletionStatus } from '@/services/challengeCompletionsApi';
import { ChallengeCompletionStatus } from '@/types/challengeCompletionStatus';
import { useAuth } from '@/context/AuthContext';

/** Every mode+variant the current user has ever fully completed. Feeds the
 *  "already won" trophy badges on challenge cards and difficulty tiles. */
export function useChallengeCompletionStatus(): ChallengeCompletionStatus {
  const { token } = useAuth();
  const [status, setStatus] = useState<ChallengeCompletionStatus>({ completions: {}, active_runs: {} });

  useEffect(() => {
    if (!token) return;
    fetchCompletionStatus(token)
      .then(setStatus)
      .catch((err) => console.error('Failed to load challenge completion status:', err));
  }, [token]);

  return status;
}
