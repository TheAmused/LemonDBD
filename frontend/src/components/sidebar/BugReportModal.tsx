'use client';
// frontend/src/components/sidebar/BugReportModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { getBackendBaseUrl, authHeaders, getAuthToken } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { LemonIcon } from '@/components/LemonIcon';
import { useAltcha } from '@/hooks/useAltcha';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import { UserCheck, Mail } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { SuccessState } from '@/components/common/SuccessState';
import { Button } from '@/components/common/Button';
import { FormField, Input, Textarea } from '@/components/common/Field';
import { Alert } from '@/components/common/Alert';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { BugReportScreenshots } from '@/components/sidebar/BugReportScreenshots';
import { trackEvent } from '@/utils/analytics';

export interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Where the modal was opened from (analytics only). */
  source: 'sidebar' | 'profile';
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
  { label: 'bugGuideScreenshotLabel', text: 'bugGuideScreenshotText' },
] as const;

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, source, onSubmitted }) => {
  const dict = useDictionary();
  const { user, isAuthenticated } = useAuth();
  // With guest reports switched off (Settings), a signed-out visitor is asked to sign in up front
  // instead of filling in the form, attachments and all, only to be refused on submit.
  const { features, limits } = useSiteConfig();
  const guestsClosed = !isAuthenticated && !features.guestBugReports;
  // How many screenshots and how large are admin settings (Settings, Bug reports).
  const { bugReportMaxImages: maxImages, bugReportImageMaxBytes: maxImageBytes } = limits;
  const imageRequired = features.bugReportRequireImage;

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

  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const openTrackedRef = useRef(false);
  const startTrackedRef = useRef(false);
  const access = isAuthenticated ? 'member' : 'guest';

  // One `bug_report_open` per time the modal is shown (the ref also covers the dev double effect).
  useEffect(() => {
    if (!isOpen) {
      openTrackedRef.current = false;
      startTrackedRef.current = false;
      return;
    }
    if (openTrackedRef.current) return;
    openTrackedRef.current = true;
    trackEvent('bug_report_open', { source, access: guestsClosed ? 'guest_blocked' : access });
  }, [isOpen, source, access, guestsClosed]);

  // The first edit of any field: separates people who only looked from people who began a report.
  const markStarted = () => {
    if (startTrackedRef.current) return;
    startTrackedRef.current = true;
    trackEvent('bug_report_start', { access });
  };

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

  const handleAddImages = (urls: string[]) => {
    markStarted();
    setImages((prev) => [...prev, ...urls].slice(0, maxImages));
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

    if (imageRequired && images.length === 0) {
      setErrorMsg(t.bugScreenshotRequired);
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
        trackEvent('bug_report_submit', { access, screenshots: images.length });
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
            onChange={(e) => { markStarted(); setGuestEmail(e.target.value); }}
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
          onChange={(e) => { markStarted(); setTitle(e.target.value); }}
          placeholder={t.bugTitlePlaceholder || ''}
        />
      </FormField>

      <FormField label={t.bugDescriptionLabel || ''} htmlFor="bug-report-message" required>
        <Textarea
          id="bug-report-message"
          required
          rows={5}
          value={message}
          onChange={(e) => { markStarted(); setMessage(e.target.value); }}
          placeholder={t.bugDescriptionPlaceholder || ''}
        />
        <Surface tone="inset" padding="sm" className="mt-2 space-y-1.5">
          <p className="type-strong-screen text-text-primary">{t.bugGuideTitle || ''}:</p>
          <ol className="list-decimal space-y-1 pl-5 type-body-screen text-text-secondary">
            {BUG_GUIDE_ITEMS.map(({ label, text }) => (
              <li key={label}>
                <span className="font-bold text-text-primary">{t[label] || ''}:</span> {t[text] || ''}
              </li>
            ))}
          </ol>
        </Surface>
      </FormField>

      <BugReportScreenshots
        images={images}
        maxImages={maxImages}
        maxBytes={maxImageBytes}
        onAdd={handleAddImages}
        onRemove={handleRemoveImage}
        required={imageRequired}
        disabled={isSubmitting}
      />

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
