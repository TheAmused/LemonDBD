'use client';
// frontend/src/components/scraper-config/ScraperConfigTabs.tsx
import React from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import type { ScraperTab } from './scraperTargets';

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
    <div className="flex items-center gap-1 rounded-xl bg-bg-primary p-1 border border-border-color">
      {tabs.map(({ id, Icon, iconClass, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === id
              ? 'bg-bg-surface text-text-primary shadow-xs border border-border-color'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
