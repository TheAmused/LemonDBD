'use client';
// frontend/src/components/sidebar/BugReportModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { useAltcha } from '@/hooks/useAltcha';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/locales/types';
import {
  Bug,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Send,
  UserCheck,
  Mail,
  Flame,
} from 'lucide-react';

export interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary | any;
  t?: Record<string, string>;
}

interface BugReportResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

const DEFAULT_BUG_CATEGORIES = [
  'Perks & Teachable Data',
  'Characters & Killer Powers',
  'Map Explorer & Callouts',
  'Perk Randomizer & Challenges',
  'Draft Room & SWF Planner',
  'UI, Design & Translations',
  'Other Gameplay Glitch',
] as const;

type BugCategoryKey = typeof DEFAULT_BUG_CATEGORIES[number];

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  dict: propDict,
  t: propT,
}) => {
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const pathname = usePathname() || '';

  const routeLocale = (params?.locale as string) || pathname.split('/')[1];
  const currentLocale = (
    i18n.locales.includes(routeLocale as Locale) ? routeLocale : i18n.defaultLocale
  ) as Locale;

  const [loadedDict, setLoadedDict] = useState<Dictionary | null>(null);

  useEffect(() => {
    if (!propDict && !propT) {
      getDictionary(currentLocale).then(setLoadedDict);
    }
  }, [currentLocale, propDict, propT]);

  const rawSidebarDict = (propDict?.sidebar || loadedDict?.sidebar || {}) as Record<string, string>;
  const t: Record<string, string> = propT || rawSidebarDict;

  const bugCategories: Array<{ key: BugCategoryKey; label: string }> = [
    { key: 'Perks & Teachable Data', label: t.bugCategoryPerks || '' },
    { key: 'Characters & Killer Powers', label: t.bugCategoryCharacters || '' },
    { key: 'Map Explorer & Callouts', label: t.bugCategoryMaps || '' },
    { key: 'Perk Randomizer & Challenges', label: t.bugCategoryChallenges || '' },
    { key: 'Draft Room & SWF Planner', label: t.bugCategoryDraftSwf || '' },
    { key: 'UI, Design & Translations', label: t.bugCategoryUiTranslations || '' },
    { key: 'Other Gameplay Glitch', label: t.bugCategoryOther || '' },
  ];

  const {
    altchaPayload,
    isVerifying: isAltchaVerifying,
    isVerified: isAltchaVerified,
    error: altchaError,
    refreshChallenge,
    honeypotValue,
    honeypotProps,
  } = useAltcha();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>(DEFAULT_BUG_CATEGORIES[0]);
  const [message, setMessage] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => {
        setIsRendered(false);
        setTitle('');
        setCategory(DEFAULT_BUG_CATEGORIES[0]);
        setMessage('');
        setGuestEmail('');
        setImages([]);
        setErrorMsg(null);
        setIsSuccess(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isRendered && !isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 3) {
      setErrorMsg(t.bugMaxScreenshots || '');
      return;
    }

    setErrorMsg(null);
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(t.bugImageSizeLimit || '');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg(t.bugTitlePlaceholder || '');
      return;
    }
    if (!message.trim()) {
      setErrorMsg(t.bugDescriptionPlaceholder || '');
      return;
    }
    if (!isAuthenticated && !guestEmail.trim()) {
      setErrorMsg(t.bugGuestEmailRequired || t.bugGuestEmailLabel || '');
      return;
    }

    setIsSubmitting(true);
    try {
      const backendBase = process.env.NEXT_PUBLIC_API_URL || '';
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('lemondbd_token')
          : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload = {
        title: title.trim(),
        category,
        message: message.trim(),
        reporter_name: user?.username || t.bugGuestPlayer || 'Guest',
        reporter_email: user?.email || guestEmail.trim(),
        images,
        website_trap: honeypotValue,
        altcha: altchaPayload,
      };

      const res = await fetch(`${backendBase}/api/v1/bug-reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      let data: BugReportResponse = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = (await res.json()) as BugReportResponse;
      } else {
        const textResp = await res.text();
        data = {
          error: `Status ${res.status}: ${textResp.slice(0, 100)}`,
        };
      }

      if (!res.ok) {
        setErrorMsg(data.error || t.bugErrorMessage || `Error (${res.status})`);
      } else {
        setIsSuccess(true);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t.bugErrorMessage || '';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bug-modal-title"
    >
      <div
        onClick={() => !isSubmitting && onClose()}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        aria-hidden="true"
      />

      <div className="fixed -top-24 -left-24 h-80 w-80 rounded-full bg-red-600/15 blur-[90px] pointer-events-none" aria-hidden="true" />
      <div className="fixed -bottom-24 -right-24 h-80 w-80 rounded-full bg-amber-600/15 blur-[90px] pointer-events-none" aria-hidden="true" />

      <div
        className="relative w-full max-w-xl my-8 rounded-3xl border border-rose-500/40 bg-slate-950/95 p-6 sm:p-8 text-slate-100 backdrop-blur-2xl z-10 space-y-6 overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80 pointer-events-none" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={t.bugCloseButton || ''}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/40" aria-hidden="true">
              <CheckCircle2 className="h-9 w-9 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black tracking-wide font-mono text-slate-100">
                {t.bugSuccessMessage || ''}
              </h3>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                {t.bugCloseButton || ''}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3.5 border-b border-rose-950/60 pb-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600/10 border border-rose-500/40 text-rose-500 shadow-md shadow-rose-950/50" aria-hidden="true">
                <Bug className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
              </div>
              <div>
                <h2
                  id="bug-modal-title"
                  className="text-lg font-black tracking-wider font-mono text-slate-100 flex items-center gap-2"
                >
                  <span>{t.bugReportModalTitle || ''}</span>
                  <Flame className="h-4 w-4 text-rose-500" aria-hidden="true" />
                </h2>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-300 shadow-sm" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400" aria-hidden="true">
                      <LemonIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">
                        {t.bugLoggedInAs ? `${t.bugLoggedInAs} ${user.username}` : user.username}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" aria-hidden="true" />
                    {t.verified || ''}
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                    {t.bugGuestEmailLabel || ''} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder={t.bugGuestEmailPlaceholder || ''}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all shadow-inner"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {t.bugTitleLabel || ''} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.bugTitlePlaceholder || ''}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {t.bugCategoryLabel || ''}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    aria-label={t.bugCategoryLabel || ''}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none transition-all cursor-pointer shadow-inner [&>option]:bg-slate-900"
                  >
                    {bugCategories.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {t.bugDescriptionLabel || ''}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.bugDescriptionPlaceholder || ''}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all shadow-inner resize-y"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                    {t.bugScreenshotsLabel || ''}
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {images.length}/3
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="relative h-16 w-16 rounded-xl border border-rose-500/40 bg-slate-900 overflow-hidden shadow-sm group"
                    >
                      <img
                        src={imgSrc}
                        alt={t.bugScreenshotAlt ? `${t.bugScreenshotAlt} #${idx + 1}` : `${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label={t.bugRemoveScreenshot ? `${t.bugRemoveScreenshot} ${idx + 1}` : `${idx + 1}`}
                        className="absolute inset-0 bg-red-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-300 transition-opacity focus:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}

                  {images.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-16 w-28 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 hover:bg-rose-950/20 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-all cursor-pointer text-[10px]"
                    >
                      <Upload className="h-4 w-4 mb-0.5" aria-hidden="true" />
                      <span>{t.bugUploadImage || ''}</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    aria-label={t.bugUploadImage || ''}
                  />
                </div>
              </div>

              {/* ALTCHA PoW Security & Honeypot Trap */}
              <AltchaWidget
                isVerifying={isAltchaVerifying}
                isVerified={isAltchaVerified}
                error={altchaError}
                onRetry={refreshChallenge}
                honeypotProps={honeypotProps}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rose-950/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t.bugCloseButton || ''}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-950/50 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                      <span>{t.bugSubmitting || ''}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.bugSubmitButton || ''}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};