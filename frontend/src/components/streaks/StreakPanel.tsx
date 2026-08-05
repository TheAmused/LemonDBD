import React from 'react';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface StreakPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  accentBorder: string;
  href?: string;
  comingSoon?: boolean;
}

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
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentBorder} bg-slate-900/60`}>
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
        {comingSoon ? (
          <span className="rounded-full border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Coming soon
          </span>
        ) : (
          <ArrowRight className={`h-4 w-4 ${accent} transition-transform group-hover:translate-x-1`} />
        )}
      </div>

      <h3 className={`mt-4 text-sm font-extrabold tracking-wide ${comingSoon ? 'text-slate-400' : 'text-slate-100'}`}>
        {title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
    </>
  );

  const base = `flex h-full flex-col rounded-2xl border p-5 backdrop-blur-sm transition-all ${accentBorder}`;

  if (comingSoon || !href) {
    return <div className={`${base} bg-slate-900/30 opacity-70`}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={`group ${base} bg-slate-900/50 hover:border-orange-500/50 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-orange-500`}
    >
      {body}
    </Link>
  );
};
