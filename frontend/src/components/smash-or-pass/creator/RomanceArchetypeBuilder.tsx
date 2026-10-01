// frontend/src/components/smash-or-pass/creator/RomanceArchetypeBuilder.tsx
'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  Flame,
  Skull,
  Heart,
  Zap,
  Shield,
  Compass,
  Link as LinkIcon,
  Palette,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ArchetypeRule, CustomRomanceArchetype } from '@/types/smashOrPass';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, LABEL, TEXTAREA_FIELD } from './styles';

const ICON_PRESETS: Array<{ name: string; icon: React.ComponentType<{ className?: string }> }> = [
  { name: 'sparkles', icon: Sparkles },
  { name: 'heart', icon: Heart },
  { name: 'flame', icon: Flame },
  { name: 'skull', icon: Skull },
  { name: 'zap', icon: Zap },
  { name: 'shield', icon: Shield },
  { name: 'compass', icon: Compass },
];

const COLOR_PRESETS = [
  { label: 'Crimson Ember', value: 'from-accent-red to-bg-primary' },
  { label: 'Golden Radiance', value: 'from-accent-amber to-bg-primary' },
  { label: 'Emerald Spirit', value: 'from-accent-green to-bg-primary' },
  { label: 'Amethyst Void', value: 'from-purple-600 to-bg-primary' },
  { label: 'Deep Cyan', value: 'from-cyan-600 to-bg-primary' },
  { label: 'Obsidian Fog', value: 'from-bg-surface to-bg-primary' },
];

interface RomanceArchetypeBuilderProps {
  archetypes: CustomRomanceArchetype[];
  onChange: (archetypes: CustomRomanceArchetype[]) => void;
  availableRoles: string[];
  availableGenders: string[];
  embedded?: boolean;
}

