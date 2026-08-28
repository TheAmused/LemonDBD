'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/sidebar/BuyCoffeeModal.tsx

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n, type Locale } from '@/i18n/config';
import {
  Coffee,
  Heart,
  X,
  ExternalLink,
  Sparkles,
  Flame,
  Crown,
} from 'lucide-react';

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
        'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:border-amber-400 hover:bg-amber-500/20',
      buttonBg:
        'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950',
      icon: Coffee,
    },
    {
      name: 'Ko-fi',
      url: kofiUrl,
      tagline: t.coffeeKofiTagline || '0% fee donations & one-time tips',
      accentColor:
        'border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/20',
      buttonBg:
        'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white',
      icon: Heart,
    },
    {
      name: 'Patreon Community',
      url: patreonUrl,
      tagline: t.coffeePatreonTagline || 'Monthly supporter perks & early features',
      accentColor:
        'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:border-rose-400 hover:bg-rose-500/20',
      buttonBg:
        'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white',
      icon: Crown,
    },
  ];

  return (
    <>
      <style jsx global>{`
        @keyframes entityCoffeeSpawn {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(20px);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }
        @keyframes entityAuraAmber {
          0%,
          100% {
            box-shadow: 0 0 25px 1px rgba(234, 179, 8, 0.2),
              inset 0 0 15px rgba(220, 38, 38, 0.1);
          }
          50% {
            box-shadow: 0 0 45px 5px rgba(234, 179, 8, 0.4),
              inset 0 0 25px rgba(220, 38, 38, 0.2);
          }
        }
      `}</style>

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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        />

        <div className="fixed -top-20 -right-20 h-80 w-80 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />
        <div className="fixed -bottom-20 -left-20 h-80 w-80 rounded-full bg-red-600/10 blur-[90px] pointer-events-none" />

        <div
          className="relative w-full max-w-lg my-8 rounded-3xl border border-amber-500/40 bg-slate-950/95 p-6 sm:p-8 text-slate-100 backdrop-blur-2xl z-10 space-y-6 overflow-hidden"
          style={{
            animation: isOpen
              ? 'entityCoffeeSpawn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards, entityAuraAmber 4s ease-in-out infinite'
              : 'none',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80 pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            aria-label={t.coffeeClose || 'Close'}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-md shadow-amber-950/40">
              <Coffee className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            </div>
            <div>
              <h2
                id="buy-coffee-modal-title"
                className="text-lg font-black tracking-wider font-mono text-slate-100 flex items-center gap-2"
              >
                <span>{t.coffeeTitle || 'Support LemonDBD'}</span>
                <Flame className="h-4 w-4 text-amber-500" />
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 text-xs text-slate-300 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 shadow-sm group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black tracking-wide text-slate-100 font-mono">
                        {gateway.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
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
                    <ExternalLink className="sm:hidden h-4 w-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                </a>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{t.coffeeFooterNotice || 'Free forever & community powered'}</span>
            <button
              type="button"
              onClick={onClose}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              {t.coffeeClose || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};