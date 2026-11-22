// frontend/src/components/ThemeProvider.tsx
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

/** The removed "Light mode (Lemon)" theme: a browser that saved it moves to the plain light theme. */
function LegacyThemeMigration() {
  const { theme, setTheme } = useTheme();
  React.useEffect(() => {
    if (theme === 'light-lemon') setTheme('light');
  }, [theme, setTheme]);
  return null;
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <LegacyThemeMigration />
      {children}
    </NextThemesProvider>
  );
}
