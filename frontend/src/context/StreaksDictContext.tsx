// frontend/src/context/StreaksDictContext.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React, { createContext, useContext } from 'react';

const StreaksDictContext = createContext<Dictionary | undefined>(undefined);

export const StreaksDictProvider: React.FC<{ dict: Dictionary; children: React.ReactNode }> = ({ dict, children }) => (
  <StreaksDictContext.Provider value={dict}>{children}</StreaksDictContext.Provider>
);

export function useStreaksDict(): Dictionary | undefined {
  return useContext(StreaksDictContext);
}
