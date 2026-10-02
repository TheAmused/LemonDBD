'use client';
// frontend/src/components/user/UserBugReportsDrawer.tsx

import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { UserBugReportsList } from './UserBugReportsList';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import type { UserBugReport } from '@/types/userProfile';
import type { Dictionary } from '@/locales/types';

interface UserBugReportsDrawerProps {
  reports: UserBugReport[];
  loading: boolean;
  onOpenReportModal: () => void;
  dict?: Dictionary | null;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const UserBugReportsDrawer: React.FC<UserBugReportsDrawerProps> = ({
  reports,
  loading,
  onOpenReportModal,
  dict,
  total,
  page,
  perPage,
  totalPages,
  onPageChange,
}) => {
  const [isExpanded, toggleExpanded] = usePersistentDrawer('lemondbd_drawer_bugs', false);

  const getSubtitle = () => {
    if (total === 0) {
      return dict?.user?.noReportsTitle || 'No Bug Reports Submitted';
    }
    if (total === 1) {
      return '1 report submitted';
    }
    return `${total} reports submitted`;
  };

  return (
    <div className="rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors flex flex-col">
      {/* Connected Header with Collapsible Drawer Toggle */}
      <div className="relative w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4 px-5 sm:py-4.5 sm:px-7 2xl:py-5.5 2xl:px-9 group select-none overflow-hidden transition-colors text-left">
        {/* Atmospheric DBD Banner Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-30 mix-blend-luminosity filter pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
          style={{ backgroundImage: "url('/images/banners/banner_bugs.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-label={dict?.user?.tabBugReports || 'My Bug Reports'}
          className="absolute inset-0 z-[1] cursor-pointer"
        />

        <div aria-hidden="true" />
        <div className="relative z-10 text-center pointer-events-none">
          <h2 className="text-xs sm:text-sm 2xl:text-base font-black uppercase tracking-widest text-text-primary group-hover:text-accent-red transition-colors">
            {dict?.user?.tabBugReports || 'My Bug Reports'}
          </h2>
          <p className="text-[11px] sm:text-xs 2xl:text-sm text-text-secondary mt-0.5">
            {getSubtitle()}
          </p>
        </div>
        <div className="relative z-10 flex items-center justify-end gap-3 shrink-0 pointer-events-none">
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenReportModal}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="relative z-[2] pointer-events-auto h-7 py-0 text-xs"
          >
            <span>{dict?.user?.reportNewBug || 'Report New Bug'}</span>
          </Button>
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 2xl:h-6 2xl:w-6 text-accent-red transition-transform duration-300 ease-in-out ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      </div>

      {/* Connected Bug Reports List Drawer */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 sm:p-4 border-t border-border-color">
            <UserBugReportsList
              reports={reports}
              loading={loading}
              onOpenReportModal={onOpenReportModal}
              dict={dict ?? undefined}
              total={total}
              page={page}
              perPage={perPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              hideHeading={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
