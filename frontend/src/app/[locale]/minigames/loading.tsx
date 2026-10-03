// frontend/src/app/[locale]/minigames/loading.tsx
//
// Route-level loading UI while this segment's bundle and data resolve. The spinner label comes
// from the dictionary (DbdSpinner reads it itself), so nothing here is hardcoded English.
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { PageShellFallback } from '@/components/layout/PageShellFallback';

export default function MinigamesLoading() {
  return (
    <PageShellFallback
      mainClassName="flex items-center justify-center"
      skeleton={<DbdSpinner size="responsive" layout="inline" accent="blood" />}
    />
  );
}