export function RomanceArchetypeBuilder({
  archetypes,
  onChange,
  availableRoles,
  availableGenders,
  embedded = false,
}: RomanceArchetypeBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(archetypes[0]?.id || null);

  const addArchetype = () => {
    const nextNum = archetypes.length + 1;
    const newArch: CustomRomanceArchetype = {
      id: `archetype_${Date.now().toString(36)}`,
      title: `Custom Archetype ${nextNum}`,
      subtitle: 'Personality diagnosis and trial desire summary',
      description: 'Explain what loving this combination of candidates says about the player.',
      badge_color: 'from-accent-red to-bg-primary',
      icon_name: 'heart',
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
    onChange(archetypes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
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
    <div className={cn(embedded ? 'space-y-4' : 'rounded-3xl border border-border-color bg-bg-surface p-4 sm:p-6 space-y-4')}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {!embedded && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent-red" />
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider font-mono text-text-primary">
                Custom Romance Archetypes & Personality Rules
              </h3>
            </div>
          )}
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed font-mono">
            Define custom romance personas and conditional rules evaluated dynamically during the match.
          </p>
        </div>
        <button
          type="button"
          onClick={addArchetype}
          className={cn(BTN_SECONDARY, 'self-start sm:self-auto')}
        >
          <Plus className="h-4 w-4" />
          <span>Add Archetype</span>
        </button>
      </div>

      {archetypes.length === 0 ? (
        <div className="p-4 rounded-2xl border border-dashed border-border-color text-center text-xs text-text-muted font-mono">
          No custom romance archetypes defined. The roster will use standard default Fog archetypes.
        </div>
      ) : (
        <div className="space-y-3">
          {archetypes.map((arch, idx) => {
            const isExpanded = expandedId === arch.id;

            return (
              <div
                key={arch.id}
                className="rounded-2xl border border-border-color bg-bg-elevated/50 overflow-hidden transition-all"
              >
                {/* Accordion Bar */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : arch.id)}
                  className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer hover:bg-bg-elevated/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-primary border border-border-color overflow-hidden">
                      {arch.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={arch.icon_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Heart className="h-4 w-4 text-accent-red" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-text-primary font-mono truncate">
                          {arch.title || `Archetype ${idx + 1}`}
                        </span>
                        {arch.is_fallback && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                            Fallback
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted truncate">{arch.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeArchetype(arch.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-text-muted transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Form */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-border-color/60 space-y-4 bg-bg-surface/50">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={LABEL}>Archetype Title</label>
                        <input
                          value={arch.title}
                          onChange={(e) => updateArchetype(arch.id, { title: e.target.value })}
                          placeholder="e.g. The Eldritch Devotee"
                          className={FIELD}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>Subtitle / Tagline</label>
                        <input
                          value={arch.subtitle}
                          onChange={(e) => updateArchetype(arch.id, { subtitle: e.target.value })}
                          placeholder="e.g. Drawn to dangerous, unearthly power"
                          className={FIELD}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL}>Persona Description & Dating Analysis</label>
                      <textarea
                        value={arch.description}
                        onChange={(e) => updateArchetype(arch.id, { description: e.target.value })}
                        placeholder="Detailed narrative summary displayed when a player unlocks this archetype..."
                        rows={3}
                        className={TEXTAREA_FIELD}
                      />
                    </div>

                    {/* Icon & Custom URL Configuration */}
                    <div className="rounded-2xl border border-border-color bg-bg-primary/40 p-3.5 space-y-3">
                      <span className={LABEL}>Visual Badge & Icon</span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Preset Icon Choice */}
                        <div>
                          <label className="text-[11px] font-bold text-text-secondary block mb-1">
                            Choose an Icon Preset
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {ICON_PRESETS.map((p) => {
                              const PIcon = p.icon;
                              const isSelected = arch.icon_name === p.name && !arch.icon_url;
                              return (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() => updateArchetype(arch.id, { icon_name: p.name, icon_url: undefined })}
                                  className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-xl border transition-all cursor-pointer',
                                    isSelected
                                      ? 'border-accent-red bg-accent-red/20 text-accent-red'
                                      : 'border-border-color text-text-muted hover:text-text-primary'
                                  )}
                                >
                                  <PIcon className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Icon Image URL */}
                        <div>
                          <label className="text-[11px] font-bold text-text-secondary block mb-1">
                            Or Custom Icon / Image URL
                          </label>
                          <div className="relative">
                            <input
                              value={arch.icon_url || ''}
                              onChange={(e) => updateArchetype(arch.id, { icon_url: e.target.value })}
                              placeholder="https://... or data:image"
                              className={cn(FIELD, 'pl-8 text-xs')}
                            />
                            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                          </div>
                        </div>
                      </div>

                      {/* Badge Color Presets */}
                      <div className="pt-2">
                        <label className="text-[11px] font-bold text-text-secondary block mb-1">
                          Badge Gradient / Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map((color) => (
                            <button
                              key={color.label}
                              type="button"
                              onClick={() => updateArchetype(arch.id, { badge_color: color.value })}
                              className={cn(
                                'text-[11px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer font-mono font-bold',
                                arch.badge_color === color.value
                                  ? 'border-accent-red bg-accent-red/20 text-text-primary'
                                  : 'border-border-color bg-bg-surface text-text-muted hover:text-text-primary'
                              )}
                            >
                              {color.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`fallback-${arch.id}`}
                          checked={arch.is_fallback || false}
                          onChange={(e) => updateArchetype(arch.id, { is_fallback: e.target.checked })}
                          className="h-4 w-4 rounded border-border-color accent-accent-red cursor-pointer"
                        />
                        <label
                          htmlFor={`fallback-${arch.id}`}
                          className="text-xs font-bold text-text-secondary cursor-pointer select-none"
                        >
                          Mark as Fallback Default Archetype (used when no specific rule conditions are met)
                        </label>
                      </div>
                    </div>

                    {/* Rule Engine Conditions */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={LABEL}>Evaluation Rules & Triggers</span>
                        <button
                          type="button"
                          onClick={() => addRule(arch.id)}
                          className="text-xs font-bold text-accent-red hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Add Condition
                        </button>
                      </div>

                      {arch.rules.map((rule, rIdx) => (
                        <div
                          key={rIdx}
                          className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-border-color bg-bg-primary/50 text-xs"
                        >
                          <select
                            value={rule.target}
                            onChange={(e) =>
                              updateRule(arch.id, rIdx, {
                                target: e.target.value as ArchetypeRule['target'],
                              })
                            }
                            className="bg-bg-surface border border-border-color rounded-lg px-2 py-1 text-text-primary font-bold"
                          >
                            <option value="smash_rate">Smash Rate (%)</option>
                            <option value="total_votes">Total Votes Count</option>
                            <option value="role_affinity">Role Affinity (%)</option>
                            <option value="gender_affinity">Gender Affinity (%)</option>
                            <option value="role_count">Smashed Role Count</option>
                            <option value="gender_count">Smashed Gender Count</option>
                          </select>

                          {(rule.target === 'role_affinity' || rule.target === 'role_count') && (
                            <input
                              value={rule.target_value || ''}
                              placeholder="Role (e.g. Villain, Survivor)"
                              list={`roles-list-${arch.id}`}
                              onChange={(e) => updateRule(arch.id, rIdx, { target_value: e.target.value })}
                              className="bg-bg-surface border border-border-color rounded-lg px-2 py-1 text-text-primary max-w-[130px]"
                            />
                          )}

                          {(rule.target === 'gender_affinity' || rule.target === 'gender_count') && (
                            <input
                              value={rule.target_value || ''}
                              placeholder="Gender (e.g. ABC, female)"
                              list={`genders-list-${arch.id}`}
                              onChange={(e) => updateRule(arch.id, rIdx, { target_value: e.target.value })}
                              className="bg-bg-surface border border-border-color rounded-lg px-2 py-1 text-text-primary max-w-[130px]"
                            />
                          )}

                          <datalist id={`roles-list-${arch.id}`}>
                            {availableRoles.map((r) => (
                              <option key={r} value={r} />
                            ))}
                          </datalist>
                          <datalist id={`genders-list-${arch.id}`}>
                            {availableGenders.map((g) => (
                              <option key={g} value={g} />
                            ))}
                          </datalist>

                          <select
                            value={rule.operator}
                            onChange={(e) =>
                              updateRule(arch.id, rIdx, {
                                operator: e.target.value as ArchetypeRule['operator'],
                              })
                            }
                            className="bg-bg-surface border border-border-color rounded-lg px-2 py-1 text-text-primary font-bold"
                          >
                            <option value=">=">&gt;= (at least)</option>
                            <option value="<=">&lt;= (at most)</option>
                            <option value="==">== (exact)</option>
                          </select>

                          <input
                            type="number"
                            value={rule.value}
                            onChange={(e) =>
                              updateRule(arch.id, rIdx, { value: Number(e.target.value) || 0 })
                            }
                            className="w-16 bg-bg-surface border border-border-color rounded-lg px-2 py-1 text-text-primary font-bold text-center"
                          />

                          <button
                            type="button"
                            onClick={() => removeRule(arch.id, rIdx)}
                            className="ml-auto text-text-muted hover:text-accent-red p-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
