// frontend/src/__tests__/unit/moderation.test.ts
//
// The pure parts of the moderation UI: how a sign-in answer is read, when a decision form is
// complete, what is sent, and how an account's standing is derived from the user list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { blockedFromResponse, warningsFromResponse } from '@/utils/moderationResponse';
import {
  EMPTY_SANCTION_DRAFT,
  accountStanding,
  authorDecisionFromDraft,
  draftFromSuggestion,
  isSanctionDraftValid,
  moderationState,
  patchDraft,
  sanctionPreviewBody,
  sanctionRequestBody,
  type ModerationSuggestion,
  type SanctionDraft,
} from '@/types/moderation';
import { en, es, pl, de, ja } from '@/locales';
import { SANCTION_REASONS, RULE_REFS, RULE_SECTION_NUMBERS } from '@/types/moderation';
import { LEGAL_DOCS } from '@/components/legal/legalDocs';
import { ruleLabel } from '@/components/moderation/moderationLabels';

const draft = (patch: Partial<SanctionDraft>): SanctionDraft => ({ ...EMPTY_SANCTION_DRAFT, ...patch });

test('a 403 with an account_* code is a block; other failures are not', () => {
  const body = {
    code: 'account_suspended',
    until: '2026-12-01T08:30:00+00:00',
    reason_code: 'spam',
    appeal_contact: 'help@lemondbd.test',
  };
  assert.deepEqual(blockedFromResponse(403, body), {
    code: 'account_suspended',
    until: '2026-12-01T08:30:00+00:00',
    reason_code: 'spam',
    appeal_contact: 'help@lemondbd.test',
  });
  assert.deepEqual(blockedFromResponse(403, { code: 'account_banned', until: null }), {
    code: 'account_banned',
    until: null,
    reason_code: null,
    appeal_contact: null,
  });
  assert.equal(blockedFromResponse(401, body), undefined);
  assert.equal(blockedFromResponse(403, { code: 'forbidden' }), undefined);
  assert.equal(blockedFromResponse(403, null), undefined);
  assert.equal(blockedFromResponse(403, 'nope'), undefined);
});

test('warnings are read from moderation.warnings and anything malformed counts as none', () => {
  const warning = { id: 4, kind: 'warning', reason_code: 'spam' };
  assert.deepEqual(warningsFromResponse({ moderation: { warnings: [warning] } }), [warning]);
  assert.deepEqual(warningsFromResponse({ moderation: { warnings: [warning, null, 'x', { id: 'no' }] } }), [warning]);
  assert.deepEqual(warningsFromResponse({}), []);
  assert.deepEqual(warningsFromResponse({ moderation: { warnings: 'x' } }), []);
  assert.deepEqual(warningsFromResponse(null), []);
});

test('a suspension or ban needs the facts; a warning does not', () => {
  assert.equal(isSanctionDraftValid(draft({ kind: 'warning' })), true);
  assert.equal(isSanctionDraftValid(draft({ kind: 'ban', facts: '   ' })), false);
  assert.equal(isSanctionDraftValid(draft({ kind: 'ban', facts: 'Posted slurs.' })), true);
  assert.equal(isSanctionDraftValid(draft({ kind: 'suspension', facts: 'x', duration_days: 7 })), true);
});

test('a suspension needs a whole number of days from 1 to 365', () => {
  const base = { kind: 'suspension' as const, facts: 'x' };
  for (const days of [0, -1, 366, 1.5, NaN]) {
    assert.equal(isSanctionDraftValid(draft({ ...base, duration_days: days })), false, String(days));
  }
  for (const days of [1, 30, 365]) {
    assert.equal(isSanctionDraftValid(draft({ ...base, duration_days: days })), true, String(days));
  }
});

test('the request leaves out empty fields and the duration of anything but a suspension', () => {
  const warning = sanctionRequestBody(draft({ kind: 'warning', reason_code: 'spam', facts: '  ' }));
  assert.deepEqual(warning, {
    kind: 'warning',
    reason_code: 'spam',
    rule_ref: undefined,
    duration_days: undefined,
    facts: undefined,
    internal_notes: undefined,
    send_email: true,
  });
  const suspension = sanctionRequestBody(
    draft({ kind: 'suspension', facts: 'Spam links.', duration_days: 14, rule_ref: 'serverCare', send_email: false })
  );
  assert.equal(suspension.duration_days, 14);
  assert.equal(suspension.rule_ref, 'serverCare');
  assert.equal(suspension.send_email, false);
});

test('a report resolution sends the backend names for the author decision', () => {
  assert.equal(authorDecisionFromDraft(draft({ kind: 'warning' })).author_action, 'warn');
  const suspend = authorDecisionFromDraft(draft({ kind: 'suspension', duration_days: 3, facts: ' f ' }));
  assert.deepEqual(suspend, {
    author_action: 'suspend',
    duration_days: 3,
    facts: 'f',
    rule_ref: undefined,
  });
  const ban = authorDecisionFromDraft(draft({ kind: 'ban', duration_days: 9 }));
  assert.equal(ban.author_action, 'ban');
  assert.equal(ban.duration_days, undefined);
});

test('standing comes from is_active and a suspended_until that is still in the future', () => {
  const now = Date.parse('2026-10-15T12:00:00Z');
  assert.equal(accountStanding({ is_active: false, suspended_until: null }, now), 'banned');
  assert.equal(accountStanding({ is_active: false, suspended_until: '2030-01-01T00:00:00Z' }, now), 'banned');
  assert.equal(accountStanding({ is_active: true, suspended_until: '2026-10-16T00:00:00Z' }, now), 'suspended');
  assert.equal(accountStanding({ is_active: true, suspended_until: '2026-10-14T00:00:00Z' }, now), 'active');
  assert.equal(accountStanding({ is_active: true }, now), 'active');
  assert.equal(accountStanding({ is_active: true, suspended_until: 'garbage' }, now), 'active');
});

