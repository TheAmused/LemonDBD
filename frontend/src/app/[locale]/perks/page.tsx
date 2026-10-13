// frontend/src/app/[locale]/perks/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { PerksClient } from '@/components/perks/PerksClient';

export const generateMetadata = pageMetadata('/perks', (d) => ({ title: d.app.perksVaultPageTitle }));

export default function PerksPage() {
  return <PerksClient />;
}
