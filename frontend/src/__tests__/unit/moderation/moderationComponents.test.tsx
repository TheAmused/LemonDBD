// frontend/src/__tests__/unit/moderation/moderationComponents.test.tsx
//
// What the moderation screens put in front of people: the blocked notice (including a moderator's
// text, which is free text and must be escaped), the decision form, the history and the badge.
import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { AccountBlockedNotice } from '@/components/moderation/AccountBlockedNotice';
import { SanctionForm } from '@/components/admin/SanctionForm';
import { SanctionHistory } from '@/components/admin/SanctionHistory';
import { ModerationProfileCard } from '@/components/admin/ModerationProfileCard';
import { UserStandingBadge } from '@/components/admin/UserStandingBadge';
import { EMPTY_SANCTION_DRAFT, SANCTION_KINDS, type AdminSanction, type ModerationSummary } from '@/types/moderation';
import { en, pl } from '@/locales';

const noop = () => {};

describe('AccountBlockedNotice', () => {
  it('tells a suspended person until when, why, and how to appeal', () => {
    const html = renderWithDictionary(
      React.createElement(AccountBlockedNotice, {
        blocked: {
          code: 'account_suspended',
          until: '2030-05-01T10:00:00Z',
          reason_code: 'spam',
          appeal_contact: 'help@lemondbd.test',
        },
        onClose: noop,
      })
    );
    assert.ok(html.includes('2030'), 'the end date is shown');
    assert.ok(html.includes(en.moderation.reasons.spam));
    assert.ok(html.includes('help@lemondbd.test'));
    assert.ok(!html.includes('{'), 'no placeholder is left unfilled');
  });

  it('says a ban is permanent and falls back to the generic appeal sentence without a contact', () => {
    const html = renderWithDictionary(
      React.createElement(AccountBlockedNotice, {
        blocked: { code: 'account_banned', until: null, reason_code: null, appeal_contact: null },
        onClose: noop,
      })
    );
    assert.ok(html.includes(en.moderation.blocked.bannedBody));
    assert.ok(html.includes(en.moderation.blocked.appealNoContact));
    assert.ok(html.includes(en.moderation.blocked.close));
  });

  it('leaves out the close button in the admin preview', () => {
    const html = renderWithDictionary(
      React.createElement(AccountBlockedNotice, {
        blocked: { code: 'account_banned', until: null, reason_code: 'spam', appeal_contact: null },
        onClose: noop,
        showClose: false,
      })
    );
    assert.ok(html.includes(en.moderation.blocked.bannedBody));
    assert.ok(!html.includes(en.moderation.blocked.close));
  });

  it('speaks the visitor\'s language', () => {
    const html = renderWithDictionary(
      React.createElement(AccountBlockedNotice, {
        blocked: { code: 'account_banned', until: null, reason_code: 'harassment', appeal_contact: null },
        onClose: noop,
      }),
      { dict: pl as never, locale: 'pl' }
    );
    assert.ok(html.includes(pl.moderation.reasons.harassment));
    assert.ok(html.includes(pl.moderation.blocked.close));
  });
});

describe('SanctionForm', () => {
  const render = (patch: Partial<typeof EMPTY_SANCTION_DRAFT>, props: { showReason?: boolean; showInternal?: boolean } = {}) =>
    renderWithDictionary(
      React.createElement(SanctionForm, {
        draft: { ...EMPTY_SANCTION_DRAFT, ...patch },
        kinds: SANCTION_KINDS,
        onChange: noop,
        ...props,
      })
    );

  it('asks for the duration only for a suspension and marks the facts required for suspension and ban', () => {
    assert.ok(!render({ kind: 'warning' }).includes(en.moderation.admin.formDuration));
    assert.ok(render({ kind: 'suspension' }).includes(en.moderation.admin.formDuration));
    assert.ok(!render({ kind: 'ban' }).includes(en.moderation.admin.formDuration));
    assert.ok(render({ kind: 'ban' }).includes('Required for a suspension or a ban'));
    assert.ok(render({ kind: 'warning' }).includes(en.moderation.admin.formFactsOptional));
  });

  it('shows the chosen reason and rule in their dropdowns, the rule as "Section N: heading"', () => {
    const none = render({});
    assert.ok(none.includes(en.moderation.reasons.other));
    assert.ok(none.includes(en.moderation.admin.formRuleNone));
    const cited = render({ rule_ref: 'fairPlay' });
    assert.ok(cited.includes(`Section 2: ${en.rules.sections.fairPlay.heading}`.replace("'", '&#x27;')));
  });

  it('hides what the report case fixes elsewhere, and keeps the notes with the drawer only', () => {
    const full = render({});
    assert.ok(full.includes(en.moderation.admin.formInternal));
    assert.ok(!full.includes(en.moderation.admin.previewTitle), 'no preview without a target');
    assert.ok(!full.includes(en.moderation.admin.formSendEmail), 'the email switch belongs to the drawer, next to the suggestion');
    const forReport = render({}, { showReason: false, showInternal: false });
    assert.ok(!forReport.includes(en.moderation.admin.formReason));
    assert.ok(!forReport.includes(en.moderation.admin.formInternal));
  });
});

