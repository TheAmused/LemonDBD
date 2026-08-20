// frontend/src/components/streaks/StreakPanel.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { PANEL_HOVER_CLASSES, type PanelColor } from './panelColors';

interface StreakPanelBaseProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  accentBorder: string;
  color: PanelColor;
  image?: string;
}

type StreakPanelProps = StreakPanelBaseProps &
  ({ comingSoon: true; href?: never; onClick?: never } |
   { comingSoon?: false; href: string; onClick?: never } |
   { comingSoon?: false; href?: never; onClick: () => void });

export const StreakPanel: React.FC<StreakPanelProps> = ({
  title,
  description,
  icon: Icon,
  accent,
  accentBorder,
  color,
  image,
  href,
  onClick,
  comingSoon,
}) => {
  const hoverClasses = PANEL_HOVER_CLASSES[color];
  const body = (
    <>
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-2xl object-cover opacity-[0.08] dark:opacity-[0.18] [mask-image:radial-gradient(circle_at_bottom_right,black,transparent_75%)]"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        {image ? (
          <img
            src={image}
            alt=""
            className={`h-11 w-11 rounded-xl border ${accentBorder} object-cover shadow-sm`}
          />
        ) : (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentBorder} bg-slate-100 dark:bg-slate-900/60 shadow-sm`}>
            <Icon className={`h-5 w-5 ${accent}`} />
          </div>
        )}
        {comingSoon ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Coming soon
          </span>
        ) : (
          <ArrowRight className={`h-4 w-4 ${accent} transition-transform group-hover:translate-x-1`} />
        )}
      </div>

      <h3 className={`relative mt-4 text-sm font-extrabold tracking-wide ${comingSoon ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
        {title}
      </h3>
      <p className="relative mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
    </>
  );

  const base = `relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all shadow-sm ${accentBorder}`;

  if (comingSoon) {
    return <div className={`${base} bg-slate-100/50 dark:bg-slate-900/30 opacity-70`}>{body}</div>;
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`group text-left ${base} bg-white hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/80 focus:outline-none focus:ring-2 hover:shadow-lg cursor-pointer ${hoverClasses}`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={href!}
      className={`group ${base} bg-white hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/80 focus:outline-none focus:ring-2 hover:shadow-lg ${hoverClasses}`}
    >
      {body}
    </Link>
  );
};
