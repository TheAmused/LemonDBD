// frontend/src/components/common/StickyActionBar.tsx
// The bar pinned to the bottom of a screen with its confirming actions ("Accept", "Continue", "Confirm
// build"), so they stay reachable while a long list scrolls. One look for every such bar: same bar, same
// button size and width. Render it outside any ancestor with a backdrop filter or transform, which would
// trap the fixed positioning, and keep bottom padding on the page so nothing hides behind it.
import React from 'react';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

export interface StickyActionBarProps {
  children: React.ReactNode;
  error?: string | null;
  /** Start after the app sidebar (default). Screens without a sidebar, like onboarding, turn it off. */
  sidebarAware?: boolean;
}

export function StickyActionBar({ children, error, sidebarAware = true }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'fixed right-0 bottom-0 z-30 border-t border-border-color bg-bg-surface/95 shadow-2xl backdrop-blur-md',
        sidebarAware ? 'left-[var(--sidebar-width,0rem)] transition-[left] duration-300' : 'left-0'
      )}
    >
      {error && (
        <p role="alert" className="px-5 pt-2 text-center type-strong-xs text-accent-red sm:px-7 lg:px-9">
          {error}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 px-5 py-2.5 sm:px-7 lg:px-9">{children}</div>
    </div>
  );
}

const BUTTON_VARIANT = { green: 'success', red: 'primary', gray: 'secondary' } as const;

export interface ActionBarButtonProps {
  /** green confirms, red is the main call to action, gray is the quiet alternative. */
  variant: keyof typeof BUTTON_VARIANT;
  onClick: () => void;
  disabled?: boolean;
  /** One main action on its own (onboarding "Continue"): wider than the usual pair of buttons. */
  wide?: boolean;
  children: React.ReactNode;
}

/** Labels are upper-cased here, so every bar reads the same whatever case the dictionary uses. */
export function ActionBarButton({ variant, onClick, disabled, wide = false, children }: ActionBarButtonProps) {
  return (
    <Button variant={BUTTON_VARIANT[variant]} size="md" onClick={onClick} disabled={disabled} className={cn('uppercase', wide ? 'w-full max-w-sm sm:max-w-md' : 'max-w-45 flex-1')}>
      {children}
    </Button>
  );
}
