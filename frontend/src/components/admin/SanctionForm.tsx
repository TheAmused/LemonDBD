'use client';
// frontend/src/components/admin/SanctionForm.tsx
//
// The fields of one moderation decision (warning, suspension or ban). Shared by the user's
// Moderation drawer and the content-report case, which fixes the reason and the kind list.
// The decision (kind, and the duration of a suspension) comes first.

import React, { useId } from 'react';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { FieldLabel, Input, Textarea } from '@/components/common/Field';
import { SanctionPreviewPanel } from '@/components/admin/SanctionPreviewPanel';
import { reasonLabel, ruleLabel } from '@/components/moderation/moderationLabels';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';
import {
  MAX_SANCTION_TEXT_LENGTH,
  MAX_SUSPENSION_DAYS,
  MIN_SUSPENSION_DAYS,
  RULE_REFS,
  SANCTION_REASONS,
  type RuleRef,
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
  /** Internal notes belong to the drawer, not to a report. */
  showInternal?: boolean;
  /** Whom the decision is about; when given, a preview of what they will be told closes the form. */
  previewTarget?: SanctionTarget;
  /** Shown right under the decision (the drawer puts its suggested next step there). */
  afterDecision?: React.ReactNode;
}

export function SanctionForm({
  draft,
  onChange,
  kinds,
  showReason = true,
  showInternal = true,
  previewTarget,
  afterDecision,
}: SanctionFormProps) {
  const dict = useDictionary();
  const t = dict.moderation.admin;
  const id = useId();
  const kindLabel: Record<SanctionKind, string> = {
    warning: t.kindWarning,
    suspension: t.kindSuspension,
    ban: t.kindBan,
  };
  const factsRequired = draft.kind !== 'warning';
  const hint = 'mt-1 type-micro text-text-muted';
  const trigger = 'w-full justify-between py-2.5';
  const kindOptions: DropdownOption<SanctionKind>[] = kinds.map((kind) => ({ value: kind, label: kindLabel[kind] }));
  const reasonOptions: DropdownOption<SanctionDraft['reason_code']>[] = SANCTION_REASONS.map((code) => ({
    value: code,
    label: reasonLabel(dict, code),
  }));
  const ruleOptions: DropdownOption<RuleRef | ''>[] = [
    { value: '', label: t.formRuleNone },
    ...RULE_REFS.map((ref) => ({ value: ref, label: ruleLabel(dict, ref) })),
  ];
  const isSuspension = draft.kind === 'suspension';

  const durationField = (
    <div>
      <FieldLabel htmlFor={`${id}-days`}>{t.formDuration}</FieldLabel>
      <div className="relative">
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
          className="pr-12 text-center"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center type-micro text-text-muted">
          {t.formDurationUnit}
        </span>
      </div>
      <p className={cn(hint, 'text-center')}>{MIN_SUSPENSION_DAYS}–{MAX_SUSPENSION_DAYS}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {kinds.length > 1 ? (
        <div className={cn('grid gap-3', isSuspension ? 'grid-cols-field-suffix' : 'grid-cols-1')}>
          <div className="min-w-0">
            <FieldLabel as="span">{t.formKind}</FieldLabel>
            <CustomDropdown<SanctionKind>
              value={draft.kind}
              options={kindOptions}
              onChange={(kind) => onChange({ kind })}
              ariaLabel={t.formKind}
              accent="primary"
              className="w-full"
              buttonClassName={trigger}
              menuClassName="w-full"
            />
          </div>
          {isSuspension && durationField}
        </div>
      ) : (
        isSuspension && durationField
      )}

      {afterDecision}

      <div className={cn('grid gap-3', showReason ? 'grid-cols-2' : 'grid-cols-1')}>
        {showReason && (
          <div className="min-w-0">
            <FieldLabel as="span">{t.formReason}</FieldLabel>
            <CustomDropdown<SanctionDraft['reason_code']>
              value={draft.reason_code}
              options={reasonOptions}
              onChange={(reason_code) => onChange({ reason_code })}
              ariaLabel={t.formReason}
              accent="primary"
              className="w-full"
              buttonClassName={trigger}
              menuClassName="w-full"
            />
          </div>
        )}
        <div className="min-w-0">
          <FieldLabel as="span">{t.formRule}</FieldLabel>
          <CustomDropdown<RuleRef | ''>
            value={draft.rule_ref}
            options={ruleOptions}
            onChange={(rule_ref) => onChange({ rule_ref })}
            ariaLabel={t.formRule}
            accent="primary"
            className="w-full"
            buttonClassName={trigger}
            menuClassName="w-full"
            minWidthClass="min-w-field-lg"
            align={showReason ? 'right' : 'left'}
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor={`${id}-facts`}>{t.formFacts}</FieldLabel>
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
        <div>
          <FieldLabel htmlFor={`${id}-internal`}>{t.formInternal}</FieldLabel>
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
      )}

      {previewTarget && (
        <SanctionPreviewPanel draft={draft} target={previewTarget} />
      )}
    </div>
  );
}
