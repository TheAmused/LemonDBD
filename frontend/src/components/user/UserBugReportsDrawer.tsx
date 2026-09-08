'use client';
// frontend/src/components/user/UserBugReportsDrawer.tsx

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
    <div className="rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors">
      {/* Connected Header with Collapsible Drawer Toggle */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="relative w-full flex items-center justify-between py-3.5 px-5 sm:py-4 sm:px-6 cursor-pointer group select-none overflow-hidden transition-colors text-left"
        aria-expanded={isExpanded}
      >
        {/* Atmospheric DBD Banner Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-30 mix-blend-luminosity filter pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
          style={{ backgroundImage: "url('/images/banners/banner_bugs.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

        <div className="relative z-10 w-8 hidden sm:block" aria-hidden="true" />
        <div className="relative z-10 flex-1 text-center">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text-primary font-mono group-hover:text-accent-red transition-colors">
            {dict?.user?.tabBugReports || 'My Bug Reports'}
          </h2>
          <p className="text-[11px] text-text-secondary mt-0.5 font-mono">
            {getSubtitle()}
          </p>
        </div>
        <div className="relative z-10 w-8 flex justify-end">
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 text-accent-red transition-transform duration-300 ease-in-out ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      </button>

      {/* Connected Bug Reports List Drawer */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 sm:p-5 border-t border-border-color">
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
