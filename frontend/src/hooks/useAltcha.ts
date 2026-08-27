'use client';
// frontend/src/hooks/useAltcha.ts

import { useState, useEffect, useCallback, useRef } from 'react';

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
    };
  }

  return null;
}

export function useAltcha(autoSolve: boolean = true) {
  const [challenge, setChallenge] = useState<AltchaChallenge | null>(null);
  const [altchaPayload, setAltchaPayload] = useState<AltchaPayload | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypotValue, setHoneypotValue] = useState<string>('');

  const fetchingRef = useRef<boolean>(false);
  const solvingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchChallenge = useCallback(async (signal?: AbortSignal): Promise<AltchaChallenge | null> => {
    if (fetchingRef.current) return null;
    fetchingRef.current = true;

    try {
      setError(null);
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
      const url = `${apiBase}/api/v1/auth/altcha-challenge`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error('Failed to fetch security challenge');
      const data: AltchaChallenge = await res.json();
      setChallenge(data);
      return data;
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') {
        return null;
      }
      const msg = err?.message || 'Challenge fetch failed';
      setError(msg);
      return null;
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const solveChallenge = useCallback(async (ch: AltchaChallenge, signal?: AbortSignal) => {
    if (solvingRef.current) return;
    solvingRef.current = true;
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
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') return;
      setError(err?.message || 'Verification error');
    } finally {
      setIsVerifying(false);
      solvingRef.current = false;
    }
  }, []);

  const refreshChallenge = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsVerified(false);
    setAltchaPayload(null);
    setChallenge(null);

    const ch = await fetchChallenge(controller.signal);
    if (ch && !controller.signal.aborted) {
      await solveChallenge(ch, controller.signal);
    }
  }, [fetchChallenge, solveChallenge]);

  useEffect(() => {
    if (autoSolve && !challenge && !isVerifying && !isVerified) {
      refreshChallenge();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoSolve, challenge, isVerifying, isVerified, refreshChallenge]);

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
