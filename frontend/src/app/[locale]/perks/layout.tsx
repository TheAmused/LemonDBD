// frontend/src/app/[locale]/perks/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/perks', (d) => ({ title: d.app.perksVaultPageTitle }));

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
