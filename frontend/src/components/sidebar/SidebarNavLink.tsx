// frontend/src/components/sidebar/SidebarNavLink.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export interface SidebarNavLinkProps {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  activeBg: string;
  href?: string;
  isActive: boolean;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
}

const SidebarNavLinkBase: React.FC<SidebarNavLinkProps> = ({
  id,
  label,
  icon: Icon,
  color,
  activeBg,
  href,
  isActive,
  badge,
  badgeColor = 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  onClick,
}) => {
  const commonClasses = `w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-red ${isActive
      ? activeBg
      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
    }`;

  const innerContent = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
        <span className="truncate">{label}</span>
      </div>
      {badge && (
        <span
          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-extrabold uppercase border ${badgeColor}`}
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
