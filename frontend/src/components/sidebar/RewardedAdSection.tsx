'use client';
// frontend/src/components/sidebar/RewardedAdSection.tsx
// "Watch an ad to support us" in the support dialog. It shows only while an ad can really be played
// (no ad network wired in yet, an ad blocker, no ad to serve: nothing shows). An ad that ran to the end
// is reported to the dialog, which thanks the visitor.
import React, { useEffect, useRef, useState } from 'react';
import { ChevronIcon, ClapperboardIcon } from '@/components/icons/DbdIcons';
import { SupportTile } from '@/components/sidebar/SupportTile';
import { useDictionary } from '@/context/DictionaryContext';
import { trackEvent } from '@/utils/analytics';
import { getRewardedAdProvider, showRewardedAd } from '@/utils/rewardedAd';

export interface RewardedAdSectionProps {
  /** The ad ran to the end. */
  onRewarded: () => void;
}

export function RewardedAdSection({ onRewarded }: RewardedAdSectionProps) {
  const t = useDictionary().sidebar;
  const [provider] = useState(getRewardedAdProvider);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  // The dialog can be closed while the ad plays; a reward that arrives after that must not thank the next visit.
  const mounted = useRef(true);

  useEffect(() => provider?.watchReady(setReady), [provider]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (!provider || !ready) return null;

  const watch = () => {
    setPlaying(true);
    trackEvent('coffee_ad_start');
    void showRewardedAd(provider).then((result) => {
      trackEvent('coffee_ad_result', { result });
      if (!mounted.current) return;
      setPlaying(false);
      if (result === 'rewarded') onRewarded();
    });
  };

  return (
    <SupportTile
      actionTone="amber"
      icon={ClapperboardIcon}
      name={t.coffeeAdTitle}
      tagline={t.coffeeAdTagline}
      actionLabel={t.coffeeAdWatch}
      actionIcon={ChevronIcon}
      onClick={watch}
      disabled={playing}
    />
  );
}
