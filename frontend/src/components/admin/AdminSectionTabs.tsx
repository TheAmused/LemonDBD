'use client';
// frontend/src/components/admin/AdminSectionTabs.tsx
//
// The admin panel's sections. A dot on "Reports" means something is waiting for a decision; the
// numbers themselves live on the queue's filters, not here.
import React, { useRef, useState } from 'react';
import { ChevronDown, Flag, Power, ScrollText, Settings2, Users, Wrench } from 'lucide-react';
import { MenuItem } from '@/components/common/MenuItem';
import { Popover } from '@/components/common/Popover';
import { Tabs, tabId } from '@/components/common/Tabs';
import { UnreadDot } from '@/components/common/UnreadDot';
import { FogReportIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { AdminTab, ReportQueue } from './adminTabs';

export const ADMIN_TABS_ID = 'admin-sections';

interface AdminSectionTabsProps {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
  reportsWaiting: boolean;
  /** Which report queue is open, and how many of each wait for a decision. */
  queue?: ReportQueue;
  onQueueChange?: (queue: ReportQueue) => void;
  pending?: { bug_reports: number; content_reports: number } | null;
  className?: string;
}

export function AdminSectionTabs({
  activeTab,
  onChange,
  reportsWaiting,
  queue = 'bugs',
  onQueueChange,
  pending,
  className,
}: AdminSectionTabsProps) {
  const t = useDictionary().admin;
  const [menuOpen, setMenuOpen] = useState(false);
  // The Reports tab is the menu's anchor; it is looked up on click, so no ref needs to cross into <Tabs>.
  const anchorRef = useRef<HTMLElement | null>(null);

  const openReportsMenu = () => {
    anchorRef.current = document.getElementById(tabId(ADMIN_TABS_ID, 'reports'));
    setMenuOpen((open) => !open);
  };
  const pickQueue = (next: ReportQueue) => {
    onQueueChange?.(next);
    onChange('reports');
    setMenuOpen(false);
  };
  const queues: { value: ReportQueue; label: string; icon: React.ReactNode; waiting: number }[] = [
    { value: 'bugs', label: t.bugReportsLabel, icon: <FogReportIcon className="h-4 w-4" aria-hidden="true" />, waiting: pending?.bug_reports ?? 0 },
    { value: 'content', label: t.contentReportsLabel, icon: <Flag className="h-4 w-4" aria-hidden="true" />, waiting: pending?.content_reports ?? 0 },
  ];

  return (
    <>
      <Tabs<AdminTab>
        ariaLabel={t.adminSections}
        idBase={ADMIN_TABS_ID}
        value={activeTab}
        onChange={onChange}
        variant="underline"
        size="lg"
        className={className}
        tabs={[
          { value: 'users', icon: <Users className="h-4 w-4" aria-hidden="true" />, label: t.sectionUsers },
          {
            value: 'reports',
            icon: <FogReportIcon className="h-4 w-4" aria-hidden="true" />,
            label: (
              <span className="inline-flex items-center gap-2">
                {t.sectionReports}
                {reportsWaiting && <UnreadDot className="relative" label={t.needsAttention} />}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </span>
            ),
            buttonProps: { onClick: openReportsMenu, 'aria-haspopup': 'menu', 'aria-expanded': menuOpen },
          },
          { value: 'availability', icon: <Power className="h-4 w-4" aria-hidden="true" />, label: t.sectionAvailability },
          { value: 'audit', icon: <ScrollText className="h-4 w-4" aria-hidden="true" />, label: t.auditLog },
          { value: 'settings', icon: <Settings2 className="h-4 w-4" aria-hidden="true" />, label: t.sectionSettings },
          { value: 'tools', icon: <Wrench className="h-4 w-4" aria-hidden="true" />, label: t.sectionTools },
        ]}
      />
      <Popover
        open={menuOpen}
        anchorRef={anchorRef}
        onClose={() => setMenuOpen(false)}
        align="start"
        gap={6}
        role="menu"
        ariaLabel={t.sectionReports}
        className="min-w-[13rem] rounded-card border border-border-color bg-bg-surface p-1.5 shadow-xl backdrop-blur-2xl"
      >
        {queues.map((item) => (
          <MenuItem
            key={item.value}
            role="menuitem"
            selected={activeTab === 'reports' && queue === item.value}
            className="justify-between"
            onClick={() => pickQueue(item.value)}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
            {item.waiting > 0 && <UnreadDot className="relative" label={t.needsAttention} />}
          </MenuItem>
        ))}
      </Popover>
    </>
  );
}
