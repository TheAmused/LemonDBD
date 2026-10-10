'use client';
// frontend/src/components/scraper-config/TargetPicker.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { useLocalizedTargets } from './useLocalizedTargets';
import { ALL_TARGETS, TARGET_GROUPS_CONFIG, type TargetItem } from './scraperTargets';

interface TargetPickerProps {
  heading: string;
  selected: string[];
  /** Icon drawn on a selected row. */
  SelectedIcon: LucideIcon;
  /** Unselected rows always show the plain square. */
  UnselectedIcon: LucideIcon;
  onToggleAll: () => void;
  onToggleGroup: (groupKey: TargetItem['category']) => void;
  onToggleTarget: (id: string) => void;
}

/** Heading + select-all, then every target grouped by category with per-group select-all. */
export function TargetPicker({
  heading,
  selected,
  SelectedIcon,
  UnselectedIcon,
  onToggleAll,
  onToggleGroup,
  onToggleTarget,
}: TargetPickerProps) {
  const dict = useDictionary();
  const localizedTargets = useLocalizedTargets();

  return (
    <>
      <div className="flex items-center justify-between pb-1 border-b border-border-color">
        <span className="type-label-xs text-text-secondary">{heading}</span>
        <button
          type="button"
          onClick={onToggleAll}
          className="type-strong text-accent-amber hover:underline cursor-pointer"
        >
          {selected.length === ALL_TARGETS.length
            ? dict.admin.deselectAll
            : dict.admin.selectAll}
        </button>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {TARGET_GROUPS_CONFIG.map((group) => {
          const groupTargets = localizedTargets.filter((t) => t.category === group.key);
          const selectedInGroup = groupTargets.filter((t) => selected.includes(t.id));
          const allGroupSelected = selectedInGroup.length === groupTargets.length && groupTargets.length > 0;
          const GroupIcon = group.icon;
          const groupLabel = dict.admin?.[group.labelKey] || group.fallbackLabel;

          return (
            <div key={group.key} className="rounded-xl border border-border-color bg-bg-primary/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GroupIcon className="h-3.5 w-3.5 text-accent-red" />
                  <span className="type-label-xs text-text-primary">{groupLabel}</span>
                  <span className="rounded-md bg-bg-surface px-1.5 py-0.5 type-strong-2xs text-text-secondary border border-border-color">
                    {selectedInGroup.length}/{groupTargets.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleGroup(group.key)}
                  className="type-strong-xs text-accent-amber hover:underline cursor-pointer"
                >
                  {allGroupSelected ? dict.admin.deselectAll : dict.admin.selectAll}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupTargets.map((target) => {
                  const isSelected = selected.includes(target.id);
                  return (
                    <div
                      key={target.id}
                      onClick={() => onToggleTarget(target.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-accent-red/50 bg-accent-red/10 text-accent-red'
                          : 'border-border-color bg-bg-surface hover:border-border-subtle'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isSelected ? (
                          <SelectedIcon className="h-4 w-4 text-accent-red" />
                        ) : (
                          <UnselectedIcon className="h-4 w-4 text-text-muted" />
                        )}
                      </div>
                      <div>
                        <p className="type-strong">{target.label}</p>
                        <p className="type-micro text-text-muted line-clamp-1">{target.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
