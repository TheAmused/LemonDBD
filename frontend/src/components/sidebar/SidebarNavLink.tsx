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

export const SidebarNavLink: React.FC<SidebarNavLinkProps> = ({
  id,
  label,
  icon: Icon,
  color,
  activeBg,
  href,
  isActive,
  badge,
  badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  onClick,
}) => {
  const commonClasses = `w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${isActive
      ? activeBg
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200'
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