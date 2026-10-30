import { MatureIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/common/NsfwBadge.tsx

/** The small red NSFW pill shown on tier list and minigame cards. */
export function NsfwBadge({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span
      data-testid="nsfw-badge"
      className={`inline-flex items-center gap-1 rounded-chip bg-accent-red px-2 py-0.5 text-tiny font-black uppercase tracking-wide text-text-inverted shadow-md ${className}`}
    >
      <MatureIcon className="icon-sm" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
