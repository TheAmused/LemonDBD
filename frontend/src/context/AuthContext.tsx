'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
}

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
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateCharacterOwnership: (characterId: number, isOwned: boolean) => Promise<boolean>;
  bulkUpdateCharacterOwnership: (updates: Array<{ character_id: number; is_owned: boolean }>) => Promise<boolean>;
  updatePerkOwnership: (perkId: number, isUnlocked: boolean) => Promise<boolean>;
  bulkUpdatePerkOwnership: (updates: Array<{ perk_id: number; is_unlocked: boolean }>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<OwnershipSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (data.ownership) {
            setOwnership(data.ownership);
          }
          return;
        }
      }
      // If token expired or invalid
      setUser(null);
      setToken(null);
      localStorage.removeItem('lemondbd_token');
    } catch (err) {
      console.error('Failed to fetch auth state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      setToken(data.token);
      setUser(data.user);
      if (data.ownership) setOwnership(data.ownership);
      localStorage.setItem('lemondbd_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error occurred.' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setToken(data.token);
      setUser(data.user);
      if (data.ownership) setOwnership(data.ownership);
      localStorage.setItem('lemondbd_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error occurred.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setOwnership(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lemondbd_token');
    }
    fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST' }).catch(() => {});
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const updateCharacterOwnership = async (characterId: number, isOwned: boolean): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ character_id: characterId, is_owned: isOwned }),
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update character ownership:', err);
      return false;
    }
  };

  const bulkUpdateCharacterOwnership = async (
    updates: Array<{ character_id: number; is_owned: boolean }>
  ): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/characters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
          Authorization: `Bearer ${token}`,
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
          Authorization: `Bearer ${token}`,
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isLoading,
        ownership,
        login,
        register,
        logout,
        refreshUser,
        updateCharacterOwnership,
        bulkUpdateCharacterOwnership,
        updatePerkOwnership,
        bulkUpdatePerkOwnership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
