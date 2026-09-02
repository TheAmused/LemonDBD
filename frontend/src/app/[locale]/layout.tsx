// frontend/src/app/[locale]/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { UmamiScript } from '@/components/UmamiScript';
import { i18n, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { DictionaryProvider } from '@/context/DictionaryContext';
import { VaultStatsProvider } from '@/context/VaultStatsContext';
import { ImagePreloadProvider } from '@/components/ImagePreloadProvider';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    template: 'LemonDBD - %s',
    default: 'LemonDBD - Dead by Daylight Hub & Tools',
  },
  description: 'LemonDBD: Ultimate Dead by Daylight database, perk randomizer, map explorer, and player companion.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

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

  // Resolved on the server and handed to the client tree as a prop, so pages
  // render their real content on the first frame instead of spinning while a
  // client-side dynamic import of the locale bundle resolves.
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_INIT_SCRIPT }} />
      </head>
      <body>
        <UmamiScript />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DictionaryProvider dict={dict} locale={locale}>
              <VaultStatsProvider>
                <ImagePreloadProvider>{children}</ImagePreloadProvider>
              </VaultStatsProvider>
            </DictionaryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
