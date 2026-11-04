'use client';
// frontend/src/components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import type { ArchetypeRule, CustomRomanceArchetype } from '@/types/smashOrPass';
import { LABEL } from './styles';
import { Checkbox } from '@/components/common/Checkbox';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Field';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { useDictionary } from "@/context/DictionaryContext";
import { ToggleChip } from '@/components/common/ToggleChip';
import { Badge } from '@/components/common/Badge';
import { TierColorPicker } from '@/components/tier-lists/TierColorPicker';
import { paletteColor } from '@/utils/themeColor';
import { badgeGradientProps, encodeCustomGradient, parseCustomGradient } from '@/utils/smashOrPass/badgeGradient';
import { EmptyState } from '@/components/common/EmptyState';
import { genderLabel } from '@/utils/smashOrPass/terms';
import { Surface } from '@/components/common/Surface';

const COLOR_PRESETS = [
  { label: 'Crimson Ember', value: 'from-accent-red to-bg-primary' },
  { label: 'Golden Radiance', value: 'from-accent-amber to-bg-primary' },
  { label: 'Emerald Spirit', value: 'from-accent-green to-bg-primary' },
  { label: 'Amethyst Void', value: 'from-accent-purple to-bg-primary' },
  { label: 'Deep Cyan', value: 'from-accent-cyan to-bg-primary' },
  { label: 'Obsidian Fog', value: 'from-bg-surface to-bg-primary' },
];

const RULE_TARGETS: ArchetypeRule['target'][] = [
  'smash_rate',
  'total_votes',
  'role_affinity',
  'gender_affinity',
  'role_count',
  'gender_count',
];
const RULE_OPERATORS: ArchetypeRule['operator'][] = ['>=', '<=', '=='];

/** Smash rate and the affinities are percentages; the totals and counts are plain numbers. */
const isPercentTarget = (target: ArchetypeRule['target']) => target === 'smash_rate' || target.endsWith('_affinity');

/** A rule value as its target allows it: 0-100 for a percentage, any whole number otherwise. */
const capRuleValue = (target: ArchetypeRule['target'], value: number) => (isPercentTarget(target) ? Math.min(100, value) : value);

interface RomanceArchetypeBuilderProps {
  archetypes: CustomRomanceArchetype[];
  onChange: (archetypes: CustomRomanceArchetype[]) => void;
  availableRoles: string[];
  availableGenders: string[];
  embedded?: boolean;
}

