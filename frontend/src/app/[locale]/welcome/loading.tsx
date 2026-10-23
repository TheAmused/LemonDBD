// frontend/src/app/[locale]/welcome/loading.tsx
//
// Route-level loading UI while this segment's bundle and data resolve. The spinner label comes
// from the dictionary (DbdSpinner reads it itself), so nothing here is hardcoded English.
// /welcome has no shell (shellRoutes.ts), so this centres in the whole viewport.
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { RouteLoading } from '@/components/layout/RouteLoading';

export default function WelcomeLoading() {
  return (
    <RouteLoading fullScreen>
      <DbdSpinner size="responsive" layout="inline" accent="blood" />
    </RouteLoading>
  );
}
