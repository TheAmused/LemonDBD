'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ItemsAddonsViewer } from '@/components/ItemsAddonsViewer';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';

export default function ItemsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
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
      <main className="flex-1 lg:pl-64 p-4 md:p-8 lg:p-10 w-full overflow-y-auto transition-all">
        <ItemsAddonsViewer />
      </main>
    </div>
  );
}
