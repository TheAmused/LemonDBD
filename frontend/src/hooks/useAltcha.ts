'use client';
// frontend/src/hooks/useAltcha.ts

import { getErrorMessage, isAbortError } from '@/utils/api';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useOnValueChange } from '@/hooks/useOnValueChange';

export interface AltchaChallenge {
  algorithm: string;
  challenge: string;
  salt: string;
  maxnumber: number;
  signature: string;
  expires: number;
}

export interface AltchaPayload {
  algorithm: string;
  challenge: string;
  number: number;
  salt: string;
  signature: string;
  expires: number;
  maxnumber: number;
}

export async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(str).digest('hex');
}

export async function solveAltchaPoW(
  challenge: AltchaChallenge,
  batchSize: number = 2500,
  signal?: AbortSignal
): Promise<AltchaPayload | null> {
  const max = challenge.maxnumber || 50000;
  let solutionNumber: number | null = null;

  for (let start = 0; start <= max; start += batchSize) {
    if (signal?.aborted) return null;
    const end = Math.min(start + batchSize - 1, max);
    for (let num = start; num <= end; num++) {
      const hash = await sha256Hex(`${challenge.salt}${num}`);
      if (hash === challenge.challenge) {
        solutionNumber = num;
        break;
      }
    }
    if (solutionNumber !== null || signal?.aborted) break;
    // Yield execution briefly to guarantee zero UI stutter
    await new Promise((r) => setTimeout(r, 0));
  }

  if (signal?.aborted) return null;

  if (solutionNumber !== null) {
    return {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      number: solutionNumber,
      salt: challenge.salt,
      signature: challenge.signature,
      expires: challenge.expires,
      maxnumber: challenge.maxnumber,
    };
  }

  return null;
}

export function useAltcha(autoSolve: boolean = true) {
  const [altchaPayload, setAltchaPayload] = useState<AltchaPayload | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypotValue, setHoneypotValue] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // A promise chain rather than async/await: its state updates then run in callbacks only.
  const fetchChallenge = useCallback(
    (signal?: AbortSignal): Promise<AltchaChallenge | null> =>
      fetch(`${getBackendBaseUrl()}/api/v1/auth/altcha-challenge`, { signal })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch security challenge');
          return res.json() as Promise<AltchaChallenge>;
        })
        .then((data) => (signal?.aborted ? null : data))
        .catch((err: unknown) => {
          if (signal?.aborted || isAbortError(err)) return null;
          setError(getErrorMessage(err, 'Challenge fetch failed'));
          return null;
        }),
    []
  );

  const solveChallenge = useCallback(async (ch: AltchaChallenge, signal?: AbortSignal) => {
    if (signal?.aborted) return;
    setIsVerifying(true);
    setError(null);

    try {
      const payload = await solveAltchaPoW(ch, 2500, signal);
      if (signal?.aborted) return;
      if (payload !== null) {
        setAltchaPayload(payload);
        setIsVerified(true);
      } else {
        setError('Verification computation incomplete');
      }
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      setError(getErrorMessage(err, 'Verification error'));
    } finally {
      if (!signal?.aborted) {
        setIsVerifying(false);
      }
    }
  }, []);

  /** Fetches and solves a fresh challenge under `controller`, replacing any run still in flight. */
  const startChallenge = useCallback(() => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return fetchChallenge(controller.signal).then((ch) =>
      ch && !controller.signal.aborted ? solveChallenge(ch, controller.signal) : undefined
    );
  }, [fetchChallenge, solveChallenge]);

  const refreshChallenge = useCallback(async () => {
    setIsVerified(false);
    setAltchaPayload(null);
    setError(null);
    await startChallenge();
  }, [startChallenge]);

  // Switching auto-solve off drops the solution; switching it on starts from a clean slate.
  useOnValueChange(autoSolve, () => {
    setIsVerifying(false);
    setIsVerified(false);
    setAltchaPayload(null);
    setError(null);
  });

  useEffect(() => {
    if (autoSolve) {
      void startChallenge();
    } else if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [autoSolve, startChallenge]);

  return {
    altchaPayload,
    isVerifying,
    isVerified,
    error,
    refreshChallenge,
    honeypotValue,
    setHoneypotValue,
    honeypotProps: {
      name: 'website_trap',
      value: honeypotValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setHoneypotValue(e.target.value),
      tabIndex: -1,
      autoComplete: 'off',
      style: {
        position: 'absolute',
        opacity: 0,
        height: 0,
        width: 0,
        zIndex: -1,
        pointerEvents: 'none',
      } as React.CSSProperties,
    },
  };
}
