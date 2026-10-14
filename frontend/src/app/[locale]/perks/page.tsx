import { pageMetadata } from '@/i18n/metadata';
import { PerksClient } from '@/features/perks';

export const generateMetadata = pageMetadata('/perks', (d) => ({ title: d.app.perksVaultPageTitle }));

export default function PerksPage() {
  return <PerksClient />;
}
