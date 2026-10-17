'use client';
// frontend/src/components/sidebar/BuyCoffeeModal.tsx

import React from 'react';
import {
  Heart,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { CampfireMugIcon } from '@/components/icons/DbdIcons';
import { AuricCellIcon } from '@/components/icons/DbdIcons';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from "@/context/DictionaryContext";
import { useSiteConfig } from '@/context/SiteConfigContext';
import { Surface } from '@/components/common/Surface';

export interface BuyCoffeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuyCoffeeModal: React.FC<BuyCoffeeModalProps> = ({ isOpen, onClose }) => {
  const dict = useDictionary();

  const t: Record<string, string> = dict.sidebar;

  // The links and the message are admin settings (Settings > Links), so they change without a rebuild.
  // A link the admin cleared is not shown.
  const { links } = useSiteConfig();
  const donationMessage =
    links.donationMessage ||
    t.coffeeDonationMessage ||
    'Fuel the Entity with caffeine to keep LemonDBD database servers and live scrapers running 24/7!';

  const supportGateways = [
    {
      name: 'Buy Me a Coffee',
      url: links.donationBmc,
      tagline: t.coffeeBuyMeCoffeeTagline || 'Quick 1-click coffee & support',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-text-inverted',
      icon: CampfireMugIcon,
    },
    {
      name: 'Ko-fi',
      url: links.donationKofi,
      tagline: t.coffeeKofiTagline || '0% fee donations & one-time tips',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-text-inverted',
      icon: Heart,
    },
    {
      name: 'Patreon Community',
      url: links.donationPatreon,
      tagline: t.coffeePatreonTagline || 'Monthly supporter perks & early features',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-text-inverted',
      icon: AuricCellIcon,
    },
  ].flatMap(({ url, ...gateway }) => (url ? [{ ...gateway, url }] : []));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="lg"
      title={t.coffeeTitle || 'Support LemonDBD'}
      closeButtonAriaLabel={t.coffeeClose || 'Close'}
      padded
      bodyClassName="space-y-6"
    >
    <Surface tone="elevated" padding="none" className="p-4 type-body text-text-secondary space-y-1">
      <div className="flex items-center gap-1.5 font-bold text-accent-red mb-1">
        <Sparkles className="h-4 w-4" />
        <span>{t.coffeeFuelNotice || 'Entity Fuel Notice'}</span>
      </div>
      <p>{donationMessage}</p>
    </Surface>

    <div className="space-y-3">
      {supportGateways.length === 0 && (
        <p className="type-body text-text-muted">{t.coffeeNoLinks}</p>
      )}
      {supportGateways.map((gateway) => {
        const Icon = gateway.icon;
        return (
          <a
            key={gateway.name}
            href={gateway.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center justify-between p-3.5 rounded-control border transition-all duration-200 cursor-pointer ${gateway.accentColor}`}
          >
            <div className="flex items-center gap-3">
              <Surface tone="elevated" padding="none" className="flex h-10 w-10 shrink-0 items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Icon className="h-5 w-5" />
              </Surface>
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
                className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-control text-mini font-black uppercase tracking-wider shadow-md group-hover:scale-105 transition-all ${gateway.buttonBg}`}
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
