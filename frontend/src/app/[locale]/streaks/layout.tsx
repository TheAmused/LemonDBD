// frontend/src/app/[locale]/streaks/layout.tsx
import { pageMetadata } from '@/i18n/metadata';
import { StreaksLayoutShell } from '@/components/streaks/StreaksLayoutShell';

export const generateMetadata = pageMetadata('/streaks', (d) => ({ title: d.app.streaksPageTitle }));

export default function StreaksLayout({ children }: { children: React.ReactNode }) {
  return <StreaksLayoutShell>{children}</StreaksLayoutShell>;
}
