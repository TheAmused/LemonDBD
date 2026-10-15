'use client';
// frontend/src/components/sidebar/BugReportModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { getBackendBaseUrl, authHeaders, getAuthToken } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { useAltcha } from '@/hooks/useAltcha';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import {
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  UserCheck,
  Mail,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { SuccessState } from '@/components/common/SuccessState';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';

export interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BugReportResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const dict = useDictionary();
  const { user, isAuthenticated } = useAuth();

  const t: Record<string, string> = dict.sidebar;

  const {
    altchaPayload,
    isVerifying: isAltchaVerifying,
    isVerified: isAltchaVerified,
    error: altchaError,
    refreshChallenge,
    honeypotValue,
    honeypotProps,
  } = useAltcha(!isAuthenticated && isOpen);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState<string>('');
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
      // A solved ALTCHA challenge works once; guests need a fresh one for the next report.
      if (!isAuthenticated) void refreshChallenge();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      size={isSuccess ? 'sm' : 'xl'}
      title={isSuccess ? undefined : t.bugReportModalTitle || ''}
      ariaLabel={(isSuccess ? t.bugSuccessMessage : t.bugReportModalTitle) || 'Bug report'}
      closeButton={isSuccess ? 'floating' : 'header'}
      closeButtonAriaLabel={t.bugCloseButton || ''}
      busy={isSubmitting}
      padded
      bodyClassName="space-y-5"
      footerClassName="justify-center"
      footer={
        isSuccess ? undefined : (
          <Button
            type="submit"
            form="bug-report-form"
            variant="primary"
            loading={isSubmitting}
            disabled={!isAuthenticated && !isAltchaVerified}
            className="w-full sm:w-auto sm:min-w-40"
          >
            {isSubmitting ? <span>{t.bugSubmitting || ''}</span> : <span>{t.bugSubmitButton || ''}</span>}
          </Button>
        )
      }
    >
      {isSuccess ? (
        <SuccessState title={t.bugSuccessMessage || ''} description={t.bugSuccessThanks || ''} />
      ) : (
        <>
    {errorMsg && (
      <div className="flex items-center gap-2.5 rounded-card border border-accent-red/40 bg-accent-red/10 p-3 text-xs text-accent-red shadow-sm" role="alert">
        <AlertCircle className="h-4 w-4 shrink-0 text-accent-red" aria-hidden="true" />
        <span>{errorMsg}</span>
      </div>
    )}

    <form id="bug-report-form" onSubmit={handleSubmit} className="space-y-4">
      {isAuthenticated && user ? (
        <div className="flex items-center justify-between rounded-card border border-border-color bg-bg-elevated/60 p-3 text-xs">
          <div className="flex items-center gap-2.5 text-text-secondary">
            <div className="flex h-7 w-7 items-center justify-center rounded-chip bg-bg-elevated border border-border-color text-text-secondary" aria-hidden="true">
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
          <Badge tone="green" size="xs" plain square>
            <UserCheck className="h-3 w-3" aria-hidden="true" />
            {t.verified || ''}
          </Badge>
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

      <div>
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
              className="relative h-16 w-16 rounded-card border border-border-color bg-bg-elevated overflow-hidden shadow-sm group"
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
              className="flex h-16 w-28 flex-col items-center justify-center rounded-control border border-dashed border-border-color bg-bg-elevated/50 hover:bg-accent-red/10 hover:border-accent-red/50 text-text-muted hover:text-accent-red transition-all cursor-pointer type-micro"
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
