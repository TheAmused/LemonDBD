'use client';
// frontend/src/components/user/UserBugReportsDrawer.tsx

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { UnreadDot } from '@/components/common/UnreadDot';
import { UserBugReportsList } from './UserBugReportsList';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import type { UserBugReport } from '@/types/userProfile';
import { useDictionary } from "@/context/DictionaryContext";
import { AccordionSection } from '@/components/common/AccordionSection';

interface UserBugReportsDrawerProps {
  reports: UserBugReport[];
  loading: boolean;
  onOpenReportModal: () => void;
  total: number;
  unreadCount: number;
  page: number;
  perPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onReportSeen: (id: number) => void;
}

export const UserBugReportsDrawer: React.FC<UserBugReportsDrawerProps> = ({ reports, loading, onOpenReportModal, total, unreadCount, page, perPage, totalPages, onPageChange, onReportSeen }) => {
  const dict = useDictionary();
  const [isExpanded, toggleExpanded] = usePersistentDrawer('lemondbd_drawer_bugs', false);

  return (
    <AccordionSection
      title={dict.user.tabBugReports}
      open={isExpanded}
      onToggle={toggleExpanded}
      banner="/images/banners/banner_bugs.webp"
      titleAddon={unreadCount > 0 ? <UnreadDot className="absolute -right-4 top-0" label={dict.user.newFeedback} /> : null}
      headerAction={<Button variant="primary" size="sm" onClick={onOpenReportModal} leftIcon={<Plus className="h-3.5 w-3.5" />} className="h-7 py-0 text-xs"><span>{dict.user.reportNewBug}</span></Button>}
      bodyClassName="p-3 sm:p-4"
    >
      <UserBugReportsList
        reports={reports}
        loading={loading}
        onOpenReportModal={onOpenReportModal}
        total={total}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onReportSeen={onReportSeen}
        hideHeading={true}
      />
    </AccordionSection>
  );
};
