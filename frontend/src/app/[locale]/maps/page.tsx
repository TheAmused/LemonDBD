// frontend/src/app/[locale]/maps/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { MapsClient } from '@/components/maps/MapsClient';

export const generateMetadata = pageMetadata('/maps', (d) => ({ title: d.maps.pageTitle }));

export default function MapsPage() {
  return <MapsClient />;
}
