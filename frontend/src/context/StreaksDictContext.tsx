// frontend/src/context/StreaksDictContext.tsx
'use client';

import React, { createContext, useContext } from 'react';

const StreaksDictContext = createContext<any>(null);

export const StreaksDictProvider: React.FC<{ dict: any; children: React.ReactNode }> = ({ dict, children }) => (
  <StreaksDictContext.Provider value={dict}>{children}</StreaksDictContext.Provider>
);

export function useStreaksDict(): any {
  return useContext(StreaksDictContext);
}
