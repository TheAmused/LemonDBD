'use client';
// frontend/src/components/admin/SanctionPreviewPanel.tsx
//
// What a moderation decision will say to the account holder, before it is taken: the notice they see
// in the app and the email they get. The email comes from the server (the same text builder that sends
// it, in the account holder's language); nothing is saved.

import React, { useEffect, useMemo, useState } from 'react';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { AccountBlockedNotice } from '@/components/moderation/AccountBlockedNotice';
import { WarningNoticeBody } from '@/components/moderation/WarningDialog';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { previewSanction } from '@/services/moderationApi';
import {
  isSanctionDraftValid,
  sanctionPreviewBody,
  type SanctionDraft,
  type SanctionPreview,
  type SanctionTarget,
} from '@/types/moderation';
import { formatDate } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';

type PreviewTab = 'app' | 'email';
type PreviewState = { status: 'idle' | 'loading' | 'ready' | 'error'; data: SanctionPreview | null };

interface SanctionPreviewPanelProps {
  draft: SanctionDraft;
  target: SanctionTarget;
}

const noop = () => {};
const PREVIEW_DELAY_MS = 400;

function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function EmailPreview({ preview, locale }: { preview: SanctionPreview; locale: string }) {
  const t = useDictionary().moderation.admin;
  const { email } = preview;
  return (
    <div className="space-y-3">
      <div className="space-y-0.5 type-caption text-text-muted">
        <p>
          <span className="type-label-xs text-text-secondary">{t.previewSubject}: </span>
          LemonDBD: {email.subject}
        </p>
        <p>{formatMessage(t.previewLanguage, { language: languageName(preview.language, locale) })}</p>
      </div>
      <div className="space-y-2.5 rounded-card border border-border-subtle bg-bg-secondary p-3.5">
        {email.blocks.map((block, index) => {
          if (block[0] === 'p') return <p key={index} className="type-body text-text-primary">{block[1]}</p>;
          if (block[0] === 'field') {
            return (
              <p key={index} className="type-body text-text-primary">
                <strong>{block[1]}:</strong> {block[2]}
              </p>
            );
          }
          return (
            <div key={index}>
              <p className="type-caption text-text-muted">{block[1]}</p>
              <blockquote className="whitespace-pre-wrap break-words border-l-2 border-border-color pl-3 type-body text-text-primary">
                {block[2]}
              </blockquote>
            </div>
          );
        })}
        <p className="border-t border-border-subtle pt-2 type-micro text-text-muted">{email.footer}</p>
      </div>
    </div>
  );
}

export function SanctionPreviewPanel({ draft, target }: SanctionPreviewPanelProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.moderation.admin;
  const [tab, setTab] = useState<PreviewTab>('app');
  const [state, setState] = useState<PreviewState>({ status: 'idle', data: null });

  const valid = isSanctionDraftValid(draft);
  // Only what the preview depends on: typing in the internal notes must not ask the server again.
  const requestKey = useMemo(() => JSON.stringify(sanctionPreviewBody(draft, target)), [draft, target]);

  useEffect(() => {
    if (!valid) {
      setState({ status: 'idle', data: null });
      return;
    }
    let stale = false;
    setState((previous) => ({ status: 'loading', data: previous.data }));
    const timer = setTimeout(() => {
      previewSanction(draft, target).then(
        (data) => {
          if (!stale) setState({ status: 'ready', data });
        },
        () => {
          if (!stale) setState({ status: 'error', data: null });
        }
      );
    }, PREVIEW_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // `requestKey` stands for draft and target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, requestKey]);

  const { data } = state;
  const options = [
    { value: 'app' as const, label: t.previewApp },
    { value: 'email' as const, label: t.previewEmail },
  ];

  let content: React.ReactNode;
  if (!valid) {
    content = <p className="type-caption text-text-muted">{t.previewIncomplete}</p>;
  } else if (state.status === 'error') {
    content = <p className="type-caption text-accent-red">{t.previewFailed}</p>;
  } else if (!data) {
    content = <p className="type-caption text-text-muted">{t.previewLoading}</p>;
  } else if (tab === 'email') {
    content = draft.send_email ? (
      <EmailPreview preview={data} locale={locale} />
    ) : (
      <p className="type-caption text-text-muted">{t.previewNoEmail}</p>
    );
  } else if (draft.kind === 'warning') {
    content = (
      <div className="space-y-4">
        <p className="type-caption text-text-muted">{t.previewWarningIntro}</p>
        <div className="space-y-4 rounded-card border border-border-subtle bg-bg-secondary p-3.5">
          <h4 className="type-strong text-text-primary">{dict.moderation.warning.title}</h4>
          <WarningNoticeBody warning={{ reason_code: data.reason_code, rule_ref: draft.rule_ref || null, facts: data.facts }} />
          {data.until && (
            <p className="type-caption text-text-muted">
              {formatMessage(dict.moderation.warning.expires, { date: formatDate(data.until, locale, { dateStyle: 'long' }) })}
            </p>
          )}
        </div>
        <p className="type-micro text-text-muted">{t.previewAppNote}</p>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        <p className="type-caption text-text-muted">{t.previewBlockedIntro}</p>
        <div className="rounded-card border border-border-subtle bg-bg-secondary p-3.5">
          <AccountBlockedNotice
            showClose={false}
            onClose={noop}
            blocked={{
              code: draft.kind === 'ban' ? 'account_banned' : 'account_suspended',
              until: data.until,
              reason_code: data.reason_code,
              appeal_contact: data.appeal_contact,
            }}
          />
        </div>
        <p className="type-micro text-text-muted">{t.previewAppNote}</p>
      </div>
    );
  }

  return (
    <section aria-label={t.previewTitle} aria-busy={state.status === 'loading'} className="space-y-3 border-t border-border-color pt-4">
      <div>
        <h4 className="type-label-sm text-text-secondary">{t.previewTitle}</h4>
        <p className="type-micro text-text-muted">{t.previewHint}</p>
      </div>
      <SegmentedControl value={tab} options={options} onChange={setTab} ariaLabel={t.previewTitle} size="sm" />
      <div className={state.status === 'loading' && data ? 'opacity-60 transition-opacity' : 'transition-opacity'}>{content}</div>
    </section>
  );
}
