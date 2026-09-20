'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/sidebar/BuyCoffeeModal.tsx

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n, type Locale } from '@/i18n/config';
import {
  Heart,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { CampfireMugIcon } from '@/components/icons/DbdIcons';
import { AuricCellIcon } from '@/components/icons/DbdIcons';

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
  const [isRendered, setIsRendered] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isRendered && !isOpen) return null;

  const supportGateways = [
    {
      name: 'Buy Me a Coffee',
      url: buyMeCoffeeUrl,
      tagline: t.coffeeBuyMeCoffeeTagline || 'Quick 1-click coffee & support',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-white',
      icon: CampfireMugIcon,
    },
    {
      name: 'Ko-fi',
      url: kofiUrl,
      tagline: t.coffeeKofiTagline || '0% fee donations & one-time tips',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-white',
      icon: Heart,
    },
    {
      name: 'Patreon Community',
      url: patreonUrl,
      tagline: t.coffeePatreonTagline || 'Monthly supporter perks & early features',
      accentColor:
        'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10',
      buttonBg: 'bg-accent-red hover:bg-accent-red-hover text-white',
      icon: AuricCellIcon,
    },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-coffee-modal-title"
      >
        <div
          onClick={onClose}
          className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md transition-opacity duration-300"
        />

        <div className="fixed -top-20 -right-20 h-80 w-80 rounded-full bg-accent-red/10 blur-[90px] pointer-events-none" />
        <div className="fixed -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent-red/10 blur-[90px] pointer-events-none" />

        <div
          className="relative w-full max-w-lg my-8 rounded-3xl border border-border-color bg-bg-surface p-6 sm:p-8 text-text-primary backdrop-blur-2xl z-10 space-y-6 overflow-hidden"
          style={{
            animation: isOpen ? 'entityCoffeeSpawn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-80 pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            aria-label={t.coffeeClose || 'Close'}
            className="absolute right-4 top-4 rounded-xl p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3.5 border-b border-border-color pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-red/10 border border-accent-red/30 text-accent-red shadow-md">
              <CampfireMugIcon className="h-6 w-6" />
            </div>
            <div>
              <h2
                id="buy-coffee-modal-title"
                className="text-lg font-black tracking-wider font-mono text-text-primary flex items-center gap-2"
              >
                <span>{t.coffeeTitle || 'Support LemonDBD'}</span>
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-border-color bg-bg-elevated p-4 text-xs text-text-secondary leading-relaxed space-y-1">
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
                      <h3 className="text-xs font-black tracking-wide text-text-primary font-mono">
                        {gateway.name}
                      </h3>
                      <p className="text-[11px] text-text-muted">
                        {gateway.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md group-hover:scale-105 transition-all ${gateway.buttonBg}`}
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
        </div>
      </div>
    </>
  );
};