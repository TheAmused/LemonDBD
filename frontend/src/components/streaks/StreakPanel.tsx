// frontend/src/components/streaks/StreakPanel.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface StreakPanelBaseProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  accentBorder: string;
}

type StreakPanelProps = StreakPanelBaseProps &
  ({ comingSoon: true; href?: never } | { comingSoon?: false; href: string });

export const StreakPanel: React.FC<StreakPanelProps> = ({
  title,
  description,
  icon: Icon,
  accent,
  accentBorder,
  href,
  comingSoon,
}) => {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentBorder} bg-slate-100 dark:bg-slate-900/60 shadow-sm`}>
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
        {comingSoon ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Coming soon
          </span>
        ) : (
          <ArrowRight className={`h-4 w-4 ${accent} transition-transform group-hover:translate-x-1`} />
        )}
      </div>

      <h3 className={`mt-4 text-sm font-extrabold tracking-wide ${comingSoon ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
        {title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
    </>
  );

  const base = `flex h-full flex-col rounded-2xl border p-5 backdrop-blur-sm transition-all shadow-sm ${accentBorder}`;

  if (comingSoon) {
    return <div className={`${base} bg-slate-100/50 dark:bg-slate-900/30 opacity-70`}>{body}</div>;
  }

  return (
    <Link
      href={href!}
      className={`group ${base} bg-white hover:bg-slate-50 dark:bg-slate-900/50 hover:border-orange-500/50 dark:hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-orange-500 hover:shadow-lg`}
    >
      {body}
    </Link>
  );
};
