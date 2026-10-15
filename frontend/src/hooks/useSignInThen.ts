'use client';
// frontend/src/hooks/useSignInThen.ts
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Gates an action behind sign-in without losing it: signed in, `run` does it straight away;
 * signed out, it opens the sign-in window and does it once the viewer is in. Closing the window
 * without signing in drops the action, so a later login elsewhere never triggers a stale one.
 */
export function useSignInThen() {
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const run = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
        return;
      }
      setPending(() => action);
      setIsAuthModalOpen(true);
    },
    [isAuthenticated]
  );

  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  useEffect(() => {
    if (isAuthModalOpen || !pending) return;
    setPending(null);
    if (isAuthenticated) pending();
  }, [isAuthModalOpen, pending, isAuthenticated]);

  return { run, isAuthModalOpen, closeAuthModal };
}
