// frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx
import { ChaosBoard } from '@/components/streaks/chaos/ChaosBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';

export default async function ChaosStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ChallengeModeGate mode="chaos" locale={locale} role="killer">
      <ChaosBoard locale={locale} />
    </ChallengeModeGate>
  );
}