test('every reason and every rule the backend accepts has a name in every language', () => {
  const rulesOf = (loc: typeof en) => loc.rules.sections as Record<string, { heading: string }>;
  for (const [name, loc] of Object.entries({ en, es, pl, de, ja })) {
    const reasons = loc.moderation.reasons as Record<string, string>;
    for (const code of SANCTION_REASONS) assert.ok(reasons[code], `${name}: reason ${code}`);
    for (const ref of RULE_REFS) assert.ok(rulesOf(loc as typeof en)[ref]?.heading, `${name}: rule ${ref}`);
  }
});

test('using the suggestion sets the kind and length but keeps what the admin already typed', () => {
  const basis = { active_warnings: 3, warnings_before_suspension: 3, suspensions: 0 };
  const typed = draft({ facts: 'Posted slurs', duration_days: 5 });

  const suspension: ModerationSuggestion = { kind: 'suspension', duration_days: 30, basis };
  assert.deepEqual(draftFromSuggestion(typed, suspension), {
    ...typed,
    kind: 'suspension',
    duration_days: 30,
  });

  // A warning or a ban carries no length: the draft keeps its own.
  const ban: ModerationSuggestion = { kind: 'ban', duration_days: null, basis };
  assert.deepEqual(draftFromSuggestion(typed, ban), { ...typed, kind: 'ban', duration_days: 5 });
  assert.equal(draftFromSuggestion(typed, { kind: 'warning', duration_days: null, basis }).kind, 'warning');
});

test('the suggestion texts exist in every language with the placeholders they are filled with', () => {
  for (const [name, loc] of Object.entries({ en, es, pl, de, ja })) {
    const t = loc.moderation.admin as Record<string, string>;
    for (const key of ['suggestionTitle', 'suggestionWarning', 'suggestionBan', 'suggestionApply']) {
      assert.ok(t[key], `${name}: ${key}`);
    }
    assert.ok(t.suggestionSuspension.includes('{days}'), `${name}: suggestionSuspension`);
    for (const placeholder of ['{active}', '{needed}', '{suspensions}']) {
      assert.ok(t.suggestionBasis.includes(placeholder), `${name}: suggestionBasis ${placeholder}`);
    }
  }
});

test('a cited rule is named by its section number', () => {
  // The Rules page opens with the unnumbered `scope`; the rest follow in RULE_REFS order, numbered from 1.
  // The backend keeps the same table (app/core/rule_sections.py).
  assert.deepEqual(LEGAL_DOCS.rules.order.filter((id) => id !== 'scope'), [...RULE_REFS]);
  RULE_REFS.forEach((ref, index) => assert.equal(RULE_SECTION_NUMBERS[ref], index + 1, ref));
  assert.equal(ruleLabel(en, 'respect'), `Section 1: ${en.rules.sections.respect.heading}`);
  assert.equal(ruleLabel(en, null), '');
  assert.equal(ruleLabel(en, 'madeUp'), 'madeUp', 'an unknown rule prints as itself');
  for (const [name, loc] of Object.entries({ en, es, pl, de, ja })) {
    assert.ok(loc.moderation.ruleSection.includes('{number}') && loc.moderation.ruleSection.includes('{name}'), name);
  }
});

test('the preview request is the form plus whom it is about, without the internal fields', () => {
  const typed = draft({ kind: 'suspension', reason_code: 'spam', rule_ref: 'serverCare', facts: ' Link spam ', duration_days: 7, internal_notes: 'secret', send_email: false });
  assert.deepEqual(sanctionPreviewBody(typed, { userId: 5 }), {
    user_id: 5,
    kind: 'suspension',
    reason_code: 'spam',
    rule_ref: 'serverCare',
    duration_days: 7,
    facts: 'Link spam',
  });
  const forReport = sanctionPreviewBody(draft({ kind: 'warning' }), { reportId: 9 });
  assert.equal(forReport.report_id, 9);
  assert.equal(forReport.user_id, undefined);
  assert.equal(forReport.duration_days, undefined);
});

test('an account is banned, suspended, warned or in good standing, in that order of precedence', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  const base = { banned: false, suspended_until: null, active_warnings: 0 };
  assert.equal(moderationState(base, now), 'good');
  assert.equal(moderationState({ ...base, active_warnings: 1 }, now), 'warned');
  assert.equal(moderationState({ ...base, active_warnings: 1, suspended_until: '2026-10-20T00:00:00Z' }, now), 'suspended');
  assert.equal(moderationState({ ...base, active_warnings: 1, suspended_until: '2026-10-01T00:00:00Z' }, now), 'warned', 'a lapsed suspension no longer counts');
  assert.equal(moderationState({ banned: true, suspended_until: '2026-10-20T00:00:00Z', active_warnings: 3 }, now), 'banned');
});

test('a suspension starts at the length the admin set, unless one was already typed', () => {
  const chosen = patchDraft(EMPTY_SANCTION_DRAFT, { kind: 'suspension' }, 30);
  assert.equal(chosen.kind, 'suspension');
  assert.equal(chosen.duration_days, 30);
  const typed = patchDraft({ ...EMPTY_SANCTION_DRAFT, duration_days: 3 }, { kind: 'suspension' }, 30);
  assert.equal(typed.duration_days, 3);
  assert.equal(patchDraft(EMPTY_SANCTION_DRAFT, { kind: 'suspension' }).duration_days, EMPTY_SANCTION_DRAFT.duration_days);
  assert.equal(patchDraft(chosen, { facts: 'x' }, 14).duration_days, 30);
});
