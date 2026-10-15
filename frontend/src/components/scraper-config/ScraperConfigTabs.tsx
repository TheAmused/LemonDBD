'use client';
// frontend/src/components/scraper-config/ScraperConfigTabs.tsx
import React from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import type { ScraperTab } from './scraperTargets';
import { SegmentedControl } from '@/components/common/SegmentedControl';

interface ScraperConfigTabsProps {
  activeTab: ScraperTab;
  onChange: (tab: ScraperTab) => void;
}

export function ScraperConfigTabs({ activeTab, onChange }: ScraperConfigTabsProps) {
  const dict = useDictionary();
  const tabs = [
    { id: 'export' as const, Icon: Download, iconClass: 'text-accent-red', label: dict.admin.exportJson },
    { id: 'import' as const, Icon: Upload, iconClass: 'text-accent-green', label: dict.admin.importJson },
    { id: 'purge' as const, Icon: Trash2, iconClass: 'text-accent-red', label: dict.admin.purgeReset },
  ];

  return (
    <SegmentedControl<ScraperTab>
      ariaLabel={dict.admin.exportJson}
      size="sm"
      value={activeTab}
      onChange={onChange}
      className="w-full"
      options={tabs.map(({ id, Icon, iconClass, label }) => ({
        value: id,
        label,
        icon: <Icon className={`h-3.5 w-3.5 ${iconClass}`} />,
        activeClassName: 'bg-bg-surface text-text-primary border border-border-color',
        activeTextColor: 'text-text-primary',
      }))}
    />
  );
}
