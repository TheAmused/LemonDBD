'use client';
// frontend/src/components/admin/SanctionForm.tsx
//
// The fields of one moderation decision (warning, suspension or ban). Shared by the user's
// Moderation drawer and the content-report case, which fixes the reason and the kind list.

import React, { useId } from 'react';
import { Checkbox } from '@/components/common/Checkbox';
import { Input, Select, Textarea } from '@/components/common/Field';
import { SanctionPreviewPanel } from '@/components/admin/SanctionPreviewPanel';
import { reasonLabel, ruleLabel } from '@/components/moderation/moderationLabels';
import { useDictionary } from '@/context/DictionaryContext';
import {
  MAX_SANCTION_TEXT_LENGTH,
  MAX_SUSPENSION_DAYS,
  MIN_SUSPENSION_DAYS,
  RULE_REFS,
  SANCTION_REASONS,
  type SanctionDraft,
  type SanctionKind,
  type SanctionTarget,
} from '@/types/moderation';

interface SanctionFormProps {
  draft: SanctionDraft;
  onChange: (patch: Partial<SanctionDraft>) => void;
  /** Which decisions can be picked; a single entry hides the picker. */
  kinds: readonly SanctionKind[];
  /** False when the reason is fixed elsewhere (a report supplies its own category). */
  showReason?: boolean;
  /** Internal notes and the "email the user" switch belong to the drawer, not to a report. */
  showInternal?: boolean;
  /** Whom the decision is about; when given, a preview of what they will be told closes the form. */
  previewTarget?: SanctionTarget;
}

export function SanctionForm({ draft, onChange, kinds, showReason = true, showInternal = true, previewTarget }: SanctionFormProps) {
  const dict = useDictionary();
  const t = dict.moderation.admin;
  const id = useId();
  const kindLabel: Record<SanctionKind, string> = {
    warning: t.kindWarning,
    suspension: t.kindSuspension,
    ban: t.kindBan,
  };
  const factsRequired = draft.kind !== 'warning';
  const label = 'block type-label-xs text-text-secondary mb-1';
  const hint = 'mt-1 type-micro text-text-muted';

  return (
    <div className="space-y-3">
      {kinds.length > 1 && (
        <div>
          <label htmlFor={`${id}-kind`} className={label}>{t.formKind}</label>
          <Select
            id={`${id}-kind`}
            fieldSize="sm"
            value={draft.kind}
            onChange={(e) => onChange({ kind: e.target.value as SanctionKind })}
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>{kindLabel[kind]}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {showReason && (
          <div>
            <label htmlFor={`${id}-reason`} className={label}>{t.formReason}</label>
            <Select
              id={`${id}-reason`}
              fieldSize="sm"
              value={draft.reason_code}
              onChange={(e) => onChange({ reason_code: e.target.value as SanctionDraft['reason_code'] })}
            >
              {SANCTION_REASONS.map((code) => (
                <option key={code} value={code}>{reasonLabel(dict, code)}</option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <label htmlFor={`${id}-rule`} className={label}>{t.formRule}</label>
          <Select
            id={`${id}-rule`}
            fieldSize="sm"
            value={draft.rule_ref}
            onChange={(e) => onChange({ rule_ref: e.target.value as SanctionDraft['rule_ref'] })}
          >
            <option value="">{t.formRuleNone}</option>
            {RULE_REFS.map((ref) => (
              <option key={ref} value={ref}>{ruleLabel(dict, ref)}</option>
            ))}
          </Select>
        </div>
      </div>

      {draft.kind === 'suspension' && (
        <div>
          <label htmlFor={`${id}-days`} className={label}>{t.formDuration}</label>
          <Input
            id={`${id}-days`}
            type="number"
            fieldSize="sm"
            inputMode="numeric"
            min={MIN_SUSPENSION_DAYS}
            max={MAX_SUSPENSION_DAYS}
            value={Number.isNaN(draft.duration_days) ? '' : draft.duration_days}
            onChange={(e) => onChange({ duration_days: e.target.value === '' ? NaN : Number(e.target.value) })}
            invalid={!(draft.duration_days >= MIN_SUSPENSION_DAYS && draft.duration_days <= MAX_SUSPENSION_DAYS)}
            className="sm:w-40"
          />
          <p className={hint}>{MIN_SUSPENSION_DAYS}–{MAX_SUSPENSION_DAYS}</p>
        </div>
      )}

      <div>
        <label htmlFor={`${id}-facts`} className={label}>{t.formFacts}</label>
        <Textarea
          id={`${id}-facts`}
          fieldSize="sm"
          rows={3}
          maxLength={MAX_SANCTION_TEXT_LENGTH}
          value={draft.facts}
          onChange={(e) => onChange({ facts: e.target.value })}
          invalid={factsRequired && draft.facts.trim().length === 0}
          className="resize-none"
        />
        <p className={hint}>{factsRequired ? t.formFactsRequired : t.formFactsOptional}</p>
      </div>

      {showInternal && (
        <>
          <div>
            <label htmlFor={`${id}-internal`} className={label}>{t.formInternal}</label>
            <Textarea
              id={`${id}-internal`}
              fieldSize="sm"
              rows={2}
              maxLength={MAX_SANCTION_TEXT_LENGTH}
              value={draft.internal_notes}
              onChange={(e) => onChange({ internal_notes: e.target.value })}
              className="resize-none"
            />
            <p className={hint}>{t.formInternalHint}</p>
          </div>
          <Checkbox checked={draft.send_email} onChange={(send_email) => onChange({ send_email })}>
            <span className="type-body text-text-primary">{t.formSendEmail}</span>
          </Checkbox>
        </>
      )}

      {previewTarget && <SanctionPreviewPanel draft={draft} target={previewTarget} />}
    </div>
  );
}
