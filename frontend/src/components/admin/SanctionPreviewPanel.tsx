'use client';
// frontend/src/components/admin/SanctionPreviewPanel.tsx
//
// What a moderation decision will say to the account holder, before it is taken: the notice they see
// in the app and the email they get. The email comes from the server (the same text builder that sends
// it, in the account holder's language); nothing is saved.

import React, { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { AccordionSection } from '@/components/common/AccordionSection';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Surface } from '@/components/common/Surface';
import { AccountBlockedNotice } from '@/components/moderation/AccountBlockedNotice';
import { WarningNoticeBody } from '@/components/moderation/WarningDialog';
import { PREVIEW_DEBOUNCE_MS } from '@/constants/timing';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { ADMIN_STORAGE, oneOf } from '@/components/admin/adminStorage';
import { usePersistentString } from '@/hooks/usePersistentString';
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

const PREVIEW_TABS = ['app', 'email'] as const;
type PreviewTab = (typeof PREVIEW_TABS)[number];
type PreviewState = { status: 'idle' | 'loading' | 'ready' | 'error'; data: SanctionPreview | null };

interface SanctionPreviewPanelProps {
  draft: SanctionDraft;
  target: SanctionTarget;
}

const noop = () => {};

function EmailPreview({ preview }: { preview: SanctionPreview }) {
  const dict = useDictionary();
  const t = dict.moderation.admin;
  const { email } = preview;
  return (
    <div className="space-y-3">
      <div className="space-y-0.5 type-caption text-text-muted">
        <p>
          <span className="type-label-xs text-text-secondary">{t.previewSubject}: </span>
          {dict.app.title}: {email.subject}
        </p>
      </div>
      <Surface tone="well" padding="sm" className="space-y-2.5">
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
      </Surface>
    </div>
  );
}

export function SanctionPreviewPanel({ draft, target }: SanctionPreviewPanelProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.moderation.admin;
  const [tab, setTab] = usePersistentString<PreviewTab>(ADMIN_STORAGE.moderationPreviewTab, 'app', oneOf(PREVIEW_TABS));
  // The server's last answer, for the request it answered; anything newer is still loading.
  const [answer, setAnswer] = useState<{ key: string; status: 'ready' | 'error'; data: SanctionPreview | null } | null>(null);
  // Folded away by default and remembered; a folded preview asks the server for nothing.
  const [isOpen, toggleOpen] = usePersistentDrawer(ADMIN_STORAGE.moderationPreviewOpen, false);

  const valid = isSanctionDraftValid(draft);
  // Only what the preview depends on: typing in the internal notes must not ask the server again.
  const requestKey = useMemo(() => JSON.stringify(sanctionPreviewBody(draft, target)), [draft, target]);

  // Reads the latest draft and target without making every keystroke in them re-run the effect below.
  const requestPreview = useEffectEvent(() => previewSanction(draft, target));

  const state: PreviewState = !valid
    ? { status: 'idle', data: null }
    : answer?.key === requestKey
      ? answer
      : { status: 'loading', data: answer?.data ?? null };

  useEffect(() => {
    if (!isOpen || !valid) return;
    let stale = false;
    const timer = setTimeout(() => {
      requestPreview().then(
        (data) => {
          if (!stale) setAnswer({ key: requestKey, status: 'ready', data });
        },
        () => {
          if (!stale) setAnswer({ key: requestKey, status: 'error', data: null });
        }
      );
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
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
        <Surface tone="well" padding="sm" className="space-y-4">
          <h4 className="type-strong text-text-primary">{dict.moderation.warning.title}</h4>
          <WarningNoticeBody warning={{ reason_code: data.reason_code, rule_ref: draft.rule_ref || null, facts: data.facts }} />
          {data.until && (
            <p className="type-caption text-text-muted">
              {formatMessage(dict.moderation.warning.expires, { date: formatDate(data.until, locale, { dateStyle: 'long' }) })}
            </p>
          )}
        </Surface>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        <Surface tone="well" padding="sm">
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
        </Surface>
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
