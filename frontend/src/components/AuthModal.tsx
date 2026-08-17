'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from './LemonIcon';
import { X, Lock, Mail, User as UserIcon, LogIn, UserPlus, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginMode) {
        const res = await login(username, password);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || 'Invalid credentials');
        }
      } else {
        const res = await register(username, email, password);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || 'Registration failed');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (role: 'admin' | 'player') => {
    setIsLoginMode(true);
    if (role === 'admin') {
      setUsername('lemon');
      setPassword('lemon');
    } else {
      setUsername('user');
      setPassword('user');
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 text-slate-100 shadow-2xl shadow-red-950/40 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          aria-label="Close auth dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-red-900/40 to-slate-950 p-2.5 border border-amber-500/30 shadow-lg shadow-amber-900/20">
            <LemonIcon className="h-9 w-9 animate-pulse" />
          </div>
          <h2 className="text-xl font-black tracking-wider text-slate-100 font-mono">
            {isLoginMode ? 'Sign In to LemonDBD' : 'Create LemonDBD Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isLoginMode
              ? 'Access your owned characters, perk unlocks, and personal builds.'
              : 'Join the community to track streaks, teachables, and game stats.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Username or Email
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@domain.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-red-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-900/30 hover:from-amber-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isLoginMode ? (
              <>
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 text-center tracking-wider">
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('admin')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-950/20 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-900/30 transition-colors"
            >
              <ShieldAlert className="h-3 w-3 text-red-400" />
              <span>Admin (lemon)</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('player')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-900/30 transition-colors"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>User (user)</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            {isLoginMode ? (
              <>Don&apos;t have an account? <span className="font-bold text-amber-400 underline">Register</span></>
            ) : (
              <>Already have an account? <span className="font-bold text-amber-400 underline">Sign In</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
