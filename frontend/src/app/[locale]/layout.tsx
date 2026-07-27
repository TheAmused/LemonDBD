import React from 'react';
import { i18n, type Locale } from '@/i18n/config';
import { ThemeProvider } from '@/components/ThemeProvider';
import '@/app/globals.css';

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}