// frontend/src/components/common/NsfwBadge.tsx
import { CautionVeilIcon } from '@/components/icons/DbdIcons';

/** The small red NSFW pill shown on tier list and minigame cards. */
export function NsfwBadge({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span
      data-testid="nsfw-badge"
      className={`inline-flex items-center gap-1 rounded-lg bg-accent-red px-2 py-0.5 text-tiny font-black uppercase tracking-wide text-text-inverted shadow-md ${className}`}
    >
      <CautionVeilIcon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