describe('ModerationProfileCard', () => {
  const user = { id: 4, login: 'ada', username: 'Ada', email: 'a@x.test', role: 'user', is_active: true, created_at: '2026-01-01T00:00:00Z', owned_characters_count: 0, unlocked_perks_count: 0 };
  const summary = (patch: Partial<ModerationSummary>): ModerationSummary => ({
    active_warnings: 0,
    total_warnings: 0,
    total_suspensions: 0,
    banned: false,
    suggestion: null,
    suspended_until: null,
    content_blocked: 0,
    ...patch,
  });
  const render = (patch: Partial<ModerationSummary> | null) =>
    renderWithDictionary(
      React.createElement(ModerationProfileCard, { user, summary: patch === null ? null : summary(patch), busy: false, onRestore: noop })
    );

  it('rings the avatar green, yellow, orange or red by where the account stands', () => {
    assert.ok(render({}).includes('border-accent-green'));
    assert.ok(render({ active_warnings: 1, total_warnings: 1 }).includes('border-accent-amber'));
    assert.ok(render({ suspended_until: '2999-01-01T00:00:00Z' }).includes('border-accent-orange'));
    assert.ok(render({ banned: true }).includes('border-accent-red'));
    assert.ok(!render(null).includes('border-accent-green'), 'neutral until the summary has loaded');
  });

  it('names the standing for screen readers, shows the numbers, and offers Restore only when blocked', () => {
    const warned = render({ active_warnings: 2, total_warnings: 5, total_suspensions: 1, content_blocked: 3 });
    assert.ok(warned.includes(en.moderation.admin.standingWarned));
    assert.ok(warned.includes('2 / 5') && warned.includes('Ada') && warned.includes('@ada'));
    assert.ok(!warned.includes(en.moderation.admin.restoreButton));
    assert.ok(render({ banned: true }).includes(en.moderation.admin.restoreButton));
  });
});

const sanction = (patch: Partial<AdminSanction>): AdminSanction => ({
  id: 1,
  user_id: 7,
  kind: 'suspension',
  reason_code: 'spam',
  rule_ref: 'fairPlay',
  facts: 'Posted spam links.',
  internal_notes: 'internal-detail',
  source: 'manual',
  report_id: null,
  issued_at: '2026-10-01T10:00:00Z',
  expires_at: '2026-10-08T10:00:00Z',
  revoked_at: null,
  revoke_reason: null,
  acknowledged_at: null,
  active: true,
  issued_by_login: 'lemon',
  revoked_by_login: null,
  ...patch,
});

describe('SanctionHistory', () => {
  const render = (sanctions: AdminSanction[]) =>
    renderWithDictionary(React.createElement(SanctionHistory, { sanctions, busy: false, onRevoke: noop }));

  it('says so when there is no history', () => {
    assert.ok(render([]).includes(en.moderation.admin.historyEmpty));
  });

  it('shows the admin everything including internal notes, and offers to revoke only what is active', () => {
    const html = render([sanction({}), sanction({ id: 2, active: false, revoked_at: '2026-10-02T10:00:00Z', revoke_reason: 'Mistake', revoked_by_login: 'lemon' })]);
    assert.ok(html.includes('internal-detail'));
    assert.ok(html.includes('Posted spam links.'));
    assert.ok(html.includes(en.moderation.admin.statusActive));
    assert.ok(html.includes(en.moderation.admin.statusRevoked));
    assert.equal(html.split(`>${en.moderation.admin.revokeButton}<`).length - 1, 1, 'one revoke button, for the active one');
    assert.ok(html.includes('Mistake'));
  });

  it('tracks whether a warning was seen', () => {
    const warning = { kind: 'warning' as const, expires_at: null };
    assert.ok(render([sanction({ ...warning })]).includes(en.moderation.admin.notAcknowledged));
    assert.ok(!render([sanction({ ...warning, acknowledged_at: '2026-10-02T10:00:00Z' })]).includes(en.moderation.admin.notAcknowledged));
  });
});

describe('UserStandingBadge', () => {
  const render = (user: { is_active: boolean; suspended_until?: string | null }) =>
    renderWithDictionary(React.createElement(UserStandingBadge, { user }));

  it('tells banned, suspended and in-good-standing accounts apart', () => {
    assert.ok(render({ is_active: false }).includes(en.moderation.admin.badgeBanned));
    assert.ok(render({ is_active: true, suspended_until: '2999-01-01T00:00:00Z' }).includes('2999'));
    const active = render({ is_active: true, suspended_until: '2001-01-01T00:00:00Z' });
    assert.ok(active.includes(en.stats.active), 'a suspension in the past no longer counts');
  });
});
