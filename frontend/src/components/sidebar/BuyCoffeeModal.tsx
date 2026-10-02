'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/sidebar/BuyCoffeeModal.tsx

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n, type Locale } from '@/i18n/config';
import {
  Heart,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { CampfireMugIcon } from '@/components/icons/DbdIcons';
import { AuricCellIcon } from '@/components/icons/DbdIcons';
import { Modal } from '@/components/common/Modal';

export interface BuyCoffeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
  t?: Record<string, string>;
}

export const BuyCoffeeModal: React.FC<BuyCoffeeModalProps> = ({
  isOpen,
  onClose,
  dict: propDict,
  t: propT,
}) => {
  const params = useParams();
  const pathname = usePathname() || '';

  const routeLocale = (params?.locale as string) || pathname.split('/')[1];
  const currentLocale = (
    i18n.locales.includes(routeLocale as Locale) ? routeLocale : i18n.defaultLocale
  ) as Locale;

  const [loadedDict, setLoadedDict] = useState<any>(null);

  useEffect(() => {
    if (!propDict && !propT) {
      getDictionary(currentLocale).then(setLoadedDict);
    }
  }, [currentLocale, propDict, propT]);

  const t: Record<string, string> =
    propT || propDict?.sidebar || loadedDict?.sidebar || {};

  const buyMeCoffeeUrl =
    process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL ||
    'https://buymeacoffee.com/lemondbd';
  const kofiUrl =
    process.env.NEXT_PUBLIC_KOFI_URL || 'https://ko-fi.com/lemondbd';
  const patreonUrl =
    process.env.NEXT_PUBLIC_PATREON_URL || 'https://patreon.com/lemondbd';
  const donationMessage =
    process.env.NEXT_PUBLIC_DONATION_MESSAGE ||
    t.coffeeDonationMessage ||
    'Fuel the Entity with caffeine to keep LemonDBD database servers and live scrapers running 24/7!';

  const supportGateways = [
    {
      name: 'Buy Me a Coffee',
      url: buyMeCoffeeUrl,
      tagline: t.coffeeBuyMeCoffeeTagline || 'Quick 1-click coffee & support',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-text-inverted',
      icon: CampfireMugIcon,
    },
    {
      name: 'Ko-fi',
      url: kofiUrl,
      tagline: t.coffeeKofiTagline || '0% fee donations & one-time tips',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-text-inverted',
      icon: Heart,
    },
    {
      name: 'Patreon Community',
      url: patreonUrl,
      tagline: t.coffeePatreonTagline || 'Monthly supporter perks & early features',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-text-inverted',
      icon: AuricCellIcon,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="lg"
      icon={<CampfireMugIcon className="h-6 w-6" />}
      title={t.coffeeTitle || 'Support LemonDBD'}
      closeButtonAriaLabel={t.coffeeClose || 'Close'}
      padded
      bodyClassName="space-y-6"
    >
    <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 type-body text-text-secondary space-y-1">
      <div className="flex items-center gap-1.5 font-bold text-accent-red mb-1">
        <Sparkles className="h-4 w-4" />
        <span>{t.coffeeFuelNotice || 'Entity Fuel Notice'}</span>
      </div>
      <p>{donationMessage}</p>
    </div>

    <div className="space-y-3">
      {supportGateways.map((gateway) => {
        const Icon = gateway.icon;
        return (
          <a
            key={gateway.name}
            href={gateway.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${gateway.accentColor}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-elevated border border-border-color shadow-sm group-hover:scale-105 transition-transform">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wide text-text-primary">
                  {gateway.name}
                </h3>
                <p className="type-caption text-text-muted">
                  {gateway.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-mini font-black uppercase tracking-wider shadow-md group-hover:scale-105 transition-all ${gateway.buttonBg}`}
              >
                <span>{t.coffeeVisit || 'Visit'}</span>
                <ExternalLink className="h-3 w-3" />
              </span>
              <ExternalLink className="sm:hidden h-4 w-4 text-text-muted group-hover:text-accent-red transition-colors" />
            </div>
          </a>
        );
      })}
    </div>
    </Modal>
  );
};
