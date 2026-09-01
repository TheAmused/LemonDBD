// frontend/src/app/[locale]/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { UmamiScript } from '@/components/UmamiScript';
import { i18n, type Locale } from '@/i18n/config';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <UmamiScript />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ImagePreloadProvider>
              {children}
            </ImagePreloadProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}