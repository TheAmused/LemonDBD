'use client';
// frontend/src/components/admin/SanctionPreviewPanel.tsx
//
// What a moderation decision will say to the account holder, before it is taken: the notice they see
// in the app and the email they get. The email comes from the server (the same text builder that sends
// it, in the account holder's language); nothing is saved.

import React, { useEffect, useMemo, useState } from 'react';
import { AccordionSection } from '@/components/common/AccordionSection';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { AccountBlockedNotice } from '@/components/moderation/AccountBlockedNotice';
import { WarningNoticeBody } from '@/components/moderation/WarningDialog';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
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
const PREVIEW_DRAWER_KEY = 'lemondbd_moderation_preview_open';

function EmailPreview({ preview }: { preview: SanctionPreview }) {
  const t = useDictionary().moderation.admin;
  const { email } = preview;
  return (
    <div className="space-y-3">
      <div className="space-y-0.5 type-caption text-text-muted">
        <p>
          <span className="type-label-xs text-text-secondary">{t.previewSubject}: </span>
          LemonDBD: {email.subject}
        </p>
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
  // Folded away by default and remembered; a folded preview asks the server for nothing.
  const [isOpen, toggleOpen] = usePersistentDrawer(PREVIEW_DRAWER_KEY, false);

  const valid = isSanctionDraftValid(draft);
  // Only what the preview depends on: typing in the internal notes must not ask the server again.
  const requestKey = useMemo(() => JSON.stringify(sanctionPreviewBody(draft, target)), [draft, target]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, valid, requestKey]);

  const { data } = state;
  const options = [
    { value: 'app' as const, label: t.previewApp },
    { value: 'email' as const, label: t.previewEmail },
  ];

  let content: React.ReactNode;
  if (!valid) {
    content = <p className="text-center type-caption text-text-muted">{t.previewIncomplete}</p>;
  } else if (state.status === 'error') {
    content = <p className="text-center type-caption text-accent-red">{t.previewFailed}</p>;
  } else if (!data) {
    content = <p className="text-center type-caption text-text-muted">{t.previewLoading}</p>;
  } else if (tab === 'email') {
    content = (
      <div className="space-y-3">
        {!draft.send_email && <p className="text-center type-caption text-text-muted">{t.previewNoEmail}</p>}
        <div className={draft.send_email ? undefined : 'opacity-50'}>
          <EmailPreview preview={data} />
        </div>
      </div>
    );
  } else if (draft.kind === 'warning') {
    content = (
      <div className="space-y-4">
        <div className="space-y-4 rounded-card border border-border-subtle bg-bg-secondary p-3.5">
          <h4 className="type-strong text-text-primary">{dict.moderation.warning.title}</h4>
          <WarningNoticeBody warning={{ reason_code: data.reason_code, rule_ref: draft.rule_ref || null, facts: data.facts }} />
          {data.until && (
            <p className="type-caption text-text-muted">
              {formatMessage(dict.moderation.warning.expires, { date: formatDate(data.until, locale, { dateStyle: 'long' }) })}
            </p>
          )}
        </div>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
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
      </div>
    );
  }

  return (
    <AccordionSection as="div" title={t.previewTitle} open={isOpen} onToggle={toggleOpen} bodyClassName="space-y-4 p-4">
      <div className="flex justify-center">
        <SegmentedControl value={tab} options={options} onChange={setTab} ariaLabel={t.previewTitle} size="sm" />
      </div>
      <div aria-busy={state.status === 'loading'} className={state.status === 'loading' && data ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {content}
      </div>
    </AccordionSection>
  );
}
