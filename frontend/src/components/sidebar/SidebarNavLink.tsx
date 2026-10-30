// frontend/src/components/sidebar/SidebarNavLink.tsx
'use client';

import React from 'react';
import Link from 'next/link';


/** The look every sidebar row shares, links and group titles alike. */
export const SIDEBAR_ROW = 'w-full px-3.5 py-2 type-strong';
export const SIDEBAR_ROW_HOVER = 'hover:bg-bg-sidebar-hover hover:text-accent-red';

const ICON_COLOR = 'text-accent-red';
const ACTIVE_CLASSES = 'bg-accent-red/10 text-accent-red border border-accent-red/20';

export interface SidebarNavLinkProps {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  isActive: boolean;
  badge?: string;
  badgeColor?: string;
  /** For a button that opens a dialog instead of going to a page. */
  hasPopup?: 'dialog';
  onClick?: () => void;
}

const SidebarNavLinkBase: React.FC<SidebarNavLinkProps> = ({
  label,
  icon: Icon,
  href,
  isActive,
  badge,
  badgeColor = 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  hasPopup,
  onClick,
}) => {
  const commonClasses = `${SIDEBAR_ROW} flex items-center justify-between rounded-control transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red ${isActive
      ? ACTIVE_CLASSES
      : `text-text-primary ${SIDEBAR_ROW_HOVER}`
    }`;

  const innerContent = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`icon-md shrink-0 ${ICON_COLOR}`} />
        <span className="truncate">{label}</span>
      </div>
      {badge && (
        <span
          className={`shrink-0 rounded-chip px-1 py-0.5 text-micro font-extrabold uppercase border ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        onClick={onClick}
        className={commonClasses}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      aria-haspopup={hasPopup}
      onClick={onClick}
      className={commonClasses}
    >
      {innerContent}
    </button>
  );
};

/** Memoised: the sidebar re-renders with every page, but these props
    only change when the route or the dictionary does. */
export const SidebarNavLink = React.memo(SidebarNavLinkBase);
