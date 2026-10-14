import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Locale } from '@/i18n/config';

/** Sends the visitor to the role tab they used last, killer on a first visit. */
export default async function StreaksIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const savedRole = cookieStore.get('lemon_dbd_streaks_last_role')?.value;
  const role = savedRole === 'survivor' || savedRole === 'challenge' ? savedRole : 'killer';
  redirect(`/${locale}/streaks/${role}`);
}
