'use client';
// frontend/src/components/sidebar/BugReportModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { getBackendBaseUrl, authHeaders, getAuthToken } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { LemonIcon } from '@/components/LemonIcon';
import { useAltcha } from '@/hooks/useAltcha';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  UserCheck,
  Mail,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { SuccessState } from '@/components/common/SuccessState';
import { Button } from '@/components/common/Button';
import { FormField, Input, Textarea } from '@/components/common/Field';
import { Alert } from '@/components/common/Alert';
import { IconLabel } from '@/components/common/IconLabel';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { Img } from '@/components/common/Img';

export interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once a report was accepted (lets a list of the user's reports refresh only then). */
  onSubmitted?: () => void;
}

interface BugReportResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

/** Dictionary keys for the "what a good report contains" guide under the description field. */
const BUG_GUIDE_ITEMS = [
  { label: 'bugGuideHappenedLabel', text: 'bugGuideHappenedText' },
  { label: 'bugGuideStepsLabel', text: 'bugGuideStepsText' },
  { label: 'bugGuideExpectedLabel', text: 'bugGuideExpectedText' },
] as const;

const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, onSubmitted }) => {
  const dict = useDictionary();
  const { user, isAuthenticated } = useAuth();
  // With guest reports switched off (Settings), a signed-out visitor is asked to sign in up front
  // instead of filling in the form, attachments and all, only to be refused on submit.
  const { features } = useSiteConfig();
  const guestsClosed = !isAuthenticated && !features.guestBugReports;

  const t = dict.sidebar;

  const {
    altchaPayload,
    isVerifying: isAltchaVerifying,
    isVerified: isAltchaVerified,
    error: altchaError,
    refreshChallenge,
    honeypotValue,
    honeypotProps,
  } = useAltcha(!isAuthenticated && isOpen && !guestsClosed);

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
      setErrorMsg(t.bugMaxScreenshots);
      return;
    }

    setErrorMsg(null);
    Array.from(files).forEach((file) => {
      if (file.size > MAX_SCREENSHOT_BYTES) {
        setErrorMsg(t.bugImageSizeLimit);
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
      setErrorMsg(t.bugGuestEmailRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const backendBase = getBackendBaseUrl();
      const headers: Record<string, string> = authHeaders(getAuthToken(), { json: true });

      const payload = {
        title: title.trim(),
        message: message.trim(),
        reporter_name: user?.username || 'Guest',
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
        setErrorMsg(data.error || t.bugErrorMessage);
      } else {
        setIsSuccess(true);
        onSubmitted?.();
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
        isSuccess || guestsClosed ? undefined : (
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
      ) : guestsClosed ? (
        <Alert>{t.bugGuestsClosed}</Alert>
      ) : (
        <>
    {errorMsg && <Alert>{errorMsg}</Alert>}

    <form id="bug-report-form" onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
      {isAuthenticated && user ? (
        <Surface tone="elevated" padding="sm" className="flex items-center justify-between bg-bg-elevated/60 text-xs">
          <div className="flex items-center gap-2.5 text-text-secondary">
            <div className="flex h-7 w-7 items-center justify-center rounded-chip bg-bg-elevated border border-border-color text-text-secondary" aria-hidden="true">
              <LemonIcon className="icon-md" />
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
            <UserCheck className="icon-xs" aria-hidden="true" />
            {t.verified || ''}
          </Badge>
        </Surface>
      ) : (
        <FormField
          label={t.bugGuestEmailLabel || ''}
          htmlFor="bug-report-email"
         
          required
          icon={<Mail className="icon-sm text-text-muted" aria-hidden="true" />}
        >
          <Input
            id="bug-report-email"
            type="email"
            required
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder={t.bugGuestEmailPlaceholder || ''}
          />
        </FormField>
      )}

      <FormField label={t.bugTitleLabel || ''} htmlFor="bug-report-title" required>
        <Input
          id="bug-report-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.bugTitlePlaceholder || ''}
        />
      </FormField>

      <FormField label={t.bugDescriptionLabel || ''} htmlFor="bug-report-message" required>
        <Textarea
          id="bug-report-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.bugDescriptionPlaceholder || ''}
        />
        <div className="mt-1.5 space-y-0.5 type-caption text-text-muted">
          <p>{t.bugGuideTitle || ''}:</p>
          {BUG_GUIDE_ITEMS.map(({ label, text }, idx) => (
            <p key={label}>
              {idx + 1}. {t[label] || ''}: {t[text] || ''}
            </p>
          ))}
        </div>
      </FormField>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <IconLabel as="label" icon={ImageIcon} variant="heading">{t.bugScreenshotsLabel || ''}</IconLabel>
          <span className="type-micro text-text-muted">
            {images.length}/3
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {images.map((imgSrc, idx) => (
            <Surface
              key={idx}
              tone="elevated" padding="none" className="relative h-16 w-16 overflow-hidden shadow-sm group"
            >
              <Img
                src={imgSrc}
                alt={`${t.bugScreenshotAlt} #${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                aria-label={`${t.bugRemoveScreenshot} ${idx + 1}`}
                className="absolute inset-0 bg-accent-red/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-text-inverted transition-opacity focus:opacity-100"
              >
                <Trash2 className="icon-md" aria-hidden="true" />
              </button>
            </Surface>
          ))}

          {images.length < 3 && (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="secondary" size="sm" dashed className="h-16 w-28 flex-col gap-0.5"
            >
              <Upload className="icon-md mb-0.5" aria-hidden="true" />
              <span>{t.bugUploadImage || ''}</span>
            </Button>
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
        onRetry={() => { void refreshChallenge(); }}
        honeypotProps={honeypotProps}
      />
        </form>
        </>
      )}
    </Modal>
  );
};
