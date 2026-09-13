import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/StreakPanel.tsx
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trophy } from 'lucide-react';
import { PANEL_HOVER_CLASSES, type PanelColor } from './panelColors';

const DisabledReasonModal = dynamic(
  () => import('@/components/DisabledReasonModal').then((m) => m.DisabledReasonModal),
  { ssr: false }
);

interface StreakPanelBaseProps {
  title: string;
  accentBorder: string;
  color: PanelColor;
  image?: string;
  disabled?: boolean;
  disabledReason?: string | null;
  /** Shows a trophy badge -- this challenge has already been fully cleared. */
  completed?: boolean;
  /** Killer count frozen at that completion, shown next to the gold badge. */
  completedCount?: number | null;
  /** Upgrades the badge to red -- cleared with the entire game roster. */
  completedFull?: boolean;
  /** Killer count frozen at that full-roster completion, shown next to the badge. */
  completedFullCount?: number | null;
  dict?: Dictionary;
  /**
   * Routes this panel may navigate to. Panels that pick their destination at
   * click time (from a saved difficulty/mode) render as a <button>, so Next
   * cannot prefetch them the way it does the <Link> variant. Naming the
   * candidates here lets the panel warm them on hover instead of paying for a
   * cold route chunk behind the loading spinner after the click.
   */
  prefetchHrefs?: string[];
}

type StreakPanelProps = StreakPanelBaseProps &
  ({ comingSoon: true; href?: never; onClick?: never } |
   { comingSoon?: false; href: string; onClick?: never } |
   { comingSoon?: false; href?: never; onClick: () => void });

export const StreakPanel: React.FC<StreakPanelProps> = ({
  title,
  accentBorder,
  color,
  image,
  href,
  onClick,
  comingSoon,
  disabled,
  disabledReason,
  completed,
  completedCount,
  completedFull,
  completedFullCount,
  dict,
  prefetchHrefs,
}) => {
  const router = useRouter();
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const hoverClasses = PANEL_HOVER_CLASSES[color];
  const watermark = image?.replace(/\.jpg$/, '-watermark.png');
  const body = (
    <>
      {image && (
        <>
          <div
            aria-hidden="true"
            className="dark:hidden pointer-events-none absolute -right-6 -bottom-6 h-44 w-44 rounded-full bg-black/90 blur-xl"
          />
          <img
            src={watermark}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute -right-5 -bottom-5 h-40 w-40 object-cover opacity-100 dark:opacity-70 dark:[mask-image:radial-gradient(circle_at_bottom_right,black,transparent_85%)]"
          />
        </>
      )}

      {disabled ? (
        <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          {dict?.streaks?.disabled || 'Disabled'}
        </span>
      ) : comingSoon ? (
        <span className="absolute right-3 top-3 z-10 rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {dict?.streaks?.comingSoon || 'Coming soon.'}
        </span>
      ) : completed && completedFull ? (
        <span
          className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-red-500/50 bg-red-100 dark:bg-red-950/70 px-2 py-1 text-red-600 dark:text-red-400 shadow-sm"
          aria-label={dict?.streaks?.completedFullRoster || 'Completed with the entire roster'}
          title={dict?.streaks?.completedFullRoster || 'Completed with the entire roster'}
        >
          <Trophy className="h-3.5 w-3.5" />
          {completedFullCount != null && (
            <span className="text-xs font-black leading-none">{completedFullCount}</span>
          )}
        </span>
      ) : completed ? (
        <span
          className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-100 dark:bg-yellow-950/60 px-2 py-1 text-yellow-600 dark:text-yellow-400 shadow-sm"
          aria-label={dict?.streaks?.completed || 'Completed'}
          title={dict?.streaks?.completed || 'Completed'}
        >
          <Trophy className="h-3.5 w-3.5" />
          {completedCount != null && (
            <span className="text-xs font-black leading-none">{completedCount}</span>
          )}
        </span>
      ) : null}

      <div className="relative flex flex-1 items-center pr-24 sm:pr-28">
        <h3 className={`text-lg sm:text-xl font-extrabold tracking-wide ${comingSoon || disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
          {title}
        </h3>
      </div>
    </>
  );

  const base = `relative flex h-full min-h-[120px] touch-manipulation flex-col overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all shadow-sm ${accentBorder}`;

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
    const warm = () => prefetchHrefs?.forEach((h) => router.prefetch(h));
    return (
      <button
        onClick={onClick}
        onMouseEnter={warm}
        onFocus={warm}
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
