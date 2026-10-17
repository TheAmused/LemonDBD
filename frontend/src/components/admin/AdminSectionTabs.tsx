'use client';
// frontend/src/components/admin/AdminSectionTabs.tsx
//
// The admin panel's sections. A dot on "Reports" means something is waiting for a decision; the
// numbers themselves live on the queue's filters, not here.
import React from 'react';
import { Power, ScrollText, Settings2, Users, Wrench } from 'lucide-react';
import { Tabs } from '@/components/common/Tabs';
import { UnreadDot } from '@/components/common/UnreadDot';
import { FogReportIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { AdminTab } from './adminTabs';

export const ADMIN_TABS_ID = 'admin-sections';

interface AdminSectionTabsProps {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
  reportsWaiting: boolean;
}

export function AdminSectionTabs({ activeTab, onChange, reportsWaiting }: AdminSectionTabsProps) {
  const t = useDictionary().admin;

  return (
    <Tabs<AdminTab>
      ariaLabel={t.adminSections}
      idBase={ADMIN_TABS_ID}
      value={activeTab}
      onChange={onChange}
      variant="underline"
      size="lg"
      tabs={[
        { value: 'users', icon: <Users className="h-4 w-4" aria-hidden="true" />, label: t.sectionUsers },
        {
          value: 'reports',
          icon: <FogReportIcon className="h-4 w-4" aria-hidden="true" />,
          label: (
            <span className="inline-flex items-center gap-2">
              {t.sectionReports}
              {reportsWaiting && <UnreadDot className="relative" label={t.needsAttention} />}
            </span>
          ),
        },
        { value: 'availability', icon: <Power className="h-4 w-4" aria-hidden="true" />, label: t.sectionAvailability },
        { value: 'audit', icon: <ScrollText className="h-4 w-4" aria-hidden="true" />, label: t.auditLog },
        { value: 'settings', icon: <Settings2 className="h-4 w-4" aria-hidden="true" />, label: t.sectionSettings },
        { value: 'tools', icon: <Wrench className="h-4 w-4" aria-hidden="true" />, label: t.sectionTools },
      ]}
    />
  );
}
