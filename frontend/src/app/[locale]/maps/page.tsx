import { pageMetadata } from '@/i18n/metadata';
import { MapsClient } from '@/features/maps';

export const generateMetadata = pageMetadata('/maps', (d) => ({ title: d.maps.pageTitle }));

export default function MapsPage() {
  return <MapsClient />;
}
