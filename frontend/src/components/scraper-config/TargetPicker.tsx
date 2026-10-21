'use client';
// frontend/src/components/scraper-config/TargetPicker.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { useLocalizedTargets } from './useLocalizedTargets';
import { ALL_TARGETS, TARGET_GROUPS_CONFIG, type TargetItem } from './scraperTargets';

import { Button } from '@/components/common/Button';
import { InfoChip } from '@/components/common/InfoChip';
import { Checkbox } from '@/components/common/Checkbox';
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
  /** The ids this picker offers (purge offers fewer than export); every target when left out. */
  available?: readonly string[];
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
  available,
}: TargetPickerProps) {
  const dict = useDictionary();
  const allTargets = useLocalizedTargets();
  const localizedTargets = available ? allTargets.filter((t) => available.includes(t.id)) : allTargets;
  const total = available ? available.length : ALL_TARGETS.length;

  return (
    <>
      <div className="flex items-center justify-between pb-1 border-b border-border-color">
        <span className="type-label-xs text-text-secondary">{heading}</span>
        <Button
          type="button"
          onClick={onToggleAll}
          variant="link" size="sm"
        >
          {selected.length === total
            ? dict.admin.deselectAll
            : dict.admin.selectAll}
        </Button>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {TARGET_GROUPS_CONFIG.map((group) => {
          const groupTargets = localizedTargets.filter((t) => t.category === group.key);
          if (groupTargets.length === 0) return null;
          const selectedInGroup = groupTargets.filter((t) => selected.includes(t.id));
          const allGroupSelected = selectedInGroup.length === groupTargets.length && groupTargets.length > 0;
          const GroupIcon = group.icon;
          const groupLabel = dict.admin?.[group.labelKey] || group.fallbackLabel;

          return (
            <div key={group.key} className="rounded-card border border-border-color bg-bg-primary/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GroupIcon className="h-3.5 w-3.5 text-accent-red" />
                  <span className="type-label-xs text-text-primary">{groupLabel}</span>
                  <InfoChip>
                    {selectedInGroup.length}/{groupTargets.length}
                  </InfoChip>
                </div>
                <Button
                  type="button"
                  onClick={() => onToggleGroup(group.key)}
                  variant="link" size="xs"
                >
                  {allGroupSelected ? dict.admin.deselectAll : dict.admin.selectAll}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupTargets.map((target) => {
                  const isSelected = selected.includes(target.id);
                  return (
                    <Checkbox
                      key={target.id}
                      checked={isSelected}
                      onChange={() => onToggleTarget(target.id)}
                      boxClassName="sr-only"
                      className={`flex items-start gap-2.5 p-2.5 rounded-card border transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-red ${
                        isSelected
                          ? 'border-accent-red/50 bg-accent-red/10 text-accent-red'
                          : 'border-border-color bg-bg-surface hover:border-border-subtle'
                      }`}
                    >
                      <span className="pt-0.5" aria-hidden="true">
                        {isSelected ? (
                          <SelectedIcon className="h-4 w-4 text-accent-red" />
                        ) : (
                          <UnselectedIcon className="h-4 w-4 text-text-muted" />
                        )}
                      </span>
                      <span>
                        <span className="block type-strong">{target.label}</span>
                        <span className="block type-micro text-text-muted line-clamp-1">{target.desc}</span>
                      </span>
                    </Checkbox>
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
