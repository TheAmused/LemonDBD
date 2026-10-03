// frontend/src/app/[locale]/smash-or-pass/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/smash-or-pass', (d) => ({ title: d.app.smashOrPassPageTitle, description: d.smashOrPass.subtitle }));

export default function SmashOrPassLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
