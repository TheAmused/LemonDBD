'use client';
// frontend/src/components/sidebar/BugReportModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { getBackendBaseUrl, authHeaders, getAuthToken } from '@/utils/api';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { useAltcha } from '@/hooks/useAltcha';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/locales/types';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  UserCheck,
  Mail,
} from 'lucide-react';
import { FogReportIcon } from '@/components/icons/DbdIcons';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input, Select, Textarea } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";

export interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, t: propT }) => {
  const propDict = useDictionary();
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

  const rawSidebarDict = (propDict.sidebar || loadedDict?.sidebar || {}) as Record<string, string>;
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

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
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
      const backendBase = getBackendBaseUrl();
      const headers: Record<string, string> = authHeaders(getAuthToken(), { json: true });

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      size="xl"
      icon={isSuccess ? undefined : <FogReportIcon className="h-6 w-6" />}
      title={isSuccess ? undefined : t.bugReportModalTitle || ''}
      ariaLabel={t.bugReportModalTitle || 'Bug report'}
      closeButtonAriaLabel={t.bugCloseButton || ''}
      busy={isSubmitting}
      padded
      bodyClassName="space-y-5"
      footerClassName="justify-end"
      footer={
        isSuccess ? undefined : (
          <Button
            type="submit"
            form="bug-report-form"
            variant="primary"
            loading={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? <span>{t.bugSubmitting || ''}</span> : <span>{t.bugSubmitButton || ''}</span>}
          </Button>
        )
      }
    >
      {isSuccess ? (
    <div className="text-center py-8 space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-green/10 border border-accent-green/30 text-accent-green shadow-lg" aria-hidden="true">
        <CheckCircle2 className="h-9 w-9 animate-bounce" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xl font-black tracking-wide text-text-primary">
          {t.bugSuccessMessage || ''}
        </h3>
      </div>
    </div>
      ) : (
        <>
    {errorMsg && (
      <div className="flex items-center gap-2.5 rounded-xl border border-accent-red/40 bg-accent-red/10 p-3 text-xs text-accent-red shadow-sm" role="alert">
        <AlertCircle className="h-4 w-4 shrink-0 text-accent-red" aria-hidden="true" />
        <span>{errorMsg}</span>
      </div>
    )}

    <form id="bug-report-form" onSubmit={handleSubmit} className="space-y-4">
      {isAuthenticated && user ? (
        <div className="flex items-center justify-between rounded-xl border border-border-color bg-bg-elevated/60 p-3 text-xs">
          <div className="flex items-center gap-2.5 text-text-secondary">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-elevated border border-border-color text-text-secondary" aria-hidden="true">
              <LemonIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-text-primary">
                {t.bugLoggedInAs ? `${t.bugLoggedInAs} ${user.username}` : user.username}
              </p>
              <p className="type-micro text-text-muted">
                {user.email}
              </p>
            </div>
          </div>
          <span className="rounded-md bg-accent-green/10 px-2 py-0.5 type-strong-2xs text-accent-green border border-accent-green/20 flex items-center gap-1">
            <UserCheck className="h-3 w-3" aria-hidden="true" />
            {t.verified || ''}
          </span>
        </div>
      ) : (
        <div>
          <label className="block type-label-xs text-text-muted mb-1 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            {t.bugGuestEmailLabel || ''} <span className="text-accent-red">*</span>
          </label>
          <Input
            type="email"
            required
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder={t.bugGuestEmailPlaceholder || ''}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block type-label-xs text-text-muted mb-1">
            {t.bugTitleLabel || ''} <span className="text-accent-red">*</span>
          </label>
          <Input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.bugTitlePlaceholder || ''}
          />
        </div>

        <div>
          <label className="block type-label-xs text-text-muted mb-1">
            {t.bugCategoryLabel || ''}
          </label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t.bugCategoryLabel || ''}
            className="[&>option]:bg-bg-surface"
          >
            {bugCategories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block type-label-xs text-text-muted mb-1">
          {t.bugDescriptionLabel || ''}{' '}
          <span className="text-accent-red">*</span>
        </label>
        <Textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.bugDescriptionPlaceholder || ''}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="type-label-xs text-text-muted flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            {t.bugScreenshotsLabel || ''}
          </label>
          <span className="type-micro text-text-muted">
            {images.length}/3
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {images.map((imgSrc, idx) => (
            <div
              key={idx}
              className="relative h-16 w-16 rounded-xl border border-border-color bg-bg-elevated overflow-hidden shadow-sm group"
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
                className="absolute inset-0 bg-accent-red/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-text-inverted transition-opacity focus:opacity-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}

          {images.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-28 flex-col items-center justify-center rounded-xl border border-dashed border-border-color bg-bg-elevated/50 hover:bg-accent-red/10 hover:border-accent-red/50 text-text-muted hover:text-accent-red transition-all cursor-pointer type-micro"
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
        </form>
        </>
      )}
    </Modal>
  );
};
