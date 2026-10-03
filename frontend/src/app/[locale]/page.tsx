// frontend/src/app/[locale]/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import HomePage from '@/components/landing/HomePage';

export const generateMetadata = pageMetadata('', (d) => ({ title: d.app.homePageTitle, description: d.app.siteDescription }));

export default function Page() {
  return <HomePage />;
}
