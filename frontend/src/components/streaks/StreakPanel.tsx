// frontend/src/components/streaks/StreakPanel.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, type LucideIcon } from 'lucide-react';
import { PANEL_HOVER_CLASSES, type PanelColor } from './panelColors';
import { DisabledReasonModal } from '@/components/DisabledReasonModal';

interface StreakPanelBaseProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  accentBorder: string;
  color: PanelColor;
  image?: string;
  disabled?: boolean;
  disabledReason?: string | null;
  dict?: any;
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
  disabled,
  disabledReason,
  dict,
}) => {
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const hoverClasses = PANEL_HOVER_CLASSES[color];
  const body = (
    <>
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 -bottom-5 h-40 w-40 rounded-2xl object-cover opacity-[0.18] dark:opacity-[0.35] [mask-image:radial-gradient(circle_at_bottom_right,black,transparent_85%)]"
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
        {disabled ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {dict?.streaks?.disabled || 'Disabled'}
          </span>
        ) : comingSoon ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {dict?.streaks?.comingSoon || 'Coming soon.'}
          </span>
        ) : (
          <ArrowRight className={`h-4 w-4 ${accent} transition-transform group-hover:translate-x-1`} />
        )}
      </div>

      <h3 className={`relative mt-4 text-sm font-extrabold tracking-wide ${comingSoon || disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
        {title}
      </h3>
      <p className="relative mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
    </>
  );

  const base = `relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all shadow-sm ${accentBorder}`;

  if (disabled) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowDisabledModal(true)}
          className={`text-left cursor-pointer ${base} bg-slate-100/50 dark:bg-slate-900/30 opacity-70`}
        >
          {body}
        </button>
        <DisabledReasonModal
          isOpen={showDisabledModal}
          onClose={() => setShowDisabledModal(false)}
          label={title}
          reason={disabledReason}
        />
      </>
    );
  }

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
