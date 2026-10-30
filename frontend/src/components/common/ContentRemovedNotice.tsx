'use client';
// frontend/src/components/common/ContentRemovedNotice.tsx
import { ShieldAlert, X } from 'lucide-react';
import { Surface } from '@/components/common/Surface';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';

/** Tells the person that saved content of theirs was deleted because moderators banned it. */
export function ContentRemovedNotice({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  const t = useDictionary().moderation.contentRemoved;
  const locale = useLocale();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 lemon-modal-overlay-sidebar-aware">
      <Surface
        padding="none"
        as="output"
        aria-live="polite"
        className="pointer-events-auto flex max-w-xl items-start gap-3 border-accent-amber/40 px-4 py-3 shadow-lg"
      >
        <ShieldAlert className="mt-0.5 icon-lg shrink-0 text-accent-amber" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="type-card-title text-text-primary">{t.title}</p>
          <p className="mt-1 text-sm text-text-secondary">{formatMessage(t.body, { count }, locale)}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.dismiss}
          className="shrink-0 rounded-control p-1 text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
        >
          <X className="icon-md" aria-hidden="true" />
        </button>
      </Surface>
    </div>
  );
}
