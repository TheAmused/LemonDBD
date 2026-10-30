// frontend/src/components/sidebar/SidebarNavGroup.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Collapsible } from '@/components/common/Collapsible';
import { DisclosureButton } from '@/components/common/DisclosureButton';
import { useIsClient } from '@/hooks/useIsClient';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { cn } from '@/utils/cn';
import { NAV_GROUP_BODY_CLASS, NAV_GROUP_STORAGE_PREFIX, releaseNavGroupBoot } from './navGroupBoot';
import { SIDEBAR_ROW, SIDEBAR_ROW_HOVER } from './SidebarNavLink';

export interface SidebarNavGroupProps {
  id: string;
  label: string;
  icon: React.ElementType;
  /** A page inside the group is open: the group unfolds when the visitor navigates into it, and its title is tinted. */
  hasActive: boolean;
  children: React.ReactNode;
}

/**
 * A foldable run of sidebar links under one title. The open state is remembered per group, so a reload
 * keeps what the visitor left; with nothing stored the group starts open only if its page is the current one.
 * Navigating into the group unfolds it so the active link is not hidden.
 */
export const SidebarNavGroup: React.FC<SidebarNavGroupProps> = ({ id, label, icon: Icon, hasActive, children }) => {
  const [open, toggle, setOpen] = usePersistentDrawer(`${NAV_GROUP_STORAGE_PREFIX}${id}`, hasActive);
  // Only a change into the group counts: on load a stored "folded" choice must survive.
  const wasActive = useRef(hasActive);
  useEffect(() => {
    if (hasActive && !wasActive.current) setOpen(true);
    wasActive.current = hasActive;
  }, [hasActive, setOpen]);
  // From the first client render on, React reads the stored state too, so the pre-paint style
  // (navGroupBoot) has done its job. Releasing is idempotent, so every group may call it.
  const isClient = useIsClient();
  useEffect(() => {
    if (isClient) releaseNavGroupBoot();
  }, [isClient]);
  return (
    <div data-nav-group={id}>
      <DisclosureButton
        open={open}
        onClick={toggle}
        className={cn(
          SIDEBAR_ROW, SIDEBAR_ROW_HOVER, 'justify-between transition-colors',
          hasActive ? 'text-accent-red' : 'text-text-primary'
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="icon-md shrink-0 text-accent-red" />
          <span className="truncate">{label}</span>
        </span>
      </DisclosureButton>
      <Collapsible open={open} className={NAV_GROUP_BODY_CLASS} contentClassName="ml-5 mt-1 space-y-1 border-l border-border-color pl-2">
        {children}
      </Collapsible>
    </div>
  );
};
