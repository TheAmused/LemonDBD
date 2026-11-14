'use client';
// frontend/src/components/admin/AdminEntryPage.tsx
//
// The admin sign-in. The proxy serves it in place of /admin to anyone who is not a signed-in admin, also
// while maintenance mode is on (the public sign-in is not reachable then). It is a bare page with the
// sign-in dialog: only an admin account is let through (the server refuses any other), and a completed
// sign-in goes on to the admin panel. Closing the dialog leaves for the home page.
import React from 'react';
import { AuthModal } from '@/components/AuthModal';
import { useShellOverride } from '@/components/layout/AppShell';
import { useLocale } from '@/context/DictionaryContext';

export function AdminEntryPage() {
  const locale = useLocale();
  useShellOverride(false);

  // A full navigation, so the proxy sees the new session cookie.
  return (
    <AuthModal
      isOpen
      adminOnly
      onClose={() => window.location.assign(`/${locale}`)}
      onSignedIn={() => window.location.assign(`/${locale}/admin`)}
    />
  );
}
