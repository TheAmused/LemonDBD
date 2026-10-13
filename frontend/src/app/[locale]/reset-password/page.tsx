// frontend/src/app/[locale]/reset-password/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { ResetPasswordClient } from '@/components/auth/ResetPasswordClient';

export const generateMetadata = pageMetadata('/reset-password', (d) => ({ title: d.app.resetPasswordPageTitle }), { noindex: true });

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