export function RomanceArchetypeBuilder({ archetypes, onChange, availableRoles, availableGenders, embedded = false }: RomanceArchetypeBuilderProps) {
  const dict = useDictionary();
  const ab = dict.smashOrPass.archetypeBuilder;

  const [expandedId, setExpandedId] = useState<string | null>(archetypes[0]?.id || null);

  const targetLabels: Record<ArchetypeRule['target'], string> = {
    smash_rate: ab.smashRate,
    total_votes: ab.totalVotes,
    role_affinity: ab.roleAffinity,
    gender_affinity: ab.genderAffinity,
    role_count: ab.roleCount,
    gender_count: ab.genderCount,
  };
  const operatorLabels: Partial<Record<ArchetypeRule['operator'], string>> = { '>=': ab.opGte, '<=': ab.opLte, '==': ab.opEq };
  const targetOptions: DropdownOption<ArchetypeRule['target']>[] = RULE_TARGETS.map((value) => ({ value, label: targetLabels[value] }));
  const operatorOptions: DropdownOption<ArchetypeRule['operator']>[] = RULE_OPERATORS.map((value) => ({ value, label: operatorLabels[value] ?? value }));

  const addArchetype = () => {
    const newArch: CustomRomanceArchetype = {
      id: `archetype_${Date.now().toString(36)}`,
      title: '',
      subtitle: '',
      description: '',
      badge_color: 'from-accent-red to-bg-primary',
      rules: [
        {
          target: 'smash_rate',
          operator: '>=',
          value: 60,
        },
      ],
    };
    onChange([...archetypes, newArch]);
    setExpandedId(newArch.id);
  };

  const removeArchetype = (id: string) => {
    onChange(archetypes.filter((a) => a.id !== id));
  };

  const updateArchetype = (id: string, patch: Partial<CustomRomanceArchetype>) => {
    onChange(
      archetypes.map((a) => {
        if (a.id === id) return { ...a, ...patch };
        // There is one fallback: marking this archetype unmarks the previous one.
        return patch.is_fallback ? { ...a, is_fallback: false } : a;
      })
    );
  };

  const addRule = (archId: string) => {
    const arch = archetypes.find((a) => a.id === archId);
    if (!arch) return;
    const newRule: ArchetypeRule = {
      target: 'smash_rate',
      operator: '>=',
      value: 50,
    };
    updateArchetype(archId, { rules: [...arch.rules, newRule] });
  };

  const updateRule = (archId: string, ruleIdx: number, patch: Partial<ArchetypeRule>) => {
    const arch = archetypes.find((a) => a.id === archId);
    if (!arch) return;
    const nextRules = arch.rules.map((r, i) => (i === ruleIdx ? { ...r, ...patch } : r));
    updateArchetype(archId, { rules: nextRules });
  };

  const removeRule = (archId: string, ruleIdx: number) => {
    const arch = archetypes.find((a) => a.id === archId);
    if (!arch) return;
    updateArchetype(archId, { rules: arch.rules.filter((_, i) => i !== ruleIdx) });
  };

  return (
    <div className={cn(embedded ? 'space-y-4' : 'rounded-card border border-border-color bg-bg-surface p-4 sm:p-6 space-y-4')}>
      {!embedded && (
        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-text-primary">
          {ab.sectionTitle}
        </h3>
      )}
      <Surface tone="elevated" padding="none" className="flex items-start gap-2.5 p-3 bg-bg-elevated/50">
        <Info className="mt-0.5 icon-md shrink-0 text-accent-amber" aria-hidden="true" />
        <p className="type-body text-text-secondary">{ab.sectionDesc}</p>
      </Surface>

      {archetypes.length === 0 ? (
        <EmptyState variant="compact" title={ab.noArchetypes} />
      ) : (
        <div className="space-y-3">
          {archetypes.map((arch, idx) => {
            const isExpanded = expandedId === arch.id;

            return (
              <Surface
                key={arch.id}
                tone="elevated" padding="none" className="bg-bg-elevated/50 overflow-hidden transition-all"
              >
                {/* Accordion Bar: a full-size toggle button sits under the delete button. */}
                <div className="relative flex items-center justify-between p-3.5 sm:p-4 hover:bg-bg-elevated/80 transition-colors">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={arch.title || `${ab.titleLabel} #${idx + 1}`}
                    onClick={() => setExpandedId(isExpanded ? null : arch.id)}
                    className="absolute inset-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
                  />
                  <div className="pointer-events-none flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="type-strong-fluid text-text-primary truncate">
                          {arch.title || `${ab.titleLabel} #${idx + 1}`}
                        </span>
                        {arch.is_fallback && (
                          <Badge tone="amber" size="xs" square>
                            {ab.fallbackBadge}
                          </Badge>
                        )}
                      </div>
                      <p className="type-caption text-text-muted truncate">{arch.subtitle}</p>
                    </div>
                  </div>

                  <div className="pointer-events-none flex items-center gap-1.5 shrink-0 ml-2">
                    <Button
                      variant="ghost" size="sm" icon
                      className="pointer-events-auto relative"
                      aria-label={formatMessage(dict.smashOrPass.creator.removeCandidateAria, {
                        name: arch.title || `${ab.titleLabel} #${idx + 1}`,
                      })}
                      onClick={() => removeArchetype(arch.id)}
                    >
                      <Trash2 />
                    </Button>
                    <ChevronDown
                      className={cn(
                        'icon-md text-text-muted transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Form */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-border-color/60 space-y-5 bg-bg-surface/50">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={LABEL}>{ab.titleLabel}</label>
                        <Input
                          fieldSize="md"
                          value={arch.title}
                          onChange={(e) => updateArchetype(arch.id, { title: e.target.value })}
                          placeholder={ab.titlePlaceholder}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>{ab.subtitleLabel}</label>
                        <Input
                          fieldSize="md"
                          value={arch.subtitle}
                          onChange={(e) => updateArchetype(arch.id, { subtitle: e.target.value })}
                          placeholder={ab.subtitlePlaceholder}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL}>{ab.descriptionLabel}</label>
                      <Textarea
                        fieldSize="md"
                        value={arch.description}
                        onChange={(e) => updateArchetype(arch.id, { description: e.target.value })}
                        placeholder={ab.descriptionPlaceholder}
                        rows={3}
                      />
                    </div>

                    {/* Badge colour and fallback */}
                    <div className="space-y-3 border-t border-border-color/60 pt-4">
                      <span className={LABEL}>{ab.visualBadgeLabel}</span>

                      <div className="space-y-2">
                        <span className="type-strong-xs text-text-secondary block">{ab.badgeGradientColor}</span>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map((color) => (
                            <ToggleChip pressed={arch.badge_color === color.value} size="xs"
                              key={color.label}
                              onClick={() => updateArchetype(arch.id, { badge_color: color.value })}
                            >
                              <span className={cn('h-3 w-5 rounded-chip border border-border-color bg-gradient-to-br', color.value)} aria-hidden="true" />
                              {color.label}
                            </ToggleChip>
                          ))}
                          <ToggleChip pressed={parseCustomGradient(arch.badge_color) !== null} size="xs"
                            onClick={() =>
                              updateArchetype(arch.id, {
                                badge_color: encodeCustomGradient(
                                  parseCustomGradient(arch.badge_color) ?? {
                                    from: paletteColor('neon-crimson'),
                                    to: paletteColor('night-950'),
                                  }
                                ),
                              })
                            }
                          >
                            {ab.gradientCustom}
                          </ToggleChip>
                        </div>

                        {(() => {
                          const custom = parseCustomGradient(arch.badge_color);
                          return custom ? (
                            <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                              <div className="flex min-w-56 flex-1 flex-wrap items-center gap-2">
                                <span className="type-strong-xs text-text-secondary">{ab.gradientFrom}</span>
                                <TierColorPicker
                                  size="sm"
                                  color={custom.from}
                                  onChange={(hex) => updateArchetype(arch.id, { badge_color: encodeCustomGradient({ ...custom, from: hex }) })}
                                />
                              </div>
                              <div className="flex min-w-56 flex-1 flex-wrap items-center gap-2">
                                <span className="type-strong-xs text-text-secondary">{ab.gradientTo}</span>
                                <TierColorPicker
                                  size="sm"
                                  color={custom.to}
                                  onChange={(hex) => updateArchetype(arch.id, { badge_color: encodeCustomGradient({ ...custom, to: hex }) })}
                                />
                              </div>
                            </div>
                          ) : null;
                        })()}

                        {/* The badge as a player will see it */}
                        <div
                          className={cn('flex h-12 items-center rounded-control border border-border-color px-3', badgeGradientProps(arch.badge_color).className)}
                          style={badgeGradientProps(arch.badge_color).style}
                        >
                          <span className="type-strong truncate text-text-inverted">{arch.title || `${ab.titleLabel} #${idx + 1}`}</span>
                        </div>
                      </div>

                      <Checkbox
                        checked={arch.is_fallback || false}
                        onChange={(checked) => updateArchetype(arch.id, { is_fallback: checked })}
                        className="pt-1 type-strong text-text-secondary"
                      >
                        {ab.markAsFallback}
                      </Checkbox>
                      {!archetypes.some((a) => a.is_fallback) && (
                        <p className="type-caption text-text-muted">{ab.noFallbackNote}</p>
                      )}
                    </div>

                    {/* Rule Engine Conditions */}
                    <div className="space-y-2.5 border-t border-border-color/60 pt-4">
                      <div className="flex items-center justify-between">
                        <span className={LABEL}>{ab.rulesTitle}</span>
                        <Button
                          type="button"
                          onClick={() => addRule(arch.id)}
                          variant="linkDanger" size="sm"
                        >
                          <Plus />
                          <span>{ab.addCondition}</span>
                        </Button>
                      </div>

                      <p className="type-caption text-text-muted">{ab.rulesHint}</p>

                      <div className="divide-y divide-border-color/60">
                      {arch.rules.map((rule, rIdx) => (
                        <div
                          key={rIdx}
                          className="flex flex-wrap items-center gap-2 py-2.5 text-xs"
                        >
                          <CustomDropdown<ArchetypeRule['target']>
                            accent="primary"
                            ariaLabel={ab.rulesTitle}
                            value={rule.target}
                            options={targetOptions}
                            minWidthClass="min-w-48"
                            buttonClassName="min-h-9"
                            onChange={(target) => {
                              // A switch from a count (say 500 votes) to a percentage re-caps the value, so the rule can still match.
                              updateRule(arch.id, rIdx, { target, value: capRuleValue(target, rule.value) });
                            }}
                          />

                          {(rule.target === 'role_affinity' || rule.target === 'role_count') && (
                            <Input
                              fieldSize="sm"
                              value={rule.target_value || ''}
                              placeholder={ab.rolePlaceholder}
                              list={`roles-list-${arch.id}`}
                              onChange={(e) => updateRule(arch.id, rIdx, { target_value: e.target.value })}
                              className="w-auto max-w-32.5"
                            />
                          )}

                          {(rule.target === 'gender_affinity' || rule.target === 'gender_count') && (
                            <Input
                              fieldSize="sm"
                              value={rule.target_value || ''}
                              placeholder={ab.genderPlaceholder}
                              list={`genders-list-${arch.id}`}
                              onChange={(e) => updateRule(arch.id, rIdx, { target_value: e.target.value })}
                              className="w-auto max-w-32.5"
                            />
                          )}

                          <datalist id={`roles-list-${arch.id}`}>
                            {availableRoles.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </datalist>
                          <datalist id={`genders-list-${arch.id}`}>
                            {availableGenders.map((g) => (
                              <option key={g} value={g}>{genderLabel(g, dict.smashOrPass.filters)}</option>
                            ))}
                          </datalist>

                          <CustomDropdown<ArchetypeRule['operator']>
                            accent="primary"
                            ariaLabel={ab.rulesTitle}
                            value={rule.operator}
                            options={operatorOptions}
                            minWidthClass="min-w-36"
                            buttonClassName="min-h-9"
                            onChange={(operator) => updateRule(arch.id, rIdx, { operator })}
                          />

                          <Input
                            fieldSize="sm"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={String(rule.value)}
                            onChange={(e) => {
                              const digits = Number(e.target.value.replace(/\D/g, '').slice(0, 5));
                              updateRule(arch.id, rIdx, { value: capRuleValue(rule.target, digits) });
                            }}
                            className="w-16 text-center font-bold"
                          />

                          <Button
                            variant="ghost" size="xs" icon
                            onClick={() => removeRule(arch.id, rIdx)}
                            aria-label={ab.removeRule}
                            className="ml-auto"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                )}
              </Surface>
            );
          })}
        </div>
      )}

      <div className="flex justify-center pt-1">
        <Button variant="secondary" size="md" onClick={addArchetype}>
          <Plus />
          <span>{ab.addArchetype}</span>
        </Button>
      </div>
    </div>
  );
}
