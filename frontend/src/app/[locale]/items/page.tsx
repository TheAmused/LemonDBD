'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ItemsAddonsViewer } from '@/components/ItemsAddonsViewer';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';

export default function ItemsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();
  const [dict, setDict] = useState<any>(null);
  const [category, setCategory] = useState<string>('items');

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  if (!dict) return null;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      <Sidebar
        dict={dict}
        activeCategory={category}
        onSelectCategory={setCategory}
        currentLocale={locale}
      />
      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-5 sm:p-7 lg:p-9 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <ItemsAddonsViewer />
      </main>
    </div>
  );
}
