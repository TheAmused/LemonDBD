// frontend/src/app/[locale]/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { UmamiScript } from '@/components/UmamiScript';
import { i18n, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveLocale, siteJsonLd, siteUrl } from '@/i18n/metadata';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { LocaleDictionaryProvider } from '@/context/LocaleDictionaryProvider';
import { ImagePreloadProvider } from '@/components/common/ImagePreloadProvider';
import { TooltipProvider } from '@/components/common/Tooltip';
import { FormValidationProvider } from '@/components/common/FormValidation';
import { ContentRevocationSync } from '@/components/common/ContentRevocationSync';
import { WarningModal } from '@/components/moderation/WarningModal';
import { AppBackground } from '@/components/layout/AppBackground';
import { SiteBannerGate } from '@/components/layout/SiteBannerGate';
import { SiteConfigProvider } from '@/context/SiteConfigContext';
import { Playfair_Display } from 'next/font/google';
import '@/app/globals.css';

// Self-hosted at build time by next/font (no request to Google from visitors' browsers).
const playfair = Playfair_Display({ subsets: ['latin', 'latin-ext'], variable: '--font-playfair', display: 'swap' });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const dict = await getDictionary(locale);
  const base = siteUrl();
  return {
    ...(base ? { metadataBase: base } : {}),
    title: {
      template: 'LemonDBD - %s',
      default: dict.app.homePageTitle,
    },
    description: dict.app.siteDescription,
    icons: {
      icon: '/icon.png',
      shortcut: '/icon.png',
      apple: '/icon.png',
    },
  };
}

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

/**
 * Restores the sidebar's collapsed state before the first paint.
 *
 * `useSidebarState` reads localStorage in an effect, which cannot run until
 * after the first render -- so a user with a collapsed sidebar saw the expanded
 * layout paint first and then animate 208px sideways on *every* navigation.
 * Setting the attribute here, in a blocking script, means frame one is already
 * correct. `<html>` carries `suppressHydrationWarning` for exactly this.
 */
const SIDEBAR_INIT_SCRIPT = `try{if(localStorage.getItem('lemon_dbd_sidebar_collapsed')==='true'){document.documentElement.setAttribute('data-sidebar','collapsed')}}catch(e){}`;

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = (
    i18n.locales.includes(rawLocale as Locale) ? rawLocale : i18n.defaultLocale
  ) as Locale;

  const dict = await getDictionary(locale);

  return (
    <html lang={locale} className={playfair.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_INIT_SCRIPT }} />
        {/* schema.org WebSite + Organization for search engines; built from the dictionary, `<` escaped. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd(locale, dict) }} />
      </head>
      <body>
        <UmamiScript />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          themes={['light', 'dark', 'light-lemon']}
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SiteConfigProvider>
              <LocaleDictionaryProvider locale={locale}>
                <ImagePreloadProvider>
                  <AppBackground />
                  <SiteBannerGate />
                  {children}
                </ImagePreloadProvider>
                <TooltipProvider />
                <FormValidationProvider />
                <ContentRevocationSync />
                <WarningModal />
              </LocaleDictionaryProvider>
            </SiteConfigProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
