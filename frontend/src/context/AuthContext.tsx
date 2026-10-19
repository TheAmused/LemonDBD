// frontend/src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

export interface UserProfile {
  id: number;
  login: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  two_factor_enabled?: boolean;
  has_password?: boolean;
  google_linked?: boolean;
  created_at?: string;
  onboarding_completed_at?: string | null;
  preferred_language?: string | null;
}

type SignInResult = {
  success: boolean;
  error?: string;
  user?: UserProfile;
  twoFactorToken?: string;
  /** Set when the account is banned or suspended: the sign-in must show why instead of an error. */
  blocked?: BlockedInfo;
};

export interface OwnershipSummary {
  survivors: {
    owned: number;
    total: number;
    percentage: number;
  };
  killers: {
    owned: number;
    total: number;
    percentage: number;
  };
  perks: {
    unlocked: number;
    total: number;
    percentage: number;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  ownership: OwnershipSummary | null;
  /** Warnings the account holder has not acknowledged yet (the app shows them one by one). */
  warnings: UserWarning[];
  acknowledgeWarning: (sanctionId: number) => Promise<void>;
  /** `twoFactorToken` is set instead of `success` when the account needs a second step (see completeTwoFactorLogin). */
  login: (loginOrEmail: string, password: string, extra?: Record<string, unknown>) => Promise<SignInResult>;
  loginWithGoogle: (credential: string) => Promise<SignInResult>;
  completeTwoFactorLogin: (twoFactorToken: string, code: string) => Promise<SignInResult & { errorCode?: string }>;
  register: (login: string, username: string, email: string, password: string, extra?: Record<string, unknown>) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  logout: () => void;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  forgotPassword: (email: string, extra?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (token: string, newPassword: string, extra?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;

  bulkUpdateCharacterOwnership: (updates: CharacterOwnershipUpdate[]) => Promise<boolean>;
  updatePerkOwnership: (perkId: number, isUnlocked: boolean) => Promise<boolean>;
  bulkUpdatePerkOwnership: (updates: Array<{ perk_id: number; is_unlocked: boolean }>) => Promise<boolean>;
  markOnboardingComplete: () => Promise<boolean>;
  setPreferredLanguage: (language: string) => Promise<boolean>;
}

import { getBackendBaseUrl } from '@/utils/perkUtils';
import type { CharacterOwnershipUpdate } from '@/utils/characterUtils';
import { SESSION_MARKER, authHeaders, setSessionFlag, getErrorMessage, isAbortError } from '@/utils/api';
import { trackEvent } from '@/utils/analytics';
import { invalidate } from '@/services/dataCache';
import { blockedFromResponse, warningsFromResponse } from '@/utils/moderationResponse';
import { acknowledgeWarning as acknowledgeWarningRequest } from '@/services/moderationApi';
import type { BlockedInfo, UserWarning } from '@/types/moderation';
import { resetSmashGuestStateOnLogout } from '@/utils/smashOrPass/guestSession';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = getBackendBaseUrl();

/** Cached perk lists and admin drafts are per identity: drop them on every sign-in and sign-out. */
const onIdentityChanged = (): void => invalidate();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<OwnershipSummary | null>(null);
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setToken(SESSION_MARKER);
          setSessionFlag(true);
          setUser(data.user);
          setWarnings(warningsFromResponse(data));
          if (data.ownership) {
            setOwnership(data.ownership);
          }
          return;
        }
      }
      // No (or an expired) session cookie
      setUser(null);
      setToken(null);
      setWarnings([]);
      setSessionFlag(false);
    } catch (err) {
      console.error('Failed to fetch auth state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The session cookie is HttpOnly, so ask the server who we are.
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (loginOrEmail: string, password: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_or_email: loginOrEmail, password, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        const blocked = blockedFromResponse(res.status, data);
        return blocked ? { success: false, blocked } : { success: false, error: data.error || 'Login failed' };
      }
      if (data.status === 'two_factor_required' && data.two_factor_token) {
        // Password accepted but there is no session yet: the caller asks for the authenticator code.
        return { success: false, twoFactorToken: data.two_factor_token as string };
      }
      setToken(SESSION_MARKER);
      setSessionFlag(true);
      setUser(data.user);
      setWarnings(warningsFromResponse(data));
      if (data.ownership) setOwnership(data.ownership);
      onIdentityChanged();
      trackEvent('login', { method: 'password' });
      return { success: true, user: data.user as UserProfile };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        const blocked = blockedFromResponse(res.status, data);
        return blocked ? { success: false, blocked } : { success: false, error: data.error as string | undefined };
      }
      if (data.status === 'two_factor_required' && data.two_factor_token) {
        return { success: false, twoFactorToken: data.two_factor_token as string };
      }
      setToken(SESSION_MARKER);
      setSessionFlag(true);
      setUser(data.user);
      setWarnings(warningsFromResponse(data));
      if (data.ownership) setOwnership(data.ownership);
      onIdentityChanged();
      // The API has no "new account" flag; a user without a finished onboarding is the one
      // the app sends to /welcome, so that is what counts as a signup.
      if (data.user?.onboarding_completed_at) trackEvent('login', { method: 'google' });
      else trackEvent('signup', { method: 'google' });
      return { success: true, user: data.user as UserProfile };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const completeTwoFactorLogin = async (twoFactorToken: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login/two-factor`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ two_factor_token: twoFactorToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const blocked = blockedFromResponse(res.status, data);
        if (blocked) return { success: false, blocked };
        return { success: false, error: data.error as string | undefined, errorCode: data.error_code as string | undefined };
      }
      setToken(SESSION_MARKER);
      setSessionFlag(true);
      setUser(data.user);
      setWarnings(warningsFromResponse(data));
      if (data.ownership) setOwnership(data.ownership);
      onIdentityChanged();
      trackEvent('login', { method: 'two_factor' });
      return { success: true, user: data.user as UserProfile };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const register = async (login: string, username: string, email: string, password: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, username, email, password, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setToken(SESSION_MARKER);
      setSessionFlag(true);
      setUser(data.user);
      if (data.ownership) setOwnership(data.ownership);
      onIdentityChanged();
      trackEvent('signup', { method: 'password' });
      return { success: true, user: data.user as UserProfile };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to resend verification email.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Invalid verification code.' };
      }
      trackEvent('email_verified');
      return { success: true, user: data.user as UserProfile };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const forgotPassword = async (email: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to request password reset.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const resetPassword = async (token: string, newPassword: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reset password.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err, 'Network error occurred.') };
    }
  };

  const logout = () => {
    // Clears the HttpOnly cookie server-side (JavaScript cannot delete it).
    const cleared = fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    // After the cookie is gone, so the refetch is anonymous.
    cleared.finally(onIdentityChanged);
    setUser(null);
    setToken(null);
    setOwnership(null);
    setWarnings([]);
    if (typeof window !== 'undefined') {
      setSessionFlag(false);
      // The next person on this browser must not inherit this account's
      // smash-or-pass session or its cached vote history.
      resetSmashGuestStateOnLogout();
      const path = window.location.pathname;
      const localeMatch = path.match(/^\/([a-z]{2})/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      if (path.includes('/admin') || path.includes('/user')) {
        cleared.finally(() => {
          window.location.href = `/${locale}`;
        });
        return;
      }
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const acknowledgeWarning = async (sanctionId: number) => {
    // Gone from the screen at once; if the request fails the warning simply shows again next visit.
    setWarnings((current) => current.filter((w) => w.id !== sanctionId));
    try {
      await acknowledgeWarningRequest(sanctionId);
    } catch (err) {
      console.error('Failed to acknowledge the warning:', err);
    }
  };


  const bulkUpdateCharacterOwnership = async (
    updates: CharacterOwnershipUpdate[]
  ): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/characters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to bulk update character ownership:', err);
      return false;
    }
  };

  const updatePerkOwnership = async (perkId: number, isUnlocked: boolean): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/perks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({ perk_id: perkId, is_unlocked: isUnlocked }),
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update perk ownership:', err);
      return false;
    }
  };

  const bulkUpdatePerkOwnership = async (
    updates: Array<{ perk_id: number; is_unlocked: boolean }>
  ): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/perks/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to bulk update perk ownership:', err);
      return false;
    }
  };

  const markOnboardingComplete = async (): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/onboarding/complete`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
      return false;
    }
  };

  const setPreferredLanguage = async (language: string): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/language`, {
        method: 'POST',
        headers: authHeaders(token, { json: true }),
        body: JSON.stringify({ language }),
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to set preferred language:', err);
      return false;
    }
  };

  // The handlers above are redefined on every render. Passing them straight
  // into the provider value meant a brand-new object each time, so every
  // `useAuth()` consumer in the tree -- the sidebar, every page -- re-rendered
  // whenever anything in this provider changed. Route them through a ref so the
  // exposed functions keep a stable identity while still calling the freshest
  // closure (no stale `token`/`user` captures), and memoise the value on the
  // auth state that consumers actually care about.
  const handlersRef = useRef({
    login,
    loginWithGoogle,
    completeTwoFactorLogin,
    register,
    logout,
    resendVerification,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshUser,
    acknowledgeWarning,
    bulkUpdateCharacterOwnership,
    updatePerkOwnership,
    bulkUpdatePerkOwnership,
    markOnboardingComplete,
    setPreferredLanguage,
  });
  handlersRef.current = {
    login,
    loginWithGoogle,
    completeTwoFactorLogin,
    register,
    logout,
    resendVerification,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshUser,
    acknowledgeWarning,
    bulkUpdateCharacterOwnership,
    updatePerkOwnership,
    bulkUpdatePerkOwnership,
    markOnboardingComplete,
    setPreferredLanguage,
  };

  const actions = useMemo(
    () => ({
      login: (loginOrEmail: string, password: string, extra?: Record<string, unknown>) =>
        handlersRef.current.login(loginOrEmail, password, extra),
      loginWithGoogle: (credential: string) => handlersRef.current.loginWithGoogle(credential),
      completeTwoFactorLogin: (twoFactorToken: string, code: string) =>
        handlersRef.current.completeTwoFactorLogin(twoFactorToken, code),
      register: (login: string, username: string, email: string, password: string, extra?: Record<string, unknown>) =>
        handlersRef.current.register(login, username, email, password, extra),
      logout: () => handlersRef.current.logout(),
      resendVerification: (email: string) => handlersRef.current.resendVerification(email),
      verifyEmail: (email: string, code: string) => handlersRef.current.verifyEmail(email, code),
      forgotPassword: (email: string, extra?: Record<string, unknown>) =>
        handlersRef.current.forgotPassword(email, extra),
      resetPassword: (token: string, newPassword: string, extra?: Record<string, unknown>) =>
        handlersRef.current.resetPassword(token, newPassword, extra),
      refreshUser: () => handlersRef.current.refreshUser(),
      acknowledgeWarning: (sanctionId: number) => handlersRef.current.acknowledgeWarning(sanctionId),

      bulkUpdateCharacterOwnership: (updates: CharacterOwnershipUpdate[]) =>
        handlersRef.current.bulkUpdateCharacterOwnership(updates),
      updatePerkOwnership: (perkId: number, isUnlocked: boolean) =>
        handlersRef.current.updatePerkOwnership(perkId, isUnlocked),
      bulkUpdatePerkOwnership: (updates: Array<{ perk_id: number; is_unlocked: boolean }>) =>
        handlersRef.current.bulkUpdatePerkOwnership(updates),
      markOnboardingComplete: () => handlersRef.current.markOnboardingComplete(),
      setPreferredLanguage: (language: string) => handlersRef.current.setPreferredLanguage(language),
    }),
    []
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isLoading,
      ownership,
      warnings,
      ...actions,
    }),
    [user, token, isLoading, ownership, warnings, actions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
