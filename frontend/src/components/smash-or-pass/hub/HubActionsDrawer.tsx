'use client';
// frontend/src/components/smash-or-pass/hub/HubActionsDrawer.tsx
import { useEffect, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/common/Button';

export interface HubDrawerAction {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  onClick: () => void;
  variant: 'soft' | 'secondary';
}

interface HubActionsDrawerProps {
  isOpen: boolean;
  actions: HubDrawerAction[];
  onClose: () => void;
}

/** Slide-out actions drawer under the command dock, matching HubFilterDrawer. */
export function HubActionsDrawer({ isOpen, actions, onClose }: HubActionsDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="smash-actions-drawer"
          initial={{ opacity: 0, y: -6, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.99 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-0 right-0 mx-auto w-full md:w-fit md:max-w-full mt-2 z-40 p-2.5 sm:p-3 rounded-card bg-bg-surface/95 border border-border-color backdrop-blur-2xl shadow-2xl"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {actions.map(({ key, label, Icon, onClick, variant }) => (
              <Button
                key={key}
                type="button"
                variant={variant}
                size="sm"
                onClick={onClick}
                className="w-full justify-start gap-2 px-3 py-2.5 text-left"
              >
                <Icon className="icon-md shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
