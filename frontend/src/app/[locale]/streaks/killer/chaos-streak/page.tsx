// frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx
import { ChaosBoard } from '@/components/streaks/chaos/ChaosBoard';
import { ChallengeModeGate } from '@/components/streaks/ChallengeModeGate';
import { pageMetadata } from '@/i18n/metadata';

// Its own canonical URL (the streaks layout's would point every challenge at /streaks).
export const generateMetadata = pageMetadata('/streaks/killer/chaos-streak', (d) => ({ title: d.app.streaksPageTitle }));

export default function ChaosStreakPage() {
  return (
    <ChallengeModeGate mode="chaos">
      <ChaosBoard />
    </ChallengeModeGate>
  );
}
