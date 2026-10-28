// frontend/src/components/sidebar/SidebarNavGroup.tsx
'use client';

import React, { useState } from 'react';
import { Collapsible } from '@/components/common/Collapsible';
import { DisclosureButton } from '@/components/common/DisclosureButton';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import { cn } from '@/utils/cn';
import { SIDEBAR_ROW, SIDEBAR_ROW_HOVER } from './SidebarNavLink';

export interface SidebarNavGroupProps {
  id: string;
  label: string;
  icon: React.ElementType;
  /** A page inside the group is open: the group unfolds, so the active link is never hidden, and its title is tinted. */
  hasActive: boolean;
  children: React.ReactNode;
}

/**
 * A foldable run of sidebar links under one title. It unfolds when the visitor enters one of its
 * pages and otherwise stays as they left it; the sidebar stays mounted across pages, so the state holds.
 */
export const SidebarNavGroup: React.FC<SidebarNavGroupProps> = ({ label, icon: Icon, hasActive, children }) => {
  const [open, setOpen] = useState(hasActive);
  useOnValueChange(hasActive, (active) => {
    if (active) setOpen(true);
  });
  return (
    <div>
      <DisclosureButton
        open={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          SIDEBAR_ROW, SIDEBAR_ROW_HOVER, 'justify-between transition-colors',
          hasActive ? 'text-accent-red' : 'text-text-primary'
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="h-4 w-4 shrink-0 text-accent-red" />
          <span className="truncate">{label}</span>
        </span>
      </DisclosureButton>
      <Collapsible open={open} contentClassName="ml-5 mt-1 space-y-1 border-l border-border-color pl-2">
        {children}
      </Collapsible>
    </div>
  );
};
