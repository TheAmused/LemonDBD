// frontend/src/app/[locale]/welcome/loading.tsx
//
// Route-level loading UI while this segment's bundle and data resolve. The spinner label comes
// from the dictionary (DbdSpinner reads it itself), so nothing here is hardcoded English.
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { PageShellFallback } from '@/components/layout/PageShellFallback';

export default function WelcomeLoading() {
  return (
    <PageShellFallback
      mainClassName="flex items-center justify-center"
      skeleton={<DbdSpinner size="responsive" layout="inline" accent="blood" />}
    />
  );
}
