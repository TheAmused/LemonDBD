import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Locale } from '@/i18n/config';
import { STREAK_ROLE_COOKIE } from '@/utils/streakDifficultyPrefs';

/** Sends the visitor to the role tab they used last, killer on a first visit. */
export default async function StreaksIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const savedRole = cookieStore.get(STREAK_ROLE_COOKIE)?.value;
  const role = savedRole === 'survivor' || savedRole === 'challenge' ? savedRole : 'killer';
  redirect(`/${locale}/streaks/${role}`);
}
