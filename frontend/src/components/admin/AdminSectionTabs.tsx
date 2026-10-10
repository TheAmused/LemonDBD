'use client';
// frontend/src/components/admin/AdminSectionTabs.tsx
import React from 'react';
import { BarChart3, ScrollText, Settings2, ShieldAlert, Users } from 'lucide-react';
import { Tabs } from '@/components/common/Tabs';
import { useDictionary } from '@/context/DictionaryContext';
import { FogReportIcon } from '@/components/icons/DbdIcons';
import type { AdminTab } from './adminTabs';

interface AdminSectionTabsProps {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
  totalUsers: number;
  pendingBugs: number;
}

/** The admin panel's section switcher. */
export function AdminSectionTabs({ activeTab, onChange, totalUsers, pendingBugs }: AdminSectionTabsProps) {
  const dict = useDictionary();

  return (
    <Tabs
      ariaLabel={dict.admin.adminSections}
      value={activeTab}
      onChange={onChange}
      panels={false}
      variant="pill"
      size="lg"
      wrap
      className="border-b border-border-color pb-2"
      tabClassName="flex-1 sm:flex-initial"
      tabs={[
        {
          value: 'users',
          icon: <Users className="h-4 w-4" />,
          label: dict.admin.userDirectoryLabel,
          count: totalUsers,
        },
        {
          value: 'bugs',
          icon: <FogReportIcon className="h-4 w-4" />,
          label: `${dict.admin.bugReportsLabel} (${pendingBugs} ${dict.admin.pending})`,
        },
        { value: 'challenges', icon: <ShieldAlert className="h-4 w-4" />, label: dict.admin.killSwitches },
        { value: 'challenge_stats', icon: <BarChart3 className="h-4 w-4" />, label: dict.admin.challengeStats },
        { value: 'audit', icon: <ScrollText className="h-4 w-4" />, label: dict.admin.auditLog },
        { value: 'settings', icon: <Settings2 className="h-4 w-4" />, label: dict.admin.configTab },
      ]}
    />
  );
}
