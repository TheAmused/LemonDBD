'use client';
// frontend/src/components/sidebar/BuyCoffeeModal.tsx

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { BuyMeACoffeeIcon, HeartIcon, KofiIcon } from '@/components/icons/DbdIcons';

import { Modal } from '@/components/common/Modal';
import { SuccessState } from '@/components/common/SuccessState';
import { useDictionary } from "@/context/DictionaryContext";
import { useSiteConfig } from '@/context/SiteConfigContext';
import { RewardedAdSection } from '@/components/sidebar/RewardedAdSection';
import { SupportTile } from '@/components/sidebar/SupportTile';
import { trackEvent } from '@/utils/analytics';

export interface BuyCoffeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuyCoffeeModal: React.FC<BuyCoffeeModalProps> = ({ isOpen, onClose }) => {
  const dict = useDictionary();
  // An ad that ran to the end turns the dialog into a thank-you, like the bug report modal after a report.
  const [thanked, setThanked] = useState(false);

  const t = dict.sidebar;

  // The links and the message are admin settings (Settings > Links), so they change without a rebuild.
  // A link the admin cleared is not shown.
  const { links } = useSiteConfig();
  const donationMessage = links.donationMessage || t.coffeeDonationMessage;

  const supportGateways = [
    {
      provider: 'buy_me_a_coffee' as const,
      name: 'Buy Me a Coffee',
      url: links.donationBmc,
      tagline: t.coffeeBuyMeCoffeeTagline,
      icon: BuyMeACoffeeIcon,
    },
    {
      provider: 'ko_fi' as const,
      name: 'Ko-fi',
      url: links.donationKofi,
      tagline: t.coffeeKofiTagline,
      icon: KofiIcon,
    },
  ].flatMap(({ url, ...gateway }) => (url ? [{ ...gateway, url }] : []));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onAfterClose={() => setThanked(false)}
      variant="dialog"
      size={thanked ? 'sm' : 'lg'}
      title={thanked ? undefined : t.coffeeTitle}
      ariaLabel={thanked ? t.coffeeAdThanksTitle : t.coffeeTitle}
      closeButton={thanked ? 'floating' : 'header'}
      closeButtonAriaLabel={t.coffeeClose}
      padded
      bodyClassName="space-y-6"
    >
    {thanked ? (
      <SuccessState
        icon={HeartIcon}
        iconClassName="text-accent-red"
        title={t.coffeeAdThanksTitle}
        description={
          <>
            {t.coffeeAdThanksMessage}
            <br />
            {t.coffeeAdThanksNote}
          </>
        }
      />
    ) : (
      <>
      <p className="type-body text-text-secondary">{donationMessage}</p>

      <div className="space-y-3">
        {supportGateways.length === 0 && (
          <p className="type-body text-text-muted">{t.coffeeNoLinks}</p>
        )}
        {supportGateways.map((gateway) => (
          <SupportTile
            key={gateway.name}
            icon={gateway.icon}
            name={gateway.name}
            tagline={gateway.tagline}
            actionLabel={t.coffeeVisit}
            actionIcon={ExternalLink}
            href={gateway.url}
            onClick={() => trackEvent('coffee_link_click', { provider: gateway.provider })}
          />
        ))}
        <RewardedAdSection onRewarded={() => setThanked(true)} />
      </div>
      </>
    )}
    </Modal>
  );
};
