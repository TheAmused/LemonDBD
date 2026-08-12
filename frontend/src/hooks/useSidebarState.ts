'use client';

import { useState, useEffect } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'lemon_dbd_sidebar_collapsed';

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {
      console.error('Failed to read sidebar collapsed state:', e);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (e) {
        console.error('Failed to save sidebar state:', e);
      }
      // Dispatch custom event for instant cross-component updates
      window.dispatchEvent(new Event('sidebar-state-changed'));
      return next;
    });
  };

  useEffect(() => {
    const handleCustomEvent = () => {
      try {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        setIsCollapsed(saved === 'true');
      } catch (e) {}
    };
    window.addEventListener('sidebar-state-changed', handleCustomEvent);
    return () => window.removeEventListener('sidebar-state-changed', handleCustomEvent);
  }, []);

  return { isCollapsed, toggleSidebar };
}
