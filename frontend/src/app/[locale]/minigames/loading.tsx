// frontend/src/app/[locale]/minigames/loading.tsx
//
// Route-level loading UI while this segment's bundle and data resolve. The spinner label comes
// from the dictionary (DbdSpinner reads it itself), so nothing here is hardcoded English.
// Content only: the sidebar and <main> come from AppShell and stay mounted.
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { RouteLoading } from '@/components/layout/RouteLoading';

export default function MinigamesLoading() {
  return (
    <RouteLoading>
      <DbdSpinner size="responsive" layout="inline" accent="blood" />
    </RouteLoading>
  );
}
